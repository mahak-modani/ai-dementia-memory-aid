"use client";

import { useEffect, useRef, useState } from "react";
import "./PatientView.css";
import { api } from "../api/client";
import VoiceConsole from "./VoiceConsole";

function PatientView({ onSwitchView }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef(null);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showPhotos, setShowPhotos] = useState(false);
  const [unknownFaces, setUnknownFaces] = useState([]);
  const [ufIndex, setUfIndex] = useState(0);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remTime, setRemTime] = useState("");
  const [remRepeat, setRemRepeat] = useState(true);
  const [remFrequency, setRemFrequency] = useState("Daily");
  const [showMood, setShowMood] = useState(() => {
    try {
      return !sessionStorage.getItem("moodShown");
    } catch (e) {
      return true;
    }
  });
  const [showGame, setShowGame] = useState(false);
  const [gSeq, setGSeq] = useState([]);
  const [gInput, setGInput] = useState([]);
  const [toast, setToast] = useState("");
  const [upcomingMinimized, setUpcomingMinimized] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [recognizedPeople, setRecognizedPeople] = useState([]);
  const [announcedIds, setAnnouncedIds] = useState(new Set());
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const pendingConfirmTimerRef = useRef(null);
  const pendingConfirmRef = useRef(null);
  const [pendingAwaitingConfirmation, setPendingAwaitingConfirmation] =
    useState(false);
  const [completingKeys, setCompletingKeys] = useState([]);
  // called by voice console immediately when user speech is detected
  const handleUserSpeech = async (text) => {
    try {
      if (!text) return;
      console.debug(
        "handleUserSpeech received:",
        text,
        "pendingConfirm:",
        pendingConfirm
      );
      // cancel the pending follow-up speak if scheduled
      if (pendingConfirmTimerRef.current) {
        clearTimeout(pendingConfirmTimerRef.current);
        pendingConfirmTimerRef.current = null;
      }
      const lower = String(text || "").toLowerCase();
      // NOTE: transcript logging is handled centrally in VoiceConsole to avoid duplicates

      // frequency words handling (for voice-created reminders)
      try {
        const freqMatch =
          /\b(daily|every day|weekly|once a week|one[- ]?time|one time|once)\b/i.exec(
            lower
          );
        if (freqMatch && window.__pendingReminderId) {
          let val = freqMatch[1].toLowerCase();
          let mapped = "One-time";
          if (/daily|every day/i.test(val)) mapped = "Daily";
          else if (/weekly|once a week/i.test(val)) mapped = "Weekly";
          else mapped = "One-time";
          try {
            await api.updateReminder(window.__pendingReminderId, {
              frequency: mapped,
            });
            setToast(`Set reminder to ${mapped}`);
            try {
              await speak(`Okay. I'll set that to ${mapped}`);
            } catch {}
            window.__pendingReminderId = null;
            // refresh schedule
            try {
              const today = await api.getScheduleToday();
              setScheduleItems(
                today.map((s) => ({
                  time: s.time,
                  title: s.task,
                  color: s.status === "completed" ? "#10B981" : "#3B82F6",
                }))
              );
            } catch {}
            try {
              window.dispatchEvent(new Event("reminders:updated"));
            } catch {}
            return true;
          } catch (e) {
            console.error("failed updating reminder frequency", e);
          }
        }
      } catch (e) {}
      // broadened confirmation phrases to include shorter and colloquial replies
      const confirmRegex =
        /\b(yes|yep|yeah|done|finished|completed|complete|mark(?: it| this)?|i (?:have )?(?:completed|finished|done)|i (?:just )?did it|ok(?:ay)?(?:,? mark it)?|sure|affirmative)\b/i;
      // If we're awaiting the scheduled follow-up confirmation, only accept yes/no/ok
      if (pendingAwaitingConfirmation) {
        const yesRegex = /\b(yes|yep|yeah|ok|okay)\b/i;
        const noRegex = /\b(no|nope|nah)\b/i;
        if (yesRegex.test(lower) && pendingConfirm) {
          await api.completeReminder(
            pendingConfirm.id
              ? { id: pendingConfirm.id }
              : { title: pendingConfirm.title }
          );
          setToast(`Marked "${pendingConfirm.title}" complete`);
          try {
            await speak(`Marked ${pendingConfirm.title} as complete`);
          } catch {}
          setPendingConfirm(null);
          pendingConfirmRef.current = null;
          if (pendingConfirmTimerRef.current) {
            clearTimeout(pendingConfirmTimerRef.current);
            pendingConfirmTimerRef.current = null;
          }
          setPendingAwaitingConfirmation(false);
          try {
            window.dispatchEvent(new Event("reminders:updated"));
          } catch {}
          return true;
        }
        if (noRegex.test(lower)) {
          setToast("Okay, I won't mark it complete.");
          setPendingAwaitingConfirmation(false);
          pendingConfirmRef.current = null;
          if (pendingConfirmTimerRef.current) {
            clearTimeout(pendingConfirmTimerRef.current);
            pendingConfirmTimerRef.current = null;
          }
          return true;
        }
        return false;
      }

      if (pendingConfirm && confirmRegex.test(lower)) {
        console.debug(
          "handleUserSpeech matched confirmation for",
          pendingConfirm
        );
        const payload = pendingConfirm.id
          ? { id: pendingConfirm.id }
          : { title: pendingConfirm.title };
        await api.completeReminder(payload);
        setToast(`Marked "${pendingConfirm.title}" complete`);
        try {
          await speak(`Marked ${pendingConfirm.title} as complete`);
        } catch {}
        try {
          const today = await api.getScheduleToday();
          setScheduleItems(
            today.map((s) => ({
              time: s.time,
              title: s.task,
              color: s.status === "completed" ? "#10B981" : "#3B82F6",
            }))
          );
        } catch {}
        try {
          window.dispatchEvent(new Event("reminders:updated"));
        } catch {}
        setPendingConfirm(null);
        return true;
      }
    } catch (e) {
      // swallow
    }
    return false;
  };

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setTimeout(async () => {
          await speak("Hello");
          try {
            if (!sessionStorage.getItem("moodShown")) setShowMood(true);
          } catch (e) {
            setShowMood(true);
          }
        }, 1000);
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startWebcam();
    return () => {
      if (videoRef.current?.srcObject) {
        for (const tr of videoRef.current.srcObject.getTracks()) tr.stop();
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const today = await api.getScheduleToday();
        const mapped = today
          .filter((s) => s.status !== "completed")
          .map((s) => ({
            id: s.id,
            time: s.time,
            title: s.task,
            color: "#3B82F6",
          }));
        setScheduleItems(mapped);
      } catch (e) {
        console.error("[v0] Failed loading reminders", e);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener("reminders:updated", handler);
    return () => window.removeEventListener("reminders:updated", handler);
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (pendingConfirmTimerRef.current) {
          clearTimeout(pendingConfirmTimerRef.current);
          pendingConfirmTimerRef.current = null;
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const tick = setInterval(async () => {
      try {
        const today = await api.getScheduleToday();
        const fmt = (s) => s.time;
        const now = new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        today.forEach((s) => {
          const key = `${s.id || s.task}@${s.time}`;
          if (
            fmt(s) === now &&
            !announcedIds.has(key) &&
            s.status !== "completed"
          ) {
            setAnnouncedIds((prev) => new Set(prev).add(key));
            // announce the reminder
            console.debug("Announcing reminder", s.id, s.time, s.task);
            speak(`It's ${s.time}. ${s.task}.`);
            // mark pending immediately so a quick voice reply can complete it
            const pc = { id: s.id, title: s.task };
            setPendingConfirm(pc);
            pendingConfirmRef.current = pc;
            console.debug(
              "pendingConfirm set for announced reminder",
              s.id,
              s.task
            );
            // schedule a follow-up in 60s to ask whether to mark complete
            try {
              if (pendingConfirmTimerRef.current) {
                clearTimeout(pendingConfirmTimerRef.current);
                pendingConfirmTimerRef.current = null;
              }
            } catch {}
            const _id = s.id;
            const _title = s.task;
            console.debug(
              "scheduling follow-up timer for",
              _id,
              _title,
              "in 60000ms"
            );
            pendingConfirmTimerRef.current = setTimeout(async () => {
              try {
                console.debug(
                  "follow-up timer fired for",
                  _id,
                  _title,
                  "pendingConfirmRef:",
                  pendingConfirmRef.current,
                  "pendingConfirm state:",
                  pendingConfirm,
                  "pendingAwaitingConfirmation:",
                  pendingAwaitingConfirmation
                );
                // ensure the pending confirm still matches this reminder
                const cur = pendingConfirmRef.current;
                if (!cur || cur.id !== _id) {
                  console.debug(
                    "follow-up aborted: pending mismatch or cleared",
                    cur
                  );
                  return;
                }
                setPendingAwaitingConfirmation(true);
                const prompt = `Would you like me to mark ${_title} as complete? Please say yes or no.`;
                setToast(prompt);
                console.debug(
                  "follow-up about to speak prompt for",
                  _id,
                  _title
                );
                try {
                  await speak(prompt);
                  console.debug("follow-up speak completed for", _id);
                } catch (e) {
                  console.debug("follow-up speak failed for", _id, e);
                }
              } catch (e) {
                console.debug("follow-up timer handler error", e);
              }
            }, 60000);
          }
        });
      } catch {}
    }, 30000); // check every 30s
    return () => clearInterval(tick);
  }, [announcedIds]);

  async function speak(text) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  };

  const captureFaces = async () => {
    const video = videoRef.current;
    if (!video) return [];
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    const cols = 4; // split into 4 vertical slices for left-to-right
    const sliceW = Math.floor(canvas.width / cols);
    const faces = [];
    for (let i = 0; i < cols; i++) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const c2 = document.createElement("canvas");
      c2.width = sliceW;
      c2.height = canvas.height;
      const cx = c2.getContext("2d");
      cx.drawImage(
        canvas,
        i * sliceW,
        0,
        sliceW,
        canvas.height,
        0,
        0,
        sliceW,
        canvas.height
      );
      faces.push({ x: i * sliceW, imageData: c2.toDataURL("image/png") });
    }
    return faces;
  };

  const completeScheduleItem = async (item) => {
    try {
      const payload = item.id ? { id: item.id } : { title: item.title };
      // use a stable key for this item (prefer id)
      const key = item.id ? item.id : `${item.time}@${item.title}`;
      // mark as in-flight so UI can disable the button
      setCompletingKeys((k) => [...k, key]);
      // optimistic UI: remove the item from the upcoming list immediately
      setScheduleItems((prev) =>
        prev.filter((i) => !(i.time === item.time && i.title === item.title))
      );
      setToast(`Marked "${item.title}" complete`);
      try {
        await speak(`Marked ${item.title} as complete`);
      } catch {}
      try {
        await api.completeReminder(payload);
      } catch (e) {
        // if API fails, reinstate the item and notify
        console.error("[v0] complete schedule item failed (API)", e);
        setToast("Failed to mark complete — please try again");
        // re-add the item back into scheduleItems (simple conservative approach)
        setScheduleItems((prev) => [
          { time: item.time, title: item.title, color: "#10B981" },
          ...prev,
        ]);
        return;
      } finally {
        // clear in-flight flag
        setCompletingKeys((k) => k.filter((x) => x !== key));
      }
      // refresh schedule and notify other views
      try {
        const today = await api.getScheduleToday();
        setScheduleItems(
          today
            .filter((s) => s.status !== "completed")
            .map((s) => ({
              id: s.id,
              time: s.time,
              title: s.task,
              color: s.status === "completed" ? "#10B981" : "#3B82F6",
            }))
        );
      } catch {}
      try {
        window.dispatchEvent(new Event("reminders:updated"));
      } catch {}
    } catch (e) {
      console.error("[v0] complete schedule item failed", e);
    }
  };

  const loadUnknownFaces = async () => {
    try {
      const faces = await api.getUnknownFaces();
      setUnknownFaces(faces);
      setUfIndex(0);
    } catch {}
  };

  const sidebarButtons = [
    {
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <polyline points="3,7 12,13 21,7" />
        </svg>
      ),
      label: "Email Family",
      action: async () => {
        setShowPhotos(false);
        setShowReminderForm(false);
        setShowGame(false);
        setShowMood(false);
        setShowUpcoming(false);
        setUpcomingMinimized(true);
        try {
          const cfg = await api.getEmailConfig();
          await api.sendEmail({
            to: cfg.primaryFamilyEmail,
            subject: "A quick hello",
            body: "This is a simulated email sent from the app.",
          });
          setToast("Mail sent to family");
          await speak("Family Alerted");
          await api.logActivity({
            icon: "✉️",
            title: "Email sent",
            description: `To ${cfg.primaryFamilyEmail}`,
            type: "Notification",
          });
        } catch {}
      },
    },
    {
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
      label: "View Photos",
      action: async () => {
        setShowReminderForm(false);
        setShowGame(false);
        setShowMood(false);
        setShowUpcoming(false);
        setUpcomingMinimized(true);
        await api.logActivity({
          icon: "🖼️",
          title: "Viewed photos",
          description: "Opened difficulty remembering window",
          type: "Interaction",
        });
        await loadUnknownFaces();
        setShowPhotos(true);
      },
    },
    {
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      label: "Set Reminder",
      action: async () => {
        setShowPhotos(false);
        setShowGame(false);
        setShowMood(false);
        setShowUpcoming(false);
        setUpcomingMinimized(true);
        await api.logActivity({
          icon: "🔔",
          title: "Reminder form opened",
          description: "",
          type: "Interaction",
        });
        setShowReminderForm(true);
      },
    },
    {
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="5" y="5" width="6" height="6" rx="1" />
          <rect x="13" y="5" width="6" height="6" rx="1" />
          <rect x="5" y="13" width="6" height="6" rx="1" />
          <rect x="13" y="13" width="6" height="6" rx="1" />
        </svg>
      ),
      label: "Brain Game",
      action: async () => {
        setShowPhotos(false);
        setShowReminderForm(false);
        setShowMood(false);
        setShowUpcoming(false);
        setUpcomingMinimized(true);
        await api.logActivity({
          icon: "🧩",
          title: "Started brain game",
          description: "",
          type: "Interaction",
        });
        setShowGame(true);
        const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];
        const answer = Math.floor(Math.random() * 4);
        setGSeq([answer]); // reuse gSeq to store answer index
        setGInput(colors); // reuse gInput to store choices (color palette)
        await speak("Tap the color that matches the label");
      },
    },
  ];

  const onAddReminder = async (e) => {
    e.preventDefault();
    if (!remTitle || !remTime) return;
    const payload = {
      title: remTitle,
      time: remTime,
      frequency: remFrequency,
      nextDue: `Today, ${remTime}`,
    };
    try {
      await api.addReminder(payload);
      setToast("Reminder set");
      await speak(`Reminder set for ${remTitle} at ${remTime}`);
      const today = await api.getScheduleToday();
      setScheduleItems(
        today
          .filter((s) => s.status !== "completed")
          .map((s) => ({
            id: s.id,
            time: s.time,
            title: s.task,
            color: "#3B82F6",
          }))
      );
      setShowReminderForm(false);
      setRemTitle("");
      setRemTime("");
      setRemRepeat(true);
    } catch (e) {
      console.error("[v0] add reminder failed", e);
    }
  };

  async function finalizePatientReminder(selected) {
    const payload = {
      title: remTitle,
      time: remTime,
      frequency: selected,
      nextDue: `Today, ${remTime}`,
    };
    try {
      // If this was created by the voice flow there may be a pending reminder id
      const pendingId = window.__pendingReminderId;
      if (pendingId) {
        await api.updateReminder(pendingId, { frequency: selected });
        try {
          window.dispatchEvent(new Event("reminders:updated"));
        } catch {}
        window.__pendingReminderId = null;
      } else {
        await api.addReminder(payload);
        try {
          window.dispatchEvent(new Event("reminders:updated"));
        } catch {}
      }
      setToast("Reminder set");
      await speak(`Reminder set for ${remTitle} at ${remTime}`);
      const today = await api.getScheduleToday();
      setScheduleItems(
        today
          .filter((s) => s.status !== "completed")
          .map((s) => ({
            id: s.id,
            time: s.time,
            title: s.task,
            color: "#3B82F6",
          }))
      );
      setShowReminderForm(false);
      setRemTitle("");
      setRemTime("");
      setRemRepeat(true);
      // removed repeat-confirm UI
    } catch (e) {
      console.error("[v0] finalize patient reminder failed", e);
    }
  }

  const onMoodPick = async (score) => {
    setShowMood(false);
    try {
      sessionStorage.setItem("moodShown", "1");
    } catch {}
    // notify other parts of the app (Overview) that mood changed
    try {
      const scaled = Math.max(0, Math.min(10, score * 2));
      window.dispatchEvent(
        new CustomEvent("mood:updated", {
          detail: { score: scaled, raw: score },
        })
      );
    } catch {}
    const scaled = Math.max(0, Math.min(10, score * 2));
    await api.logMood(scaled);
    await speak("Thank you");
    await api.logActivity({
      icon: "😊",
      title: "Mood selected",
      description: `Score ${scaled}/10`,
      type: "Emotion",
    });
  };

  const onEmergency = async () => {
    try {
      await api.addAlert({
        title: "Emergency Button Pressed",
        severity: "high",
        description: "Patient activated emergency button",
        status: "active",
      });
      setToast("Caregiver alert triggered");
      await speak("Caregiver Alerted");
      await api.logActivity({
        icon: "🚨",
        title: "Emergency Alert",
        description: "Pressed emergency button",
        type: "Emergency",
      });
    } catch (e) {
      console.error("[v0] emergency trigger failed", e);
    }
  };

  const checkGame = async (btn) => {
    const ni = [...gInput, btn];
    setGInput(ni);
    if (ni[ni.length - 1] !== gSeq[ni.length - 1]) {
      await speak("Try again");
      setGInput([]);
      return;
    }
    if (ni.length === gSeq.length) {
      await speak("Great job");
      setShowGame(false);
      await api.logActivity({
        icon: "🧠",
        title: "Brain game completed",
        type: "Activity",
      });
    }
  };

  return (
    <div className="patient-view">
      <video ref={videoRef} autoPlay playsInline className="webcam-feed" />

      <div className="view-switcher">
        <button className="view-btn active">Patient View</button>
        <button className="view-btn" onClick={onSwitchView}>
          Caregiver Dashboard
        </button>
      </div>

      <div className="sidebar">
        {sidebarButtons.map((btn, index) => (
          <button
            key={index}
            className="sidebar-btn"
            onClick={btn.action}
            title={btn.label}
          >
            <span className="btn-icon">{btn.icon}</span>
            <span className="btn-tooltip">{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="main-content">
        <h1 className="greeting">Hello</h1>
        <div className="date">
          {currentTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="time">
          {currentTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
        {showMood && (
          <div
            className="mood-overlay"
            style={{
              position: "absolute",
              top: 140,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="mood-text">How are you feeling?</div>
            <div className="mood-emojis" role="group" aria-label="Mood options">
              {[
                [1, "😞"],
                [2, "🙁"],
                [3, "😐"],
                [4, "🙂"],
                [5, "😄"],
              ].map(([score, emoji]) => (
                <button
                  key={score}
                  className="mood-emoji-btn"
                  onClick={async () => await onMoodPick(score)}
                  aria-label={`Select mood ${score}`}
                  title={`Score ${score}`}
                >
                  <span aria-hidden>{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!showUpcoming && (
        <button
          aria-label="Open Upcoming"
          onClick={async () => {
            setUpcomingMinimized(false);
            setShowUpcoming(true);
            setShowPhotos(false);
            setShowReminderForm(false);
            setShowGame(false);
            setShowMood(false);
            await api.logActivity({
              icon: "📅",
              title: "Opened Upcoming",
              description: "Opened via button",
              type: "Interaction",
            });
          }}
          className="schedule-bubble"
          style={{ position: "fixed", bottom: 48, right: 24 }}
          title="Upcoming"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      )}

      {showUpcoming && (
        <div className="upcoming-schedule mini-window" style={{ width: 300 }}>
          <div className="schedule-header mini-window-header">
            <h3>Upcoming</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                aria-label="Minimize Upcoming"
                onClick={() => {
                  setShowUpcoming(false);
                  setUpcomingMinimized(true);
                }}
                className="minimize-btn"
                title="Minimize"
              >
                &minus;
              </button>
            </div>
          </div>
          {scheduleItems.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              No upcoming items.
            </div>
          ) : (
            <div className="schedule-items">
              {scheduleItems.slice(0, 6).map((item) => (
                <div
                  key={item.id || `${item.time}@${item.title}`}
                  className="schedule-item"
                >
                  <div className="schedule-time">{item.time}</div>
                  <div
                    className="schedule-details"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      aria-hidden
                      className="schedule-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="schedule-title"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {item.title}
                    </span>
                    {(() => {
                      const itemKey = item.id
                        ? item.id
                        : `${item.time}@${item.title}`;
                      const inFlight = completingKeys.includes(itemKey);
                      return (
                        <button
                          onClick={async () => await completeScheduleItem(item)}
                          title={`Mark ${item.title} complete`}
                          disabled={inFlight}
                          style={{
                            background: inFlight ? "#9AE6B4" : "#10B981",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            padding: 0,
                            cursor: inFlight ? "default" : "pointer",
                            fontSize: 16,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: inFlight ? 0.7 : 1,
                          }}
                        >
                          {inFlight ? "…" : "✓"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <VoiceConsole
        onUserSpeech={handleUserSpeech}
        onResponse={async (res) => {
          if (!res) return;
          const action = res.uiAction || res.intent;

          // Quick-complete: if a reminder was just spoken and we have a pendingConfirm,
          // allow short confirmations ("yes", "mark it", "i completed this", "done")
          // to immediately complete the reminder without further prompts.
          try {
            const transcript = (res.transcript || "").toLowerCase();
            if (pendingConfirm) {
              const confirmRegex =
                /\b(mark (?:it|this)|i (?:have )?(?:completed|finished)|i (?:just )?did it|i(?:'| )?ll do it|i(?: )?will do it|yes|done|ok(?:ay)?(?:,? mark it)?)\b/i;
              if (
                action === "complete_reminder" ||
                confirmRegex.test(transcript)
              ) {
                // prefer id when available
                if (pendingConfirmTimerRef.current) {
                  clearTimeout(pendingConfirmTimerRef.current);
                  pendingConfirmTimerRef.current = null;
                }
                const payload = pendingConfirm.id
                  ? { id: pendingConfirm.id }
                  : { title: pendingConfirm.title };
                await api.completeReminder(payload);
                setToast(`Marked "${pendingConfirm.title}" complete`);
                try {
                  await speak(`Marked ${pendingConfirm.title} as complete`);
                } catch {}
                // refresh schedule and clear pending
                try {
                  const today = await api.getScheduleToday();
                  setScheduleItems(
                    today.map((s) => ({
                      time: s.time,
                      title: s.task,
                      color: s.status === "completed" ? "#10B981" : "#3B82F6",
                    }))
                  );
                } catch {}
                try {
                  window.dispatchEvent(new Event("reminders:updated"));
                } catch {}
                setPendingConfirm(null);
                return true;
              }
            }
          } catch (e) {
            console.error("quick-complete failed", e);
          }
          if (action === "open_photos") {
            setShowPhotos(true);
            setShowReminderForm(false);
            setShowGame(false);
            setShowUpcoming(false);
            setShowMood(false);
            await api.logActivity({
              icon: "🖼️",
              title: "Viewed photos",
              description: "Opened via voice",
              type: "Interaction",
            });
            await loadUnknownFaces();
            return true;
          }
          if (action === "play_brain_game") {
            setShowPhotos(false);
            setShowReminderForm(false);
            setShowMood(false);
            setShowUpcoming(false);
            await api.logActivity({
              icon: "🧩",
              title: "Started brain game",
              description: "Voice command",
              type: "Interaction",
            });
            setShowGame(true);
            const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];
            const answer = Math.floor(Math.random() * 4);
            setGSeq([answer]);
            setGInput(colors);
            return true;
          }
          if (action === "open_upcoming") {
            setShowUpcoming(true);
            setUpcomingMinimized(false);
            setShowPhotos(false);
            setShowReminderForm(false);
            setShowGame(false);
            setShowMood(false);
            await api.logActivity({
              icon: "📅",
              title: "Opened Upcoming",
              description: "Opened via voice",
              type: "Interaction",
            });
            return true;
          }
          if (action === "refresh_schedule") {
            try {
              const today = await api.getScheduleToday();
              setScheduleItems(
                today.map((s) => ({
                  time: s.time,
                  title: s.task,
                  color: s.status === "completed" ? "#10B981" : "#3B82F6",
                }))
              );
            } catch {}
            return;
          }
          // explicit transcript trigger: "open reminder" opens the form
          const _transcript = (res.transcript || "").toLowerCase();
          if (/\bopen (?:the )?reminder(?: form)?\b/i.test(_transcript)) {
            setShowPhotos(false);
            setShowGame(false);
            setShowMood(false);
            setShowUpcoming(false);
            setUpcomingMinimized(true);
            await api.logActivity({
              icon: "🔔",
              title: "Reminder form opened",
              description: "Opened via voice",
              type: "Interaction",
            });
            setShowReminderForm(true);
            return true;
          }

          // voice follow-up: ask_repeat -> do NOT open the reminder form; store pending id and prompt via toast/speech
          if (action === "ask_repeat") {
            const created = res.created || null;
            if (created) {
              // keep a pending id so a short follow-up like "daily" or "weekly" updates the reminder
              window.__pendingReminderId = created.id;
              // also set pendingConfirm so quick replies can complete it
              const pc2 = { id: created.id, title: created.title || "" };
              setPendingConfirm(pc2);
              pendingConfirmRef.current = pc2;
              setRemTitle(created.title || "");
              setRemTime(created.time || "");
              // refresh the schedule so the newly created reminder appears immediately
              try {
                const today = await api.getScheduleToday();
                setScheduleItems(
                  today.map((s) => ({
                    time: s.time,
                    title: s.task,
                    color: s.status === "completed" ? "#10B981" : "#3B82F6",
                  }))
                );
              } catch {}
              try {
                window.dispatchEvent(new Event("reminders:updated"));
              } catch {}
              // explicitly ask the user for repeat options (frontend prompt)
              const prompt =
                "Should this repeat daily, weekly, or be one-time?";
              setToast(prompt);
              console.debug(
                "ask_repeat prompt for created reminder",
                created.id,
                created.title
              );
              try {
                await speak(prompt);
              } catch {}
              // schedule follow-up in 60s to ask whether to mark complete (same as spoken reminders)
              try {
                if (pendingConfirmTimerRef.current) {
                  clearTimeout(pendingConfirmTimerRef.current);
                  pendingConfirmTimerRef.current = null;
                }
              } catch {}
              const _cid = created.id;
              const _ctitle = created.title || "";
              pendingConfirmTimerRef.current = setTimeout(async () => {
                try {
                  const cur = pendingConfirmRef.current;
                  if (!cur || cur.id !== _cid) return;
                  setPendingAwaitingConfirmation(true);
                  const prompt2 = `Would you like me to mark ${_ctitle} as complete? Please say yes or no.`;
                  setToast(prompt2);
                  try {
                    await speak(prompt2);
                  } catch {}
                } catch (e) {}
              }, 60000);
            }
            return true;
          }
          if (action === "show_identity" || res?.recognized) {
            setShowReminderForm(false);
            setShowGame(false);
            setShowUpcoming(false);
            setShowMood(false);
            setRecognizedPeople([]); // reset multi
            setRecognizedPerson(res.recognized || null);
            setShowPhotos(true);
            await api.logActivity({
              icon: "👥",
              title: "Recognized person",
              description: res?.recognized
                ? `${res.recognized.name} (${res.recognized.relation})`
                : "",
              type: "Face Recognition",
            });
            return true;
          }
          if (
            action === "show_identities" ||
            Array.isArray(res?.recognizedList)
          ) {
            setShowReminderForm(false);
            setShowGame(false);
            setShowUpcoming(false);
            setShowMood(false);
            setRecognizedPerson(null);
            setRecognizedPeople(res.recognizedList || []);
            setShowPhotos(true);
            await api.logActivity({
              icon: "👥",
              title: "Recognized multiple people",
              description: (res.recognizedList || [])
                .map((p) => p.name)
                .join(", "),
              type: "Face Recognition",
            });
            return true;
          }
        }}
        captureFrame={captureFrame}
        captureFaces={captureFaces}
      />

      <button className="emergency-btn" onClick={onEmergency}>
        EMERGENCY ALERT
      </button>

      {showPhotos && (
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 120,
            background: "rgba(15,23,42,0.95)",
            color: "white",
            padding: 16,
            borderRadius: 12,
            zIndex: 130,
            width: 340,
            border: "1px solid rgba(255,255,256,0.08)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              People you had difficulty remembering
            </div>
            <button
              onClick={() => {
                setShowPhotos(false);
                setRecognizedPerson(null);
                setRecognizedPeople([]);
              }}
              style={{ color: "#94a3b8" }}
            >
              Close
            </button>
          </div>

          {recognizedPerson && (
            <div
              style={{
                background: "#0b1220",
                border: "1px solid rgba(255,255,256,0.08)",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 6 }}>
                Known person
              </div>
              <div
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 8,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#020617",
                }}
              >
                <img
                  alt={`Photo of ${recognizedPerson.name}`}
                  src={recognizedPerson.imageUrl || "/placeholder.svg"}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                {recognizedPerson.name}{" "}
                <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                  ({recognizedPerson.relation})
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={() => setRecognizedPerson(null)}
                  style={{ color: "#cbd5e1" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {recognizedPeople.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 6 }}>
                Recognized people
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {recognizedPeople.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#0b1220",
                      border: "1px solid rgba(255,255,256,0.08)",
                      borderRadius: 10,
                      padding: 8,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 120,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#020617",
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        alt={`Photo of ${p.name}`}
                        src={p.imageUrl || "/placeholder.svg"}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {p.name}{" "}
                      <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                        ({p.relation})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unknownFaces.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              No unknown faces saved.
            </div>
          ) : (
            <>
              <div
                style={{
                  width: "100%",
                  height: 180,
                  background: "#0b1220",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  alt="Unknown face"
                  src={unknownFaces[ufIndex].imageData || "/placeholder.svg"}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                {unknownFaces[ufIndex].capturedAt}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <button
                  disabled={ufIndex === 0}
                  onClick={() => setUfIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>
                <button
                  disabled={ufIndex >= unknownFaces.length - 1}
                  onClick={() =>
                    setUfIndex((i) => Math.min(unknownFaces.length - 1, i + 1))
                  }
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showReminderForm && (
        <form
          onSubmit={onAddReminder}
          className="mini-form"
          style={{
            position: "absolute",
            top: 160,
            right: 24,
            background: "rgba(15,23,42,0.95)",
            color: "white",
            padding: 16,
            borderRadius: 12,
            zIndex: 140,
            width: 320,
            border: "1px solid rgba(255,255,256,0.08)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>New Reminder</div>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Title</label>
          <input
            value={remTitle}
            onChange={(e) => setRemTitle(e.target.value)}
            placeholder="Medication, Walk, Call..."
            style={{
              width: "100%",
              margin: "4px 0 12px 0",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,256,0.15)",
              background: "#0b1220",
              color: "#fff",
              outline: "none",
            }}
          />
          <label style={{ fontSize: 12, opacity: 0.85 }}>Time</label>
          <input
            type="time"
            value={remTime}
            onChange={(e) => setRemTime(e.target.value)}
            style={{
              width: "100%",
              margin: "4px 0 12px 0",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,256,0.15)",
              background: "#0b1220",
              color: "#fff",
              outline: "none",
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            <select
              value={remFrequency}
              onChange={(e) => setRemFrequency(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="Daily">Repeat daily</option>
              <option value="Weekly">Repeat weekly</option>
              <option value="One-time">One-time</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="submit"
              style={{
                background: "#3B82F6",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowReminderForm(false)}
              style={{
                background: "transparent",
                color: "#cbd5e1",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,256,0.15)",
              }}
            >
              Cancel
            </button>
          </div>
          {/* removed the repeat-confirm white box; use the frequency select + Save instead */}
        </form>
      )}

      {showGame && (
        <div
          className="mini-window"
          style={{
            position: "absolute",
            bottom: 120,
            left: 120,
            background: "rgba(15,23,42,0.95)",
            color: "white",
            padding: 16,
            borderRadius: 12,
            zIndex: 150,
            width: 260,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Color Match</div>
          <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.9 }}>
            Tap the color named below:
          </div>
          {/* label uses the same palette ordering as set in action */}
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#E2E8F0" }}>
            {["Green", "Blue", "Orange", "Red"][gSeq[0] ?? 0]}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 96px)",
              gap: 8,
            }}
          >
            {(Array.isArray(gInput)
              ? gInput
              : ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"]
            ).map((c, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  const correct = idx === (gSeq[0] ?? 0);
                  if (correct) {
                    await speak("Correct");
                    setShowGame(false);
                    await api.logActivity({
                      icon: "🧠",
                      title: "Brain game correct",
                      type: "Activity",
                    });
                  } else {
                    await speak("Try again");
                  }
                }}
                style={{
                  width: 96,
                  height: 64,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,256,0.12)",
                  background: c,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {toast && <div className="toast-bubble">{toast}</div>}
    </div>
  );
}

export default PatientView;
