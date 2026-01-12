export const db = {
  reminders: [
    {
      id: "r_morning_meds",
      icon: "💊",
      iconBg: "#FEF3F2",
      iconColor: "#EF4444",
      title: "Morning Medicine",
      tags: [
        { label: "medication", color: "#FEF2F2", textColor: "#DC2626" },
      ],
      description: "Take morning medication",
      time: "9:00 AM",
      frequency: "Daily",
      status: "active",
      nextDue: "Today, 9:00 AM",
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
    },
    {
      id: "r_daily_exercise",
      icon: "🏃",
      iconBg: "#F0FDF4",
      iconColor: "#16A34A",
      title: "Daily Exercise",
      tags: [
        { label: "activity", color: "#F0FDF4", textColor: "#16A34A" },
      ],
      description: "Daily exercise session",
      time: "10:00 AM",
      frequency: "Daily",
      status: "active",
      nextDue: "Today, 10:00 AM",
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
    },
    {
      id: "r_doctor_weekly",
      icon: "👨‍⚕️",
      iconBg: "#F3E8FF",
      iconColor: "#9333EA",
      title: "Doctor's Appointment",
      tags: [
        { label: "appointment", color: "#F3E8FF", textColor: "#9333EA" },
      ],
      description: "Weekly doctor's appointment",
      time: "3:00 PM",
      frequency: "Weekly",
      status: "active",
      nextDue: "This week, 3:00 PM",
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
    },
    {
      id: "r_evening_walk",
      icon: "🚶",
      iconBg: "#F0FDF4",
      iconColor: "#16A34A",
      title: "Evening Walk",
      tags: [
        { label: "activity", color: "#F0FDF4", textColor: "#16A34A" },
      ],
      description: "Evening walk",
      time: "5:00 PM",
      frequency: "Daily",
      status: "active",
      nextDue: "Today, 5:00 PM",
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
    },
    {
      id: "r_night_meds",
      icon: "💊",
      iconBg: "#FEF3F2",
      iconColor: "#EF4444",
      title: "Nighttime Medicine",
      tags: [
        { label: "medication", color: "#FEF2F2", textColor: "#DC2626" },
      ],
      description: "Take nighttime medication",
      time: "9:00 PM",
      frequency: "Daily",
      status: "active",
      nextDue: "Today, 9:00 PM",
      createdAt: Date.now() - 1000 * 60 * 60 * 36,
    },
  ],

  // start with no seeded alerts so counts reflect live events
  alerts: [],
  activity: [
    // Real-time logs will be inserted here dynamically
  ],
  family: [
    {
      id: "f_mahak",
      name: "Mahak",
      relation: "Friend",
      lastSeen: "Added today",
      recognitionRate: "80%",
      trainingPhotos: "2 photos",
      email: "mahakmodani26@gmail.com",
      photoUrl: "/images/family/Mahak1.jpg",
      primary: true,
      trainingImages: [
        "/images/family/Mahak1.jpg",
        "/images/family/Mahak2.jpg",
      ],
    },
    {
      id: "f_mythri",
      name: "Mythri",
      relation: "Friend",
      lastSeen: "Added today",
      recognitionRate: "78%",
      trainingPhotos: "2 photos",
      email: "my3ace@gmail.com",
      photoUrl: "/images/family/Mythri1.jpg",
      trainingImages: [
        "/images/family/Mythri1.jpg",
        "/images/family/Mythri2.jpg",
      ],
      primary: false,
    },
    {
      id: "f_ridhi",
      name: "Ridhi",
      relation: "Friend",
      lastSeen: "Added today",
      recognitionRate: "76%",
      trainingPhotos: "2 photos",
      email: "ridhibairi@gmail.com",
      photoUrl: "/images/family/Ridhi3.jpg",
      trainingImages: [
        "/images/family/Ridhi2.jpg",
        "/images/family/Ridhi3.jpg",
      ],
      primary: false,
    },
    {
      id: "f_divya",
      name: "Divya",
      relation: "Friend",
      lastSeen: "Added today",
      recognitionRate: "77%",
      trainingPhotos: "2 photos",
      email: "divya.mathi@gmail.com",
      photoUrl: "/images/family/Divya3.jpg",
      trainingImages: [
        "/images/family/Divya2.jpg",
        "/images/family/Divya3.jpg",
      ],
      primary: false,
    },
  ],
  recognitions: [
    {
      id: "rr1",
      name: "Sarah Johnson",
      time: "14:30",
      confidence: "98%",
      status: "success",
    },
    {
      id: "rr2",
      name: "Unknown Person",
      time: "13:15",
      confidence: "45%",
      status: "unknown",
    },
    {
      id: "rr3",
      name: "Michael Johnson",
      time: "11:45",
      confidence: "95%",
      status: "success",
    },
    {
      id: "rr4",
      name: "Dr. Robert Smith",
      time: "10:20",
      confidence: "92%",
      status: "success",
    },
    {
      id: "rr5",
      name: "Emma Wilson",
      time: "09:15",
      confidence: "89%",
      status: "success",
    },
  ],
  // mood starts at 0 until the user logs their first mood selection
  mood: {
    average: 0,
    todaySeries: [],
  },
  scheduleToday: [
    { time: "10:00 AM", task: "Exercise Time", status: "pending" },
    { time: "1:00 PM", task: "Lunch", status: "pending" },
    { time: "2:00 PM", task: "Call Sarah", status: "pending" },
    { time: "3:00 PM", task: "Doctor Appointment", status: "pending" },
    { time: "3:30 PM", task: "Afternoon Snack", status: "pending" },
    { time: "6:00 PM", task: "Evening Medication", status: "pending" },
  ],
  emailConfig: {
    caregiverEmail: "caregiver@example.com",
    primaryFamilyEmail: "mahakmodani26@gmail.com",
  },
  emailOutbox: [],
  unknownFaces: [
    // { id, imageData, capturedAt }
  ],
};

export function nextId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
