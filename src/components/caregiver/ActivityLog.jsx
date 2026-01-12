"use client";

import "./ActivityLog.css";
import { useEffect, useState } from "react";
import { api } from "../../api/client";

function ActivityLog() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getActivity();
        setActivities(data);
      } catch (e) {
        console.error("[v0] load activity failed", e);
      }
    }
    load();
  }, []);

  return (
    <div className="activity-log">
      <div className="activity-log-header">
        <h1>Activity Log</h1>
        <p>Detailed log of all patient interactions and system events</p>
      </div>

      <div className="activity-filters">
        <div className="filter-group">
          <label>Date</label>
          <input type="date" />
        </div>
        <div className="filter-group">
          <label>Filter by Type</label>
          <select>
            <option>All Types</option>
            <option>Face Recognition</option>
            <option>Voice Interaction</option>
            <option>Reminder</option>
            <option>Emotion Detection</option>
            <option>Emergency</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input type="text" placeholder="Search events..." />
        </div>
        <button
          className="export-btn"
          onClick={() => {
            try {
              // Build CSV: id,time,title,description,type,icon,confidence
              const rows = [];
              const header = [
                "id",
                "time",
                "title",
                "description",
                "type",
                "icon",
                "confidence",
              ];
              rows.push(header.join(","));
              for (const a of activities) {
                const escape = (v) => {
                  if (v === null || v === undefined) return "";
                  const s = String(v);
                  // escape double quotes
                  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                  return s;
                };
                rows.push(
                  [
                    escape(a.id),
                    escape(a.time),
                    escape(a.title),
                    escape(a.description),
                    escape(a.type),
                    escape(a.icon),
                    escape(a.confidence || ""),
                  ].join(",")
                );
              }
              const csv = rows.join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const now = new Date();
              const pad = (n) => String(n).padStart(2, "0");
              const fname = `ReMindly_${now.getFullYear()}-${pad(
                now.getMonth() + 1
              )}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(
                now.getMinutes()
              )}-${pad(now.getSeconds())}.csv`;
              // create link and download
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = fname;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error("Export failed", e);
              alert("Export failed: " + (e && e.message ? e.message : e));
            }
          }}
        >
          Export Log
        </button>
      </div>

      <div className="activity-events">
        <h3>Activity Events ({activities.length})</h3>
        <div className="events-list">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="event-item"
              style={{
                backgroundColor: activity.bgColor,
                borderLeftColor: activity.borderColor,
              }}
            >
              <div className="event-icon">{activity.icon}</div>
              <div className="event-content">
                <div className="event-header">
                  <h4>{activity.title}</h4>
                  {activity.confidence && (
                    <span className="event-confidence">
                      {activity.confidence}
                    </span>
                  )}
                </div>
                <p className="event-description">{activity.description}</p>
              </div>
              <div className="event-meta">
                <div className="event-time">{activity.time}</div>
                <div className="event-type">{activity.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActivityLog;
