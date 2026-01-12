"use client"

import "./MoodTracking.css"
import { useEffect, useState } from "react"
import { api } from "../../api/client"

function MoodTracking() {
  const [mood, setMood] = useState({ average: 0, todaySeries: [] })

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getMood()
        setMood(data)
      } catch (e) {
        console.error("[v0] load mood failed", e)
      }
    }
    load()
  }, [])

  return (
    <div className="mood-tracking">
      <div className="mood-header">
        <h1>Mood Tracking</h1>
        <p>Monitor emotional well-being and mood patterns</p>
      </div>

      <div className="mood-card" style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Average Today</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{mood.average?.toFixed(1)}/10</div>
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>Today</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, mood.todaySeries.length)}, 1fr)`,
            gap: 8,
            marginTop: 8,
          }}
        >
          {mood.todaySeries.map((p) => (
            <div key={p.t} style={{ display: "flex", alignItems: "end", gap: 6 }}>
              <div
                title={`${p.score}/10`}
                style={{ width: 10, height: `${p.score * 8}px`, background: "#3B82F6", borderRadius: 4 }}
              ></div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{p.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MoodTracking
