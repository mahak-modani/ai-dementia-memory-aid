"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export default function VoiceConsole({
  onResponse,
  captureFrame,
  captureFaces,
  onUserSpeech,
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const metricsRef = useRef({ rms: 0, zcr: 0, updatedAt: 0 });
  const isSpeakingRef = useRef(false);
  const lastSpokenRef = useRef("");

  async function speak(text) {
    try {
      if (!text) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      try {
        recognitionRef.current?.stop();
      } catch {}
      isSpeakingRef.current = true;
      lastSpokenRef.current = String(text)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .trim();
      utter.onend = () => {
        isSpeakingRef.current = false;
        // slight delay to avoid capturing tail of TTS
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {}
        }, 300);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  function estimateEmotionFromSignal() {
    const { rms, zcr } = metricsRef.current;
    // Heuristic tuned for better separation:
    // - angry: very loud and high zero-crossing (rms >= 0.28 && zcr >= 0.18)
    // - stressed: loud and choppy (rms >= 0.18 && zcr >= 0.12)
    // - sad: very quiet (rms <= 0.04)
    // - neutral: otherwise
    if (rms >= 0.28 && zcr >= 0.18) {
      const confidence = Math.min(1, (rms - 0.28) * 2 + (zcr - 0.18) * 2);
      return {
        voiceEmotion: "angry",
        emotionConfidence: Number(confidence.toFixed(2)),
      };
    }
    if (rms >= 0.18 && zcr >= 0.12) {
      const confidence = Math.min(1, (rms - 0.18) * 1.8 + (zcr - 0.12) * 1.8);
      return {
        voiceEmotion: "stressed",
        emotionConfidence: Number(confidence.toFixed(2)),
      };
    }
    // require very low RMS and low zero-crossing to be considered 'sad'
    if (rms <= 0.03 && zcr <= 0.05) {
      const confidence = Math.min(1, (0.03 - rms) * 6 + (0.05 - zcr) * 2);
      return {
        voiceEmotion: "sad",
        emotionConfidence: Number(Math.max(0.0, Number(confidence.toFixed(2)))),
      };
    }
    return { voiceEmotion: "neutral", emotionConfidence: 0.45 };
  }

  const handleTranscript = async (text) => {
    if (!text) return;
    try {
      // estimate local emotion and log the transcript immediately
      try {
        const { voiceEmotion, emotionConfidence } = estimateEmotionFromSignal();
        await api.logActivity({
          icon: "💬",
          title: `User said: "${text}"`,
          description: `LocalEmotion: ${voiceEmotion} (${emotionConfidence})`,
          type: "Voice Interaction",
        });
      } catch (e) {}

      // notify parent immediately that user spoke (so it can cancel follow-up prompts)
      try {
        console.debug("VoiceConsole received transcript:", text);
        const handled = await (typeof onUserSpeech === "function"
          ? onUserSpeech(text)
          : false);
        console.debug("onUserSpeech returned:", handled);
        // if parent handled the speech (e.g., immediate confirmation), stop here
        if (handled) return;
      } catch {}
      const lower = text.toLowerCase();
      const wantsMulti =
        /(who (are|is) (these|they|everyone|all)|who is here|identify everyone)/i.test(
          lower
        );
      let imageData, faces;
      if (captureFaces && wantsMulti) {
        faces = await captureFaces();
      } else if (
        captureFrame &&
        /who is this|who is that|who am i with/i.test(lower)
      ) {
        imageData = await captureFrame();
      }
      const { voiceEmotion, emotionConfidence } = estimateEmotionFromSignal();
      const res = faces
        ? await api.voicePipelineWithFaces(text, faces, {
            voiceEmotion,
            emotionConfidence,
          })
        : await api.voicePipeline(text, imageData, {
            voiceEmotion,
            emotionConfidence,
          });
      setLast(res);
      // let parent handle the response; if it returns truthy we should skip
      // speaking the server response here to avoid duplicate or late follow-ups
      let parentHandled = false;
      try {
        parentHandled = Boolean(await (onResponse ? onResponse(res) : false));
      } catch (e) {
        parentHandled = false;
      }
      if (!parentHandled) {
        await speak(res.response);
        await api.logActivity({
          icon: "�",
          title: `Assistant: ${res.response}`,
          description: `Intent: ${res.intent}, Emotion: ${voiceEmotion} (${emotionConfidence})`,
          type: "System Response",
        });
      }
    } catch (err) {
      console.error("[v0] Voice pipeline error:", err);
    }
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      await handleTranscript(input.trim());
    } finally {
      setBusy(false);
      setInput("");
    }
  };

  useEffect(() => {
    // Continuous recognition if available
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onresult = (e) => {
      const idx = e.resultIndex;
      const transcript = e.results[idx][0].transcript;
      const normalized = String(transcript)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .trim();
      if (isSpeakingRef.current) return;
      if (normalized && normalized === lastSpokenRef.current) return;
      handleTranscript(transcript);
    };
    recog.onerror = () => {};
    try {
      recog.start();
      recognitionRef.current = recog;
    } catch {}
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let rafId;
    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const timeData = new Uint8Array(analyser.fftSize);
        const loop = () => {
          analyser.getByteTimeDomainData(timeData);
          // Compute RMS and zero-crossing rate
          let sumSquares = 0;
          let zc = 0;
          let prev = (timeData[0] - 128) / 128;
          for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            sumSquares += v * v;
            if ((v >= 0 && prev < 0) || (v < 0 && prev >= 0)) zc += 1;
            prev = v;
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          const zcr = zc / timeData.length;
          metricsRef.current = { rms, zcr, updatedAt: performance.now() };
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (e) {
        // mic not available, skip
      }
    }
    initAudio();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  return (
    <div
      className="voice-console"
      style={{
        position: "absolute",
        bottom: 140,
        left: 24,
        zIndex: 110,
        maxWidth: 420,
      }}
    >
      {/* ... no debug panel rendered ... */}
    </div>
  );
}
