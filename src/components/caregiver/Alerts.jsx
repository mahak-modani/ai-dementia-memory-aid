"use client"

import { useEffect, useState } from "react"
import "./Alerts.css"
import { api } from "../../api/client"

function Alerts() {
  const [recentAlerts, setRecentAlerts] = useState([])
  const [stats, setStats] = useState({ active: 0, acknowledged: 0, resolved: 0 })

  useEffect(() => {
    async function load() {
      try {
        const [alerts, s] = await Promise.all([api.getAlerts(), api.getAlertStats()])
        setRecentAlerts(alerts.filter((a) => a.severity === "high"))
        setStats(s)
      } catch (e) {
        console.error("[v0] load alerts failed", e)
      }
    }
    load()
  }, [])

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>Emergency Alerts Log</h1>
        <p>Only high-severity alerts are shown</p>
      </div>

      {/* Stats header - only Active and Resolved, wide like reminders */}
      <div className="alert-stats-row" style={{ marginBottom: 12 }}>
        <div className="reminder-stat-card wide">
          <div className="reminder-stat-label">Active</div>
          <div className="reminder-stat-value" style={{ color: "#EF4444" }}>
            {stats.active}
          </div>
        </div>
        <div className="reminder-stat-card wide">
          <div className="reminder-stat-label">Resolved</div>
          <div className="reminder-stat-value" style={{ color: "#10B981" }}>
            {stats.resolved}
          </div>
        </div>
      </div>

      <div className="recent-alerts-section">
        <div className="alerts-list">
          {recentAlerts.map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.severity} ${alert.status}`}>
              <div className="alert-item-header">
                <div className="alert-item-title">
                  <span className="alert-icon">🚩</span>
                  <span>{alert.title}</span>
                  <span className={`alert-badge ${alert.severity}`}>{alert.severity.toUpperCase()}</span>
                </div>
              </div>

              {/* status pill positioned at top-right of the card (aligned with resolve) */}
              <span className={`alert-status-pill ${alert.status}`}>{alert.status}</span>

              <p className="alert-description">{alert.description}</p>

              <div className="alert-footer">
                <span className="alert-time">{alert.time}</span>
                {/* Resolve button (styled) aligned vertically with status pill */}
                {alert.status !== "resolved" && (
                  <div className="right-actions">
                    <button
                      onClick={async () => {
                        await api.resolveAlert(alert.id)
                        const [alerts, s] = await Promise.all([api.getAlerts(), api.getAlertStats()])
                        setRecentAlerts(alerts.filter((a) => a.severity === "high"))
                        setStats(s)
                      }}
                      className="alert-resolve-btn"
                      title="Mark resolved"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {recentAlerts.length === 0 && <div style={{ color: "#64748b" }}>No emergency alerts.</div>}
        </div>
      </div>
    </div>
  )
}

export default Alerts
