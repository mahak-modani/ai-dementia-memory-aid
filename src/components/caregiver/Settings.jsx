"use client"

import { useState, useEffect } from "react"
import "./Settings.css"
import { api } from "../../api/client"

function Settings() {
  const [notificationSettings, setNotificationSettings] = useState({
    emergencyAlerts: true,
    medicationReminders: true,
    moodChanges: true,
    dailySummary: true,
    emailNotifications: true,
  })

  const [privacySettings, setPrivacySettings] = useState({
    faceRecognition: true,
    voiceRecording: true,
    emotionDetection: true,
    dataSharing: false,
    locationTracking: true,
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    offlineMode: false,
  })

  const [voiceVolume, setVoiceVolume] = useState(75)
  const [motionSensitivity, setMotionSensitivity] = useState(60)
  const [emailCfg, setEmailCfg] = useState({ caregiverEmail: "", primaryFamilyEmail: "" })
  const [caregiverEmail, setCaregiverEmail] = useState("")
  const [editingCaregiver, setEditingCaregiver] = useState(false)

  const toggleNotification = (key) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const togglePrivacy = (key) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSystem = (key) => {
    setSystemSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await api.getEmailConfig()
        setEmailCfg(cfg)
        setCaregiverEmail(cfg.caregiverEmail || "")
      } catch {}
    })()
  }, [])

  const saveCaregiverEmail = async (email) => {
    try {
      await api.setEmailConfig({ caregiverEmail: email })
      setEmailCfg((prev) => ({ ...prev, caregiverEmail: email }))
    } catch (e) {
      console.error("Failed saving caregiver email", e)
    }
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure system preferences and privacy settings</p>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon notification-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h2>Notification Settings</h2>
          </div>

          <div className="settings-options">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Emergency Alerts</div>
                <div className="setting-description">Instant alerts for emergency situations</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.emergencyAlerts}
                  onChange={() => toggleNotification("emergencyAlerts")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Medication Reminders</div>
                <div className="setting-description">Notifications for missed medications</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.medicationReminders}
                  onChange={() => toggleNotification("medicationReminders")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Mood Changes</div>
                <div className="setting-description">Alerts for significant mood changes</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.moodChanges}
                  onChange={() => toggleNotification("moodChanges")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Daily Summary</div>
                <div className="setting-description">End-of-day activity summary</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.dailySummary}
                  onChange={() => toggleNotification("dailySummary")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Email Notifications</div>
                <div className="setting-description">Email notifications to caregivers</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={() => toggleNotification("emailNotifications")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon privacy-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2>Privacy & Security</h2>
          </div>

          <div className="settings-options">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Face Recognition</div>
                <div className="setting-description">Enable facial recognition features</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={privacySettings.faceRecognition}
                  onChange={() => togglePrivacy("faceRecognition")}
                />
                <span className="toggle-slider green"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Voice Recording</div>
                <div className="setting-description">Allow voice interaction recording</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={privacySettings.voiceRecording}
                  onChange={() => togglePrivacy("voiceRecording")}
                />
                <span className="toggle-slider green"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Emotion Detection</div>
                <div className="setting-description">Monitor emotional state</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={privacySettings.emotionDetection}
                  onChange={() => togglePrivacy("emotionDetection")}
                />
                <span className="toggle-slider green"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Data Sharing</div>
                <div className="setting-description">Share anonymized data for research</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={privacySettings.dataSharing}
                  onChange={() => togglePrivacy("dataSharing")}
                />
                <span className="toggle-slider green"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Location Tracking</div>
                <div className="setting-description">Track location for safety features</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={privacySettings.locationTracking}
                  onChange={() => togglePrivacy("locationTracking")}
                />
                <span className="toggle-slider green"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card full-width">
        <div className="settings-card-header">
          <div className="settings-icon system-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
          </div>
          <h2>System Configuration</h2>
        </div>

        <div className="system-config-grid">
          <div className="system-config-left">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Auto Backup</div>
                <div className="setting-description">Automatically backup system data</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={systemSettings.autoBackup}
                  onChange={() => toggleSystem("autoBackup")}
                />
                <span className="toggle-slider purple"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Offline Mode</div>
                <div className="setting-description">Enable offline functionality</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={systemSettings.offlineMode}
                  onChange={() => toggleSystem("offlineMode")}
                />
                <span className="toggle-slider purple"></span>
              </label>
            </div>

            {/* Inline caregiver email below Offline Mode */}
            <div className="setting-item inline-email-row">
              <div className="setting-info">
                <div className="setting-title">Caregiver Email</div>
                <div className="setting-description">Primary caregiver contact email (editable)</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!editingCaregiver ? (
                  <>
                    <div className="email-text">{caregiverEmail || "(not set)"}</div>
                    <button
                      className="email-edit-btn"
                      onClick={() => setEditingCaregiver(true)}
                      title="Edit caregiver email"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <input
                    type="email"
                    autoFocus
                    value={caregiverEmail}
                    onChange={(e) => setCaregiverEmail(e.target.value)}
                    onBlur={async () => {
                      setEditingCaregiver(false)
                      await saveCaregiverEmail(caregiverEmail)
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        setEditingCaregiver(false)
                        await saveCaregiverEmail(caregiverEmail)
                      }
                      if (e.key === "Escape") {
                        setEditingCaregiver(false)
                      }
                    }}
                    className="mini-input"
                    style={{ width: 240 }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="system-config-right">
            <div className="slider-setting">
              <div className="slider-header">
                <div className="slider-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </div>
                <div className="slider-title">Voice Volume</div>
              </div>
              <div className="slider-container">
                <span className="slider-label">0</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="range-slider"
                />
                <span className="slider-label">100</span>
              </div>
              <div className="slider-value">{voiceVolume}%</div>
            </div>

            <div className="slider-setting">
              <div className="slider-header">
                <div className="slider-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                </div>
                <div className="slider-title">Motion Sensitivity</div>
              </div>
              <div className="slider-container">
                <span className="slider-label">Low</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={motionSensitivity}
                  onChange={(e) => setMotionSensitivity(Number(e.target.value))}
                  className="range-slider"
                />
                <span className="slider-label">High</span>
              </div>
              <div className="slider-value">{motionSensitivity}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Email configuration moved inline under system config - removed separate card */}

      <div className="settings-actions">
        <button className="btn-save">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Settings
        </button>
        <button className="btn-reset">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset to Default
        </button>
      </div>

      <div className="settings-card full-width data-management">
        <h2>Data Management</h2>
        <div className="data-actions">
          <button className="data-btn export-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <div>
              <div className="data-btn-title">Export Data</div>
              <div className="data-btn-description">Download all patient data</div>
            </div>
          </button>

          <button className="data-btn clear-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <div>
              <div className="data-btn-title">Clear Cache</div>
              <div className="data-btn-description">Clear temporary files</div>
            </div>
          </button>

          <button className="data-btn reset-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <div>
              <div className="data-btn-title">Factory Reset</div>
              <div className="data-btn-description">Reset all settings</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
