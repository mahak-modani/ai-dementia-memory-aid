"use client";

import "./Overview.css";
import { useEffect, useState } from "react";
import { api } from "../../api/client";

function Overview() {
  const [stats, setStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  useEffect(() => {
    async function loadOverview() {
      try {
        const data = await api.getOverview();
        setStats(data.stats);
        setRecentActivity(data.recentActivity);
        setTodaySchedule(data.todaySchedule);
      } catch (e) {
        console.error("[v0] load overview failed", e);
      }
    }
    loadOverview();
    const t = setInterval(loadOverview, 5000);

    const onMood = () => {
      // refresh immediately when mood is picked
      loadOverview().catch(() => {});
    };
    try {
      window.addEventListener("mood:updated", onMood);
    } catch {}

    return () => {
      clearInterval(t);
      try {
        window.removeEventListener("mood:updated", onMood);
      } catch {}
    };
  }, []);

  return (
    <div className="overview">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: `${stat.color}20` }}
            >
              {index === 0 && "✓"}
              {index === 1 && "👥"}
              {index === 2 && "😊"}
              {index === 3 && "⚠️"}
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              {stat.progress != null && (
                <div className="stat-progress">
                  <div
                    className="stat-progress-bar"
                    style={{
                      width: `${stat.progress}%`,
                      backgroundColor: stat.color,
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h2 className="card-title">Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div
                key={activity.id || index}
                className={`activity-item complete`}
              >
                <div className="activity-time">{activity.time}</div>
                <div className="activity-details">
                  <div className="activity-text">{activity.title}</div>
                  <span className="activity-type">{activity.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h2 className="card-title">Today's Schedule</h2>
          <div className="schedule-list">
            {todaySchedule.map((item, index) => (
              <div key={index} className={`schedule-row ${item.status}`}>
                <div className="schedule-time">{item.time}</div>
                <div
                  className={`schedule-task ${
                    item.status === "completed" ? "completed" : ""
                  }`}
                >
                  {item.task}
                </div>
                {item.status === "completed" && (
                  <span className="status-badge completed">✓</span>
                )}
                {item.status === "in-progress" && (
                  <span className="status-badge in-progress">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Overview;
