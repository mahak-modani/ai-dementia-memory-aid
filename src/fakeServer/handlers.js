import { db, nextId } from "./db";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

let _recogIndex = 0;
function hashStr(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function recognizeFace(imageData) {
  const list = db.family;
  if (!list || list.length === 0) return null;
  // If it's a data URL (webcam) derive a stable hash and sometimes return unknown
  if (typeof imageData === "string" && imageData.startsWith("data:")) {
    const h = hashStr(imageData.slice(0, 500));
    const mod = h % (list.length + 1);
    return mod === list.length ? null : list[mod];
  }
  // If it references a known training image path, pick the member by path
  if (typeof imageData === "string" && imageData.includes("/images/family/")) {
    const found = db.family.find(
      (m) =>
        (m.trainingImages || []).some((p) => imageData.includes(p)) ||
        imageData.includes(m.photoUrl || "")
    );
    if (found) return found;
  }
  // fallback rotate
  const member = list[_recogIndex % list.length];
  _recogIndex += 1;
  return member;
}
function recognizeFaces(faces) {
  if (!Array.isArray(faces) || faces.length === 0) return [];
  const ordered = [...faces].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  return ordered.map((f) => ({ face: f, member: recognizeFace(f.imageData) }));
}

function addActivityEvent({
  icon,
  title,
  description,
  type,
  bgColor = "#EFF6FF",
  borderColor = "#3B82F6",
}) {
  db.activity.unshift({
    id: nextId("e"),
    icon,
    title,
    description,
    time: new Date().toLocaleTimeString(),
    type,
    bgColor,
    borderColor,
  });
}

function predictIntent(text) {
  const t = text.toLowerCase();
  if (/(remind|reminder|remember|set .* reminder)/.test(t))
    return "set_reminder";
  if (/(who is this|who is that|who am i with|who are you)/.test(t))
    return "who_is_this";
  if (/\b(alert (?:my )?family|email my family|tell my family)\b/.test(t))
    return "family_alert";
  if (
    /\b(mark .* (done|complete)|mark (?:it|this) (done|complete)|i (finished|completed)|yes,? mark it)\b/.test(
      t
    )
  )
    return "complete_reminder";
  if (
    /\b(i need help|help me|alert (?:my )?caregiver|alert caregiver|emergency|sos)\b/.test(
      t
    )
  )
    return "emergency_alert";
  if (/(open photos|show photos|view photos|photos)/.test(t))
    return "open_photos";
  if (/(play brain game|start brain game|brain game|play game)/.test(t))
    return "play_brain_game";
  if (/(open upcoming|show schedule|open schedule|upcoming)/.test(t))
    return "open_upcoming";
  return "small_talk";
}

function extractEntities(text) {
  const t = String(text || "").trim();
  // normalize dots in am/pm
  const clean = t.replace(/\./g, "");

  // time patterns: 10:52 am, 10:52am, 10 am, 1052, noon/night/morning/evening
  const timeRegexes = [
    /\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/i,
    /\b(\d{1,2}\s*(?:am|pm))\b/i,
    /\b(noon|morning|evening|night)\b/i,
    /\b(\d{1,2}:\d{2})\b/i, // 24h or ambiguous
  ];
  let timeMatch = null;
  for (const rx of timeRegexes) {
    const m = clean.match(rx);
    if (m) {
      timeMatch = m[1] || m[0];
      break;
    }
  }

  // title extraction patterns (try several ordered heuristics)
  let title = null;
  // quoted title: set reminder "sleep" at 10:52
  const quoted = t.match(
    /(?:set\s+reminder|remind(?: me)?(?: to)?|add reminder)\s+["'](.+?)["'](?:\s+at|$)/i
  );
  if (quoted) title = quoted[1].trim();

  // pattern: set reminder sleep at 10:52
  if (!title) {
    const setRem = t.match(/(?:set\s+reminder|add reminder)\s+(.+?)\s+at\s+/i);
    if (setRem) title = setRem[1].trim();
  }

  // pattern: remind me to sleep at 10:52
  if (!title) {
    const rmt = t.match(/remind(?: me)?(?: to)?\s+(.+?)(?:\s+at\s+|$)/i);
    if (rmt) title = rmt[1].trim();
  }

  // pattern: 'title sleep' or 'title: sleep'
  if (!title) {
    const titleMarker = t.match(/(?:title|name)[:]?\s*(.+?)(?:$| at | time )/i);
    if (titleMarker) title = titleMarker[1].trim();
  }

  // fallback: last 'for X' clause
  if (!title) {
    const forMatch = t.match(/for\s+([a-z0-9 ,.'-]+)(?: at|$)/i);
    if (forMatch) title = forMatch[1].trim();
  }

  // final fallback: try to capture words after the verb 'set' (set a reminder for ...)
  if (!title) {
    const fallback = t.match(
      /set(?: a)? reminder(?: to)?(?: for)?\s+(.+?)(?: at|$)/i
    );
    if (fallback) title = fallback[1].trim();
  }

  let normalized = timeMatch ? normalizeTime(timeMatch) : undefined;
  // if normalizeTime failed but the raw contained explicit 'am' or 'pm', try to coerce
  if (
    !normalized &&
    /\b(am|pm|a\.m\.|p\.m\.|morning|night|evening)\b/i.test(t)
  ) {
    // try to find a numeric time and append AM/PM hint
    const num = (t.match(/(\d{1,2}:\d{2})/) || t.match(/\b(\d{1,2})\b/))?.[1];
    if (num) {
      const hint = /\b(am|a\.m\.|morning)\b/i.test(t)
        ? "AM"
        : /\b(pm|p\.m\.|night|evening|tonight|sleep)\b/i.test(t)
        ? "PM"
        : null;
      if (hint) normalized = normalizeTime(`${num} ${hint}`);
    }
  }

  if (title)
    title = title.replace(/\s+\bin the morning\b|\s+\bat night\b/i, "").trim();
  return { time: normalized, task: title?.trim() };
}

function normalizeTime(raw) {
  const s = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
  if (s === "NOON") return "12:00 PM";
  if (s === "MORNING") return "9:00 AM";
  if (s === "EVENING") return "6:00 PM";
  if (s === "NIGHT") return "10:00 PM";
  // HH:MM AM/PM or H AM/PM
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match) {
    const hh = match[1].padStart(1, "0");
    const mm = match[2] ? match[2] : "00";
    return `${hh}:${mm} ${match[3]}`;
  }
  // HH:MM 24h -> convert to AM/PM
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = Number.parseInt(m24[1], 10);
    const mm = m24[2];
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    if (h > 12) h = h - 12;
    return `${h}:${mm} ${ampm}`;
  }
  // bare HH -> assume AM for morning-like hours (1-11), PM for 12-23
  const hOnly = s.match(/^(\d{1,2})$/);
  if (hOnly) {
    const h = Number(hOnly[1]);
    if (h >= 1 && h <= 11) return `${h}:00 AM`;
    if (h === 12) return `12:00 PM`;
    if (h > 12 && h < 24) return `${h - 12}:00 PM`;
  }
  // if we couldn't parse, return undefined to let callers choose a sensible default
  return undefined;
}

function regenerateScheduleFromReminders() {
  try {
    // Build today's schedule from reminders (include active/pending reminders)
    const items = [];
    for (const r of db.reminders) {
      if (!r) continue;
      // prefer explicit AM/PM strings, otherwise normalize
      const time =
        typeof r.time === "string" &&
        (r.time.includes("AM") || r.time.includes("PM"))
          ? r.time
          : normalizeTime(r.time) || r.time;
      // include reminders regardless of status so Overview can show completed items
      items.push({
        id: r.id,
        time,
        task: r.title,
        frequency: r.frequency || "One-time",
        status:
          r.status === "completed"
            ? "completed"
            : r.status === "missed"
            ? "missed"
            : "pending",
      });
    }
    // sort by time if possible (convert to Date for today)
    items.sort((a, b) => {
      const parse = (s) => {
        try {
          // attempt to parse using Date by adding today's date
          const today = new Date();
          const dt = new Date(`${today.toLocaleDateString()} ${s}`);
          return isNaN(dt.getTime()) ? 0 : dt.getTime();
        } catch {
          return 0;
        }
      };
      return parse(a.time) - parse(b.time);
    });
    db.scheduleToday = items;
  } catch (e) {
    // swallow errors — fallback to existing scheduleToday
    console.error("regenerateScheduleFromReminders failed", e);
  }
}

// phrases used for marking reminders complete (exported here for quick reference)
const COMPLETE_REMINDER_PHRASES = [
  "mark .* (done|complete)",
  "mark (?:it|this) (done|complete)",
  "i (finished|completed)",
  "yes,? mark it",
];

function predictEmotion(text) {
  const t = String(text || "").toLowerCase();
  // tiny sentiment lexicon with weights (positive -> +, negative -> -)
  const lex = {
    // positive
    happy: 1,
    great: 1,
    good: 0.9,
    fine: 0.8,
    thanks: 0.9,
    thank: 0.9,
    thankyou: 0.9,
    thank_you: 0.9,
    awesome: 1,
    amazing: 1,
    ok: 0.3,
    okay: 0.4,
    // negative
    sorry: -0.6,
    sad: -1,
    upset: -0.9,
    lonely: -0.8,
    frustrated: -0.9,
    frustrating: -0.85,
    angry: -1,
    mad: -0.9,
    panic: -0.95,
    scared: -0.9,
    scaredy: -0.6,
    help: -0.8,
    terrible: -1,
    awful: -1,
    bored: -0.4,
  };

  // keyword boosts for specific emotions
  const boosts = {
    angry: /(angry|frustrat|mad|irritat|annoyed|furious)/i,
    stressed: /(help|panic|emergency|scared)/i,
    sad: /(sad|upset|lonely)/i,
    happy: /(great|good|happy|fine|thanks|thank you)/i,
  };

  // lexicon score with simple negation handling
  let score = 0;
  let tokens = t.split(/[^a-z0-9]+/).filter(Boolean);
  const negWords = new Set([
    "not",
    "don't",
    "didn't",
    "never",
    "no",
    "hardly",
    "cannot",
    "can't",
  ]);
  const emphasisWords = new Set(["very", "so", "really", "extremely"]);
  let matchedCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!(tok in lex)) continue;
    let weight = lex[tok] || 0;
    // check for negation in the previous two tokens
    const prev1 = tokens[i - 1];
    const prev2 = tokens[i - 2];
    if (prev1 && negWords.has(prev1)) weight = -weight;
    if (prev2 && negWords.has(prev2)) weight = -weight;
    // emphasis handling
    if (prev1 && emphasisWords.has(prev1)) weight = weight * 1.5;
    if (prev2 && emphasisWords.has(prev2)) weight = weight * 1.3;
    matchedCount += 1;
    score += weight;
  }
  // normalize by number of matched lexicon tokens if any, otherwise by total tokens
  if (matchedCount > 0) score = score / Math.max(1, matchedCount);
  else if (tokens.length > 0) score = score / Math.max(1, tokens.length);

  // apply boosts
  let detected = null;
  for (const [label, rx] of Object.entries(boosts)) {
    if (rx.test(t)) {
      detected = label;
      break;
    }
  }

  // explicit "I feel X" patterns (captures sentiment adjectives directly)
  const feelMatch = t.match(
    /\bfeel(?:\s+(very|so|really))?\s+(happy|sad|scared|angry|frustrated|upset|lonely|good|fine)\b/i
  );
  if (feelMatch) {
    const adj = feelMatch[2].toLowerCase();
    const adv = feelMatch[1];
    // map adjective to our emotion labels
    const map = {
      happy: "happy",
      good: "happy",
      fine: "happy",
      sad: "sad",
      upset: "sad",
      lonely: "sad",
      frustrated: "angry",
      angry: "angry",
      scared: "stressed",
    };
    if (map[adj]) {
      detected = map[adj];
      // small boost to score so confidence increases
      score = Math.max(
        score,
        adj === "happy"
          ? 0.6
          : adj === "scared"
          ? -0.6
          : adj === "sad"
          ? -0.7
          : 0.6
      );
      // if emphasized (very/so), increase future confidence
      if (adv) score = score * 1.3;
    }
  }

  // derive final emotion and confidence
  let emotion = "neutral";
  let confidence = 0.35; // baseline low confidence

  if (detected) {
    emotion = detected;
    // map lex score to confidence boost
    confidence = 0.5 + Math.min(0.45, Math.abs(score));
    // if detected is angry/stressed, push confidence a bit
    if (detected === "angry") confidence = Math.max(confidence, 0.75);
    if (detected === "stressed") confidence = Math.max(confidence, 0.65);
  } else {
    // no keyword detected: use lex score
    if (score <= -0.5) {
      emotion = "sad";
      confidence = Math.min(0.85, 0.45 + Math.abs(score));
    } else if (score >= 0.5) {
      emotion = "happy";
      confidence = Math.min(0.85, 0.45 + score);
    } else {
      emotion = "neutral";
      confidence = 0.35 + Math.abs(score) * 0.35;
    }
  }

  // clamp
  confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
  return { emotion, confidence };
}

export async function handleRequest(url, options) {
  const { pathname, searchParams } = new URL(url, window.location.origin);
  const method = (options?.method || "GET").toUpperCase();
  // refresh today's schedule from reminders so daily repeats persist
  regenerateScheduleFromReminders();
  await delay(150);

  // REMINDERS
  if (pathname === "/api/reminders" && method === "GET") {
    const status = searchParams.get("status") || "active";
    // derive directly from reminders so completed items are available
    const derived = db.reminders.map((r) => ({
      id: r.id,
      icon: r.icon || "⏰",
      iconBg: r.iconBg || "#EFF6FF",
      iconColor: r.iconColor || "#3B82F6",
      title: r.title,
      tags: r.tags || [
        {
          label: (r.frequency || "One-time").toLowerCase(),
          color: "#EFF6FF",
          textColor: "#3B82F6",
        },
      ],
      description: r.description || "",
      time: r.time || "09:00",
      frequency: r.frequency || "One-time",
      status:
        r.status === "completed"
          ? "completed"
          : r.status === "missed"
          ? "missed"
          : "active",
      nextDue: r.nextDue || `Today, ${r.time || "09:00"}`,
    }));
    const result = derived.filter((r) => r.status === status);
    return ok(result);
  }
  if (pathname === "/api/reminders" && method === "POST") {
    const body = await readJson(options);
    const reminder = {
      id: nextId("r"),
      status: "active",
      icon: body.icon || "⏰",
      iconBg: body.iconBg || "#EFF6FF",
      iconColor: body.iconColor || "#3B82F6",
      title: body.title,
      tags: body.tags || [],
      description: body.description || "",
      time: body.time || "09:00",
      frequency: body.frequency || "One-time",
      nextDue: body.nextDue || "Today",
      createdAt: Date.now(),
    };
    db.reminders.unshift(reminder);
    db.scheduleToday.unshift({
      id: reminder.id,
      time:
        reminder.time.includes("AM") || reminder.time.includes("PM")
          ? reminder.time
          : normalizeTime(reminder.time),
      task: reminder.title,
      frequency: reminder.frequency,
      status: "pending",
    });
    db.activity.unshift({
      id: nextId("e"),
      icon: "🔔",
      title: `Reminder created: ${reminder.title}`,
      description: `Scheduled at ${reminder.time} (${reminder.frequency})`,
      time: new Date().toLocaleTimeString(),
      type: "Reminder",
      bgColor: "#FEF3C7",
      borderColor: "#F59E0B",
    });
    return ok(reminder, 201);
  }
  if (pathname.startsWith("/api/reminders/") && method === "PUT") {
    const id = pathname.split("/").pop();
    const body = await readJson(options);
    const idx = db.reminders.findIndex((r) => r.id === id);
    if (idx < 0) return notFound();
    db.reminders[idx] = { ...db.reminders[idx], ...body };
    return ok(db.reminders[idx]);
  }
  if (pathname.startsWith("/api/reminders/") && method === "DELETE") {
    const id = pathname.split("/").pop();
    const idx = db.reminders.findIndex((r) => r.id === id);
    if (idx < 0) return notFound();
    const removed = db.reminders.splice(idx, 1)[0];
    return ok({ deleted: removed.id });
  }

  // ALERTS
  if (pathname === "/api/alerts" && method === "GET") {
    return ok(db.alerts.slice(0, 20));
  }
  if (pathname === "/api/alerts" && method === "POST") {
    const body = await readJson(options);
    const alert = {
      id: nextId("a"),
      title: body.title || "Emergency Button Pressed",
      severity: body.severity || "high",
      description:
        body.description ||
        "Patient activated emergency button and did not cancel",
      time: new Date().toLocaleString(),
      status: body.status || "active",
      badge: body.severity || "high",
    };
    db.alerts.unshift(alert);
    db.activity.unshift({
      id: nextId("e"),
      icon: "⚠️",
      title: alert.title,
      description: alert.description,
      time: new Date().toLocaleTimeString(),
      type: "Emergency",
      bgColor: "#FEF3C7",
      borderColor: "#F59E0B",
    });
    return ok(alert, 201);
  }
  if (pathname.startsWith("/api/alerts/") && method === "PUT") {
    const id = pathname.split("/").pop();
    const body = await readJson(options);
    const idx = db.alerts.findIndex((a) => a.id === id);
    if (idx < 0) return notFound();
    db.alerts[idx] = { ...db.alerts[idx], ...body };
    return ok(db.alerts[idx]);
  }
  if (pathname === "/api/alerts/stats" && method === "GET") {
    const active = db.alerts.filter((a) => a.status === "active").length;
    const acknowledged = db.alerts.filter(
      (a) => a.status === "acknowledged"
    ).length;
    const resolved = db.alerts.filter((a) => a.status === "resolved").length;
    return ok({ active, acknowledged, resolved });
  }

  // FAMILY & RECOGNITION
  if (pathname === "/api/family" && method === "GET") {
    return ok(db.family.slice());
  }
  if (pathname === "/api/recognitions/recent" && method === "GET") {
    return ok(db.recognitions.slice(0, 10));
  }

  // EMAIL
  if (pathname === "/api/email/send" && method === "POST") {
    const body = await readJson(options);
    const email = {
      id: nextId("m"),
      to: body.to,
      subject: body.subject || "(no subject)",
      body: body.body || "",
      time: new Date().toLocaleString(),
    };
    db.emailOutbox.unshift(email);
    addActivityEvent({
      icon: "✉️",
      title: `Email sent to ${email.to}`,
      description: email.subject,
      type: "Notification",
      bgColor: "#F0F9FF",
      borderColor: "#38BDF8",
    });
    return ok({ queued: true, id: email.id }, 201);
  }

  // EMAIL CONFIG
  if (pathname === "/api/email/config" && method === "GET") {
    return ok(db.emailConfig);
  }
  if (pathname === "/api/email/config" && method === "POST") {
    const body = await readJson(options);
    if (body.caregiverEmail)
      db.emailConfig.caregiverEmail = body.caregiverEmail;
    if (body.primaryFamilyEmail)
      db.emailConfig.primaryFamilyEmail = body.primaryFamilyEmail;
    return ok(db.emailConfig);
  }

  // FAMILY PRIMARY
  if (pathname === "/api/family/primary" && method === "POST") {
    const body = await readJson(options); // { email }
    const { email } = body || {};
    db.family.forEach((m) => (m.primary = false));
    const found = db.family.find((m) => m.email === email);
    if (found) found.primary = true;
    if (email) db.emailConfig.primaryFamilyEmail = email;
    return ok({
      ok: true,
      primaryFamilyEmail: db.emailConfig.primaryFamilyEmail,
    });
  }

  // UNKNOWN FACES
  if (pathname === "/api/faces/unknown" && method === "GET") {
    return ok(db.unknownFaces.slice());
  }
  if (pathname === "/api/faces/unknown" && method === "POST") {
    const body = await readJson(options);
    const rec = {
      id: nextId("u"),
      imageData: body.imageData,
      capturedAt: new Date().toLocaleString(),
    };
    db.unknownFaces.unshift(rec);
    addActivityEvent({
      id: nextId("e"),
      icon: "❓",
      title: "Unknown face saved",
      description:
        "A face could not be recognized and was saved for caregiver review",
      type: "Face Recognition",
      bgColor: "#FFF7ED",
      borderColor: "#FB923C",
    });
    return ok(rec, 201);
  }
  if (pathname.startsWith("/api/faces/unknown/") && method === "DELETE") {
    const id = pathname.split("/").pop();
    const idx = db.unknownFaces.findIndex((f) => f.id === id);
    if (idx < 0) return notFound();
    const removed = db.unknownFaces.splice(idx, 1)[0];
    return ok({ deleted: removed.id });
  }

  // FAMILY ADD
  if (pathname === "/api/family" && method === "POST") {
    const body = await readJson(options);
    const member = {
      id: nextId("f"),
      name: body.name,
      relation: body.relation || "Friend",
      lastSeen: `Added: ${new Date().toLocaleDateString()}`,
      recognitionRate: "75%",
      trainingPhotos: body.imageData ? "1 photo" : "0 photos",
      email: body.email || "",
      photoUrl: body.photoUrl || undefined,
      imageData: body.imageData || undefined,
      primary: !!body.primary,
    };
    db.family.unshift(member);
    if (member.primary && member.email)
      db.emailConfig.primaryFamilyEmail = member.email;
    addActivityEvent({
      id: nextId("e"),
      icon: "👥",
      title: `Added new face: ${member.name}`,
      description: `Saved as ${member.relation}`,
      type: "Face Recognition",
      bgColor: "#ECFDF5",
      borderColor: "#10B981",
    });
    return ok(member, 201);
  }

  // FACE LABEL
  if (pathname === "/api/faces/label" && method === "POST") {
    const body = await readJson(options);
    const idx = db.unknownFaces.findIndex((f) => f.id === body.id);
    let imageData = body.imageData;
    if (idx >= 0) {
      const rec = db.unknownFaces.splice(idx, 1)[0];
      imageData = imageData || rec.imageData;
    }
    const member = {
      id: nextId("f"),
      name: body.name,
      relation: body.relation || "Friend",
      lastSeen: `Added: ${new Date().toLocaleDateString()}`,
      recognitionRate: "80%",
      trainingPhotos: imageData ? "1 photo" : "0 photos",
      email: body.email || "",
      photoUrl: body.photoUrl || undefined,
      imageData,
      primary: !!body.primary,
    };
    db.family.unshift(member);
    if (member.primary && member.email)
      db.emailConfig.primaryFamilyEmail = member.email;
    addActivityEvent({
      id: nextId("e"),
      icon: "👥",
      title: `Labeled new person: ${member.name}`,
      description: `Saved as ${member.relation}`,
      type: "Face Recognition",
      bgColor: "#ECFDF5",
      borderColor: "#10B981",
    });
    return ok(member, 201);
  }

  // MOOD LOGGING
  if (pathname === "/api/mood/log" && method === "POST") {
    const body = await readJson(options);
    const score = Number(body.score || 5);
    db.mood.todaySeries.push({
      t: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      score,
    });
    const sum = db.mood.todaySeries.reduce((a, b) => a + b.score, 0);
    db.mood.average = sum / db.mood.todaySeries.length;
    addActivityEvent({
      id: nextId("e"),
      icon: "😊",
      title: "Mood logged",
      description: `Scored ${score}/10`,
      type: "Emotion Detection",
      bgColor: "#F0FDF4",
      borderColor: "#16A34A",
    });
    return ok({ ok: true, average: db.mood.average });
  }

  // ACTIVITY LOGGING
  if (pathname === "/api/activity/log" && method === "POST") {
    const body = await readJson(options);
    addActivityEvent({
      id: nextId("e"),
      icon: body.icon || "📝",
      title: body.title || "User interaction",
      description: body.description || "",
      type: body.type || "Interaction",
    });
    return ok({ ok: true });
  }

  // ACTIVITY
  if (pathname === "/api/activity" && method === "GET") {
    return ok(db.activity.slice(0, 50));
  }

  // MOOD
  if (pathname === "/api/mood" && method === "GET") {
    return ok(db.mood);
  }

  // OVERVIEW & SCHEDULE
  if (pathname === "/api/schedule/today" && method === "GET") {
    return ok(db.scheduleToday);
  }
  if (pathname === "/api/stats/overview" && method === "GET") {
    if (db.activity.length === 0) {
      return ok({
        stats: [
          {
            label: "Daily Tasks Completed",
            value: "0",
            color: "#10B981",
            progress: 0,
          },
          {
            label: "Social Interactions Today",
            value: "0",
            color: "#3B82F6",
            progress: null,
          },
          {
            label: "Average Mood Score",
            value: "0/10",
            color: "#F59E0B",
            progress: null,
          },
          {
            label: "Emergency Alerts",
            value: "0",
            color: "#6B7280",
            progress: null,
          },
        ],
        recentActivity: db.activity,
        todaySchedule: db.scheduleToday,
        weeklyTrends: [
          {
            metric: "0%",
            label: "Task Completion Rate",
            change: "Start interacting",
            color: "#10B981",
          },
          {
            metric: "0",
            label: "Social Interactions",
            change: "Start interacting",
            color: "#3B82F6",
          },
          {
            metric: "0.0",
            label: "Average Mood Score",
            change: "Start interacting",
            color: "#F59E0B",
          },
        ],
      });
    }
    const completed = db.scheduleToday.filter(
      (s) => s.status === "completed"
    ).length;
    const socialInteractions = db.activity.filter(
      (a) => a.type === "Face Recognition" && a.title === "Relationship cueing"
    ).length;
    const dailyTasksCompleted = `${completed}/${db.scheduleToday.length}`;
    const avgMood = `${db.mood.average.toFixed(1)}/10`;
    const emergencyCount = db.alerts.filter(
      (a) =>
        a.severity === "high" &&
        (a.status === "active" || a.status === "acknowledged")
    ).length;
    return ok({
      stats: [
        {
          label: "Daily Tasks Completed",
          value: dailyTasksCompleted,
          color: "#10B981",
          progress: Math.round((completed / db.scheduleToday.length) * 100),
        },
        {
          label: "Social Interactions Today",
          value: String(socialInteractions),
          color: "#3B82F6",
          progress: null,
        },
        {
          label: "Average Mood Score",
          value: avgMood,
          color: "#F59E0B",
          progress: null,
        },
        {
          label: "Emergency Alerts",
          value: String(emergencyCount),
          color: "#6B7280",
          progress: null,
        },
      ],
      recentActivity: db.activity,
      todaySchedule: db.scheduleToday,
      weeklyTrends: [
        {
          metric: "85%",
          label: "Task Completion Rate",
          change: "↑ 5% from last week",
          color: "#10B981",
        },
        {
          metric: String(socialInteractions),
          label: "Social Interactions",
          change: "—",
          color: "#3B82F6",
        },
        {
          metric: `${db.mood.average.toFixed(1)}`,
          label: "Average Mood Score",
          change: "—",
          color: "#F59E0B",
        },
      ],
    });
  }

  if (pathname === "/api/reminders/complete" && method === "POST") {
    const body = await readJson(options);
    let target = null;
    if (body.id) target = db.reminders.find((r) => r.id === body.id);
    if (!target && body.title) {
      const t = body.title.toLowerCase().trim();
      target = db.reminders.find(
        (r) => r.title.toLowerCase() === t && r.status !== "completed"
      );
    }
    if (!target) return notFound();
    target.status = "completed";
    target.completedAt = new Date().toLocaleString();
    const sIdx = db.scheduleToday.findIndex(
      (s) => s.task === target.title || s.id === target.id
    );
    if (sIdx >= 0)
      db.scheduleToday[sIdx] = {
        ...db.scheduleToday[sIdx],
        status: "completed",
      };
    addActivityEvent({
      id: nextId("e"),
      icon: "✅",
      title: `Reminder completed: ${target.title}`,
      description: target.completedAt,
      type: "Reminder",
      bgColor: "#ECFDF5",
      borderColor: "#10B981",
    });
    return ok({ ok: true, reminder: target });
  }

  // VOICE PIPELINE (SER + INTENT + ENTITIES + ACTIONS + TTS)
  if (pathname === "/api/voice/pipeline" && method === "POST") {
    const body = await readJson(options);
    const transcript = (body?.transcript || "").trim();
    const voiceEmotion = body?.voiceEmotion;
    const suppliedConfidence = Number(body?.emotionConfidence || 0);
    const predicted = predictEmotion(transcript);
    // predicted may be an object { emotion, confidence }
    const predictedEmotion =
      typeof predicted === "string" ? predicted : predicted.emotion;
    const predictedConfidence =
      typeof predicted === "string" ? 0 : predicted.confidence;
    const emotion = voiceEmotion || predictedEmotion;
    const emotionConfidence =
      suppliedConfidence > 0 ? suppliedConfidence : predictedConfidence || 0;
    const entities = extractEntities(transcript);
    const imageData = body?.imageData;
    const faces = Array.isArray(body?.faces) ? body.faces : null;

    let response = "";
    let uiAction = null;

    const intent = predictIntent(transcript);

    // quick-follow replies: if user just said 'daily/weekly/one-time/only today',
    // treat as a follow-up to a pending voice-created reminder
    const followUpMatch = transcript.match(
      /\b(daily|weekly|one[- ]time|one time|only today|only for today)\b/i
    );
    if (followUpMatch && db.pendingReminder) {
      const raw = String(followUpMatch[1] || "").toLowerCase();
      let freq = "One-time";
      if (/daily/i.test(raw)) freq = "Daily";
      else if (/weekly/i.test(raw)) freq = "Weekly";
      else freq = "One-time";
      const pid = db.pendingReminder.id;
      const idx = db.reminders.findIndex((r) => r.id === pid);
      if (idx >= 0) {
        db.reminders[idx].frequency = freq;
        // update mirrored scheduleToday entry if present
        const sIdx = db.scheduleToday.findIndex(
          (s) => s.id === pid || s.task === db.reminders[idx].title
        );
        if (sIdx >= 0) db.scheduleToday[sIdx].frequency = freq;
        db.pendingReminder = null;
        response = `Okay — I'll repeat that ${freq.toLowerCase()}.`;
        uiAction = "refresh_schedule";
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response,
          uiAction,
        });
      }
      // no pending found — fall through to normal handling
    }

    if (intent === "set_reminder") {
      const title = entities.task || "Reminder";
      let time = entities.time;
      if (!time) {
        // if user explicitly said AM/PM words, map to reasonable defaults
        if (/\b(am|a\.m\.|in the morning|morning)\b/i.test(transcript))
          time = "10:00 AM";
        else if (
          /\b(pm|p\.m\.|in the evening|night|tonight|sleep)\b/i.test(transcript)
        )
          time = "10:00 PM";
        else time = "6:00 PM";
      }
      const newReminder = {
        title,
        description: entities.task ? `Remember to ${entities.task}` : "",
        time,
        frequency: "One-time",
        nextDue: `Today, ${time}`,
      };
      const created = createReminder(newReminder);
      // store pending reminder so a short follow-up can change frequency
      db.pendingReminder = { id: created.id, createdAt: Date.now() };
      // Return a short acknowledgement only — the frontend will handle repeat selection
      // and we avoid speaking the follow-up question to prevent race conditions.
      response = `Okay. I set a reminder "${created.title}" at ${created.time}.`;
      uiAction = "ask_repeat";
      // include created reminder in response so client can reference it
      return ok({
        transcript,
        emotion,
        emotionConfidence,
        intent,
        entities,
        response,
        uiAction,
        created,
      });
    } else if (intent === "complete_reminder") {
      const title = entities.task;
      const time = entities.time;
      if (!title) {
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response: "Which reminder should I mark complete?",
        });
      }
      const payload = time ? { title, time } : { title };
      const res = await handleRequest("/api/reminders/complete", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.status === 200) {
        response = `Marked "${title}" as complete.`;
        uiAction = "refresh_schedule";
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response,
          uiAction,
        });
      }
      response = `I couldn't find "${title}"${time ? ` at ${time}` : ""}.`;
    } else if (intent === "who_is_this") {
      if (faces && faces.length > 1) {
        const results = recognizeFaces(faces);
        const recognizedList = [];
        const parts = [];
        for (const { face, member } of results) {
          if (member) {
            const trainingImage =
              (Array.isArray(member.trainingImages) &&
                member.trainingImages[0]) ||
              member.photoUrl ||
              "/placeholder.svg";
            recognizedList.push({
              name: member.name,
              relation: member.relation,
              imageUrl: trainingImage,
            });
            parts.push(`${member.name}, your ${member.relation}`);
            addActivityEvent({
              id: nextId("e"),
              icon: "👤",
              title: "Relationship cueing",
              description: `Recognized ${member.name}`,
              type: "Face Recognition",
              bgColor: "#ECFDF5",
              borderColor: "#10B981",
            });
          } else {
            parts.push("Sorry I do not know this person");
            if (face?.imageData) {
              db.unknownFaces.unshift({
                id: nextId("u"),
                imageData: face.imageData,
                capturedAt: new Date().toLocaleString(),
              });
            }
            addActivityEvent({
              id: nextId("e"),
              icon: "❓",
              title: "Unknown person",
              description: "Saved screenshot for caregiver review",
              type: "Face Recognition",
              bgColor: "#FFF7ED",
              borderColor: "#FB923C",
            });
          }
        }
        response = `Starting from the left this is ${parts.join(", ")}.`;
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response,
          uiAction: "show_identities",
          recognizedList,
        });
      }

      // single-face fallback
      const known = recognizeFace(imageData);
      if (known) {
        const trainingImage =
          (Array.isArray(known.trainingImages) && known.trainingImages[0]) ||
          known.photoUrl ||
          "/placeholder.svg";
        response = `This is ${known.name}, your ${known.relation}.`;
        addActivityEvent({
          id: nextId("e"),
          icon: "👤",
          title: "Relationship cueing",
          description: response,
          type: "Face Recognition",
          bgColor: "#ECFDF5",
          borderColor: "#10B981",
        });
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response,
          uiAction: "show_identity",
          recognized: {
            name: known.name,
            relation: known.relation,
            imageUrl: trainingImage,
          },
        });
      } else {
        response = "Sorry I do not know this person";
        if (imageData) {
          db.unknownFaces.unshift({
            id: nextId("u"),
            imageData,
            capturedAt: new Date().toLocaleString(),
          });
        }
        addActivityEvent({
          id: nextId("e"),
          icon: "❓",
          title: "Unknown person",
          description: "Saved screenshot for caregiver review",
          type: "Face Recognition",
          bgColor: "#FFF7ED",
          borderColor: "#FB923C",
        });
        return ok({
          transcript,
          emotion,
          emotionConfidence,
          intent,
          entities,
          response,
        });
      }
    } else if (intent === "family_alert") {
      const to = db.emailConfig.primaryFamilyEmail;
      await handleRequest("/api/email/send", {
        method: "POST",
        body: JSON.stringify({
          to,
          subject: "Family Alert",
          body: "The patient requested to alert the family.",
        }),
      });
      response = "I have emailed your family.";
    } else if (intent === "emergency_alert") {
      await addAlert({
        title: "Emergency Phrase Detected",
        severity: "high",
        description: "User requested immediate help",
        status: "active",
      });
      db.emailOutbox.unshift({
        id: nextId("m"),
        to: db.emailConfig.caregiverEmail,
        subject: "Emergency Alert",
        body: "Emergency phrase detected by system.",
        time: new Date().toLocaleString(),
      });
      response =
        "I have notified your caregiver and initiated emergency protocol.";
    } else if (intent === "open_photos") {
      response = "Opening photos.";
      uiAction = "open_photos";
    } else if (intent === "play_brain_game") {
      response = "Starting brain game.";
      uiAction = "play_brain_game";
    } else if (intent === "open_upcoming") {
      response = "Showing your upcoming schedule.";
      uiAction = "open_upcoming";
    } else {
      const hasReliableEmotion = !!voiceEmotion && emotionConfidence >= 0.75;
      // escalate if angry/frustrated with high confidence
      if (hasReliableEmotion && emotion === "angry") {
        // create an alert and notify caregiver
        await addAlert({
          title: "Anger/Frustration detected",
          severity: "high",
          description: `Voice emotion analyzer detected anger: ${transcript}`,
          status: "active",
        });
        db.emailOutbox.unshift({
          id: nextId("m"),
          to: db.emailConfig.caregiverEmail,
          subject: "Caregiver Alert: Agitation detected",
          body: `The system detected signs of anger/frustration in the user's voice: ${transcript}`,
          time: new Date().toLocaleString(),
        });
        response =
          "I detected you sounded upset. I've notified your caregiver so they can check in.";
      } else if (
        hasReliableEmotion &&
        (emotion === "stressed" || /scared|panic|worried/i.test(transcript))
      ) {
        response =
          "I'm here with you right now. Let's take a deep breath together.";
      } else if (hasReliableEmotion && emotion === "sad") {
        response =
          "I'm here with you right now. Would you like to call your family?";
      } else {
        response = fallbackResponse(transcript);
      }
    }

    return ok({
      transcript,
      emotion,
      emotionConfidence,
      intent,
      entities,
      response,
      uiAction,
    });
  }

  // debug endpoint: return configured phrase patterns and emotion keywords
  if (pathname === "/api/debug/phrases" && method === "GET") {
    return ok({
      completeReminderPatterns: COMPLETE_REMINDER_PHRASES,
      completeReminderRegex:
        "/\\b(mark .* (done|complete)|mark (?:it|this) (done|complete)|i (finished|completed)|yes,? mark it)\\b/",
      angerKeywords: [
        "angry",
        "frustrat",
        "mad",
        "irritat",
        "annoyed",
        "furious",
      ],
    });
  }

  return notFound();
}

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function notFound() {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
async function readJson(options) {
  const raw = options?.body;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function createReminder(input) {
  const body = {
    icon: "⏰",
    iconBg: "#EFF6FF",
    iconColor: "#3B82F6",
    title: input.title,
    tags: [{ label: "one-time", color: "#EFF6FF", textColor: "#3B82F6" }],
    description: input.description || "",
    time: input.time,
    frequency: input.frequency || "One-time",
    nextDue: input.nextDue || `Today, ${input.time}`,
  };
  const r = {
    id: nextId("r"),
    status: "active",
    createdAt: Date.now(),
    ...body,
  };
  db.reminders.unshift(r);
  // Mirror into scheduleToday
  db.scheduleToday.unshift({
    id: r.id,
    time:
      r.time.includes("AM") || r.time.includes("PM")
        ? r.time
        : normalizeTime(r.time),
    task: r.title,
    frequency: r.frequency,
    status: "pending",
  });
  db.activity.unshift({
    id: nextId("e"),
    icon: "🔔",
    title: `Reminder created: ${r.title}`,
    description: `Scheduled at ${r.time} (${r.frequency})`,
    time: new Date().toLocaleTimeString(),
    type: "Reminder",
    bgColor: "#FEF3C7",
    borderColor: "#F59E0B",
  });
  return r;
}
async function addAlert({ title, severity, description, status }) {
  const alert = {
    id: nextId("a"),
    title,
    severity,
    description,
    time: new Date().toLocaleString(),
    status,
    badge: severity,
  };
  db.alerts.unshift(alert);
  db.activity.unshift({
    id: nextId("e"),
    icon: "⚠️",
    title,
    description,
    time: new Date().toLocaleTimeString(),
    type: "Emergency",
    bgColor: "#FEF3C7",
    borderColor: "#F59E0B",
  });
  return alert;
}
function fallbackResponse(transcript) {
  if (!transcript) return "";
  if (/time/i.test(transcript)) {
    const now = new Date();
    return `It's currently ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} on ${now.toLocaleDateString()}.`;
  }
  return "How can I help?";
}
