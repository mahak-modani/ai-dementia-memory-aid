"use client"

import { useState, useEffect } from "react"
import Overview from "./caregiver/Overview"
import ActivityLog from "./caregiver/ActivityLog"
import FamilyFaces from "./caregiver/FamilyFaces"
import Reminders from "./caregiver/Reminders"
import Alerts from "./caregiver/Alerts"
import Settings from "./caregiver/Settings"
import "./CaregiverDashboard.css"

function CaregiverDashboard({ onSwitchView }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [activeRemindersCount, setActiveRemindersCount] = useState(null)
  const [activeAlertsCount, setActiveAlertsCount] = useState(null)

  useEffect(() => {
    let mounted = true
    import("../api/client").then(({ api }) => {
      api
        .getReminders("active")
        .then((list) => {
          if (mounted) setActiveRemindersCount((list && list.length) || 0)
        })
        .catch(() => {})
    })
    return () => (mounted = false)
  }, [])

  useEffect(() => {
    let mounted = true
    import("../api/client").then(({ api }) => {
      api
        .getAlertStats()
        .then((s) => {
          if (mounted) setActiveAlertsCount((s && s.active) || 0)
        })
        .catch(() => {})
    })
    return () => (mounted = false)
  }, [])
  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "activity", label: "Activity Log", icon: "📈" },
    { id: "family", label: "Family & Faces", icon: "👥" },
    { id: "reminders", label: `Reminders${activeRemindersCount != null ? ` (${activeRemindersCount})` : ""}`, icon: "🔔" },
  { id: "alerts", label: `Alerts${activeAlertsCount != null ? ` (${activeAlertsCount})` : ""}`, icon: "⚠️" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview />
      case "activity":
        return <ActivityLog />
      case "family":
        return <FamilyFaces />
      case "reminders":
        return <Reminders />
      case "alerts":
        return <Alerts />
      case "settings":
        return <Settings />
      default:
        return <Overview />
    }
  }

  return (
    <div className="caregiver-dashboard">
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="logo-icon" aria-label="ReMindly logo">
            <div className="logo-box">
              <img className="logo-img" src="/images/logo.png" alt="ReMindly" />
            </div>
          </div>
          <div className="logo-text">
            <h1>ReMindly</h1>
            <p>Caregiver Dashboard</p>
          </div>
        </div>
        <div className="view-switcher-caregiver">
          <button className="view-btn-caregiver" onClick={onSwitchView}>
            Patient View
          </button>
          <button className="view-btn-caregiver active">Caregiver Dashboard</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">{renderContent()}</main>
    </div>
  )
}

export default CaregiverDashboard
