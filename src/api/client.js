async function json(promise) {
  const res = await promise;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  // reminders
  getReminders: (status) =>
    json(fetch(`/api/reminders?status=${encodeURIComponent(status)}`)),
  addReminder: (payload) =>
    json(
      fetch("/api/reminders", { method: "POST", body: JSON.stringify(payload) })
    ),
  updateReminder: (id, payload) =>
    json(
      fetch(`/api/reminders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ),
  deleteReminder: (id) =>
    json(fetch(`/api/reminders/${id}`, { method: "DELETE" })),
  completeReminder: (payload) =>
    json(
      fetch("/api/reminders/complete", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),

  // alerts
  getAlerts: () => json(fetch("/api/alerts")),
  addAlert: (payload) =>
    json(
      fetch("/api/alerts", { method: "POST", body: JSON.stringify(payload) })
    ),
  resolveAlert: (id) =>
    json(
      fetch(`/api/alerts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      })
    ),
  getAlertStats: () => json(fetch("/api/alerts/stats")),

  // family
  getFamily: () => json(fetch("/api/family")),
  getRecentRecognitions: () => json(fetch("/api/recognitions/recent")),
  addFamily: (payload) =>
    json(
      fetch("/api/family", { method: "POST", body: JSON.stringify(payload) })
    ),
  addFamilyMember: (payload) =>
    json(
      fetch("/api/family", { method: "POST", body: JSON.stringify(payload) })
    ),
  setPrimaryContact: (email) =>
    json(
      fetch("/api/family/primary", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
    ),

  // activity
  getActivity: () => json(fetch("/api/activity")),
  logActivity: (payload) =>
    json(
      fetch("/api/activity/log", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),

  // mood
  getMood: () => json(fetch("/api/mood")),
  logMood: (score) =>
    json(
      fetch("/api/mood/log", {
        method: "POST",
        body: JSON.stringify({ score }),
      })
    ),

  // overview & schedule
  getScheduleToday: () => json(fetch("/api/schedule/today")),
  getOverview: () => json(fetch("/api/stats/overview")),

  // voice pipeline
  voicePipeline: (transcript, imageData, extra = {}) =>
    json(
      fetch("/api/voice/pipeline", {
        method: "POST",
        body: JSON.stringify({ transcript, imageData, ...extra }),
      })
    ),
  voicePipelineWithFaces: (transcript, faces, extra = {}) =>
    json(
      fetch("/api/voice/pipeline", {
        method: "POST",
        body: JSON.stringify({ transcript, faces, ...extra }),
      })
    ),

  // email
  sendEmail: (payload) =>
    json(
      fetch("/api/email/send", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),
  getEmailConfig: () => json(fetch("/api/email/config")),
  setEmailConfig: (payload) =>
    json(
      fetch("/api/email/config", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),

  // unknown faces
  getUnknownFaces: () => json(fetch("/api/faces/unknown")),
  addUnknownFace: (imageData) =>
    json(
      fetch("/api/faces/unknown", {
        method: "POST",
        body: JSON.stringify({ imageData }),
      })
    ),
  discardUnknownFace: (id) =>
    json(fetch(`/api/faces/unknown/${id}`, { method: "DELETE" })),
  labelUnknownFace: (payload) =>
    json(
      fetch("/api/faces/label", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),
};
