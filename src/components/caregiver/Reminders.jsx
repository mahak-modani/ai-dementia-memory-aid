"use client";

import { useState, useEffect } from "react";
import "./Reminders.css";
import { api } from "../../api/client";

function Reminders() {
  const [activeTab, setActiveTab] = useState("active");
  const [data, setData] = useState({ active: [], completed: [], missed: [] });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false);

  async function loadAll() {
    try {
      const [active, completed, missed] = await Promise.all([
        api.getReminders("active"),
        api.getReminders("completed"),
        api.getReminders("missed"),
      ]);
      setData({ active, completed, missed });
    } catch (e) {
      console.error("[v0] load reminders failed", e);
    }
  }
  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener("reminders:updated", handler);
    return () => window.removeEventListener("reminders:updated", handler);
  }, []);

  async function addReminder(e) {
    e.preventDefault();
    if (!title || !time) return;
    // show follow-up repeat confirmation if not already confirmed
    if (!showRepeatConfirm) {
      setShowRepeatConfirm(true);
      return;
    }
    // if confirmation already shown and user pressed Save again, finalize with current frequency
    try {
      await api.addReminder({ title, time, frequency, nextDue: `Today, ${time}` });
      setTitle("");
      setTime("");
      setFrequency("Daily");
      setShowForm(false);
      setShowRepeatConfirm(false);
      await loadAll();
    } catch (e) {
      console.error("[v0] add reminder failed", e);
    }
  }

  async function finalizeAddReminder(selectedFrequency) {
    try {
      await api.addReminder({
        title,
        time,
        frequency: selectedFrequency,
        nextDue: `Today, ${time}`,
      });
      setTitle("");
      setTime("");
      setFrequency("Daily");
      setShowForm(false);
      setShowRepeatConfirm(false);
      // notify other UI that reminders changed
      try {
        window.dispatchEvent(new Event("reminders:updated"));
      } catch {}
      await loadAll();
    } catch (e) {
      console.error("[v0] finalize add reminder failed", e);
    }
  }

  async function deleteReminder(id) {
    if (!confirm("Delete this reminder?")) return;
    try {
      await api.deleteReminder(id);
      await loadAll();
    } catch (e) {
      console.error("[v0] delete reminder failed", e);
    }
  }

  const stats = [
    {
      label: "Active",
      value: String(data.active.length),
      icon: "⏰",
      color: "#3B82F6",
    },
    {
      label: "Completed Today",
      value: String(data.completed.length),
      icon: "✓",
      color: "#10B981",
    },
    {
      label: "Missed",
      value: String(data.missed.length),
      icon: "✕",
      color: "#EF4444",
    },
  ];

  const currentReminders = data[activeTab] || [];

  return (
    <div className="reminders">
      <div className="reminders-header">
        <div>
          <h1>Reminder Management</h1>
          <p>Create and manage reminders for daily tasks and appointments</p>
        </div>
        <button className="add-reminder-btn" onClick={() => setShowForm(true)}>
          + Add Reminder
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={addReminder}
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 1fr",
              gap: 8,
            }}
          >
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{ padding: 6, borderRadius: 6 }}
              >
                <option value="Daily">Repeat daily</option>
                <option value="Weekly">Repeat weekly</option>
                <option value="One-time">One-time</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>

          {showRepeatConfirm && (
            <div style={{ marginTop: 8, padding: 8, background: "#fff", color: "#0f172a", borderRadius: 6 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Repeat reminder?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => finalizeAddReminder("Daily")}>Daily</button>
                <button type="button" onClick={() => finalizeAddReminder("Weekly")}>Weekly</button>
                <button type="button" onClick={() => finalizeAddReminder("One-time")}>Only today</button>
                <button type="button" onClick={() => setShowRepeatConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </form>
      )}

      <div className="reminder-stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="reminder-stat-card">
            <div className="reminder-stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="reminder-stat-content">
              <div className="reminder-stat-label">{stat.label}</div>
              <div
                className="reminder-stat-value"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="reminders-content">
        <div className="reminders-tabs">
          <button
            className={`reminder-tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active ({data.active.length})
          </button>
          <button
            className={`reminder-tab ${
              activeTab === "completed" ? "active" : ""
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({data.completed.length})
          </button>
          <button
            className={`reminder-tab ${activeTab === "missed" ? "active" : ""}`}
            onClick={() => setActiveTab("missed")}
          >
            Missed ({data.missed.length})
          </button>
        </div>

        <div className="reminders-list">
          {currentReminders.map((reminder) => (
            <div key={reminder.id} className="reminder-card">
              <div
                className="reminder-icon"
                style={{
                  backgroundColor: reminder.iconBg,
                  color: reminder.iconColor,
                }}
              >
                {reminder.icon}
              </div>
              <div className="reminder-content">
                <div className="reminder-title-row">
                  <h3>{reminder.title}</h3>
                  <div className="reminder-tags">
                    {(reminder.tags || []).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="reminder-tag"
                        style={{
                          backgroundColor: tag.color,
                          color: tag.textColor,
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="reminder-description">{reminder.description}</p>
                <div className="reminder-meta">
                  <span className="reminder-meta-item">{reminder.time}</span>
                  <span className="reminder-meta-item">
                    {reminder.frequency}
                  </span>
                  <span className="reminder-meta-item">
                    {reminder.nextDue ||
                      reminder.completedAt ||
                      reminder.missedAt}
                  </span>
                </div>
              </div>
              <div className="reminder-actions">
                <button
                  className="action-icon-btn"
                  title="Delete"
                  onClick={() => deleteReminder(reminder.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reminders;
