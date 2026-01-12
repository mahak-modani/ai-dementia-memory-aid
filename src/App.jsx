"use client";

import { useEffect, useState } from "react";
import PatientView from "./components/PatientView";
import CaregiverDashboard from "./components/CaregiverDashboard";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("patient");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "ReMindly";
    }
  }, []);

  return (
    <div className="app">
      {currentView === "patient" ? (
        <PatientView onSwitchView={() => setCurrentView("caregiver")} />
      ) : (
        <CaregiverDashboard onSwitchView={() => setCurrentView("patient")} />
      )}
    </div>
  );
}

export default App;
