// Lightweight wrapper for @vladmandic/face-api model loading and recognition
// This module uses dynamic imports so the main bundle doesn't always include heavy TF libs.

let modelsLoaded = false;
let faceapi = null;

async function injectCdnScript(url) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

export async function loadFaceApiModels(root = '/models') {
  if (modelsLoaded) return true;
  if (typeof window === 'undefined') throw new Error('face-api must be loaded in browser');
  // Prefer the CDN UMD build so bundlers don't statically include the ESM package
  // This avoids the typical "require used in a way" warnings and wasm artifact requests.
  const cdn = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js';
  try {
    await injectCdnScript(cdn);
    faceapi = window.faceapi || window.faceApi || null;
  } catch (cdnErr) {
    // If CDN fails and the app explicitly opts into local package usage, try dynamic import
    const allowLocal = typeof window !== 'undefined' && window.__USE_LOCAL_FACEAPI;
    if (allowLocal) {
      try {
        // eslint-disable-next-line no-undef
        const mod = await import('@vladmandic/face-api');
        faceapi = mod.default || mod;
      } catch (err) {
        throw new Error('Failed to load face-api from CDN and local import failed');
      }
    } else {
      throw new Error('Failed to load face-api from CDN and local import disabled');
    }
  }

  // set backend (prefer webgl if available)
  try {
    if (faceapi.tf && faceapi.tf.setBackend) {
      await faceapi.tf.setBackend('webgl');
      await faceapi.tf.ready();
    }
  } catch (e) {
    // ignore failures; TF will choose a backend
    console.warn('face-api: tf backend set failed', e);
  }

  // load models from public/models
  await faceapi.nets.ssdMobilenetv1.loadFromUri(root);
  await faceapi.nets.faceLandmark68Net.loadFromUri(root);
  await faceapi.nets.faceRecognitionNet.loadFromUri(root);
  modelsLoaded = true;
  return true;
}

// Accepts an HTMLImageElement / HTMLVideoElement / HTMLCanvasElement or ImageData
// and returns array of detections: { box, descriptor }
export async function detectFacesWithDescriptors(inputEl) {
  if (!modelsLoaded) await loadFaceApiModels();
  const detections = await faceapi.detectAllFaces(inputEl).withFaceLandmarks().withFaceDescriptors();
  return detections.map((d) => ({ box: d.detection.box, descriptor: d.descriptor }));
}

// Build averaged descriptors for a family list: [{ id, name, trainingImages: [url,...] }]
export async function buildKnownDescriptors(familyList = []) {
  if (!modelsLoaded) await loadFaceApiModels();
  const known = [];
  for (const member of familyList) {
    const imgs = Array.isArray(member.trainingImages) ? member.trainingImages : [];
    if (imgs.length === 0) continue;
    const descriptors = [];
    for (const src of imgs) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });
        const dets = await detectFacesWithDescriptors(img);
        if (dets && dets[0] && dets[0].descriptor) descriptors.push(dets[0].descriptor);
      } catch (e) {
        // skip single image errors
        console.warn('face-api: training image failed', src, e);
      }
      // yield to the event loop between images to avoid janking the UI
      // small pause keeps the main thread responsive while building descriptors
      await new Promise((r) => setTimeout(r, 8));
    }
    if (descriptors.length === 0) continue;
    const len = descriptors[0].length;
    const mean = new Array(len).fill(0);
    for (const d of descriptors) for (let i = 0; i < len; i++) mean[i] += d[i];
    for (let i = 0; i < len; i++) mean[i] = mean[i] / descriptors.length;
    known.push({ id: member.id, name: member.name, descriptor: mean, trainingImage: imgs[0] });
    // yield between members as well
    await new Promise((r) => setTimeout(r, 8));
  }
  return known;
}

// Compare a descriptor to a list of known descriptors; returns best match or null
export function findBestMatch(descriptor, knownList, threshold = 0.6) {
  if (!descriptor || !knownList || knownList.length === 0) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const k of knownList) {
    if (!k.descriptor) continue;
    // Euclidean distance
    let sum = 0;
    for (let i = 0; i < descriptor.length; i++) {
      const d = descriptor[i] - k.descriptor[i];
      sum += d * d;
    }
    const dist = Math.sqrt(sum);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = k;
    }
  }
  if (bestDistance <= threshold) return { match: best, distance: bestDistance };
  return null;
}
