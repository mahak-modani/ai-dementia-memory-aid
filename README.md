# ReMindly

### An AI-Powered Cognitive Companion for Dementia Patients

ReMindly is a **privacy-first, multimodal AI assistant** designed to support individuals living with dementia by helping them recognize people, remember tasks, regulate emotions, and stay safe — all while maintaining dignity and independence.

The system runs **locally (edge-based)** and combines **face recognition, voice interaction, emotion analysis, object recognition, and contextual reasoning** into one integrated assistant.

---

##  Problem Background

People with dementia often struggle with:

* Forgetting names and relationships
* Missing medications and daily tasks
* Emotional distress and confusion
* Difficulty recognizing familiar people or objects
* Safety risks (wandering, panic, emergencies)

Existing assistants provide **generic reminders** but lack **personalization, emotional awareness, and therapeutic reinforcement**.

---

## Our Solution: ReMindly

ReMindly is an **AI-first cognitive support system** that assists users using **voice, vision, and emotional cues** to provide real-time help and long-term memory reinforcement.

---

## Core Features

### Face Recognition with Relationship Cueing

* Identifies known individuals via camera
* Speaks relationship-aware cues

  > “This is your daughter Meera.”
* Logs social interactions for caregiver review

### Conversational Voice Assistant

* Speech-to-Text (Whisper / Vosk)
* Text-to-Speech (pyttsx3 / gTTS)
* Supports commands like:

  * “Who is this?”
  * “Remind me to take my medicine at 6 PM”

### Smart Reminder System

* Voice-based scheduling and alerts
* Medication, meals, appointments
* End-of-day spoken summary:

  > “You met Ravi and took your medicine.”

### Emotion & Stress Detection

* Voice-based stress analysis (SER)
* Detects calm, stressed, confused, distressed states
* Emotion-aware responses and caregiver alerts

### Object Recognition + Anchored Reminders

* Detects familiar objects (pillbox, glasses, keys)
* Triggers contextual reminders

  > “That is your pillbox for your 2 PM medicine.”

### Adaptive Familiarity Training

* Personalized quizzes using faces & objects
* Reinforces weak memory associations
* Tracks progress and adapts difficulty

### Emergency Detection & Safety Nudges

* Detects phrases like “help me”
* Emotion + intent fusion for escalation
* Gentle contextual nudges:

  > “It’s late, should we head home?”

### Caregiver Dashboard

* Upload faces & relationships
* Manage reminders
* View emotional trends & interaction logs

---

## System Architecture (High-Level)

```text
User Voice / Camera
        ↓
Speech-to-Text  ──→  Intent Recognition (NLU)
        ↓                    ↓
Voice Emotion Analysis     Action Routing
        ↓                    ↓
      Context Engine (Intent + Emotion + Time + Objects)
        ↓
Text-to-Speech Response
        ↓
Logs → Caregiver Dashboard
```

---

## 📂 Project Folder Structure

```text
MemoryAid/
│
├── app/
│   ├── face_recognition/
│   ├── voice_interaction/
│   ├── reminder_system/
│   ├── emotion_detection/
│   ├── object_recognition/
│   ├── adaptive_training/
│   ├── emergency_alert/
│   ├── context_engine/
│   ├── dashboard/
│   ├── config/
│   └── main.py
│
├── data/
│   ├── faces/
│   ├── embeddings/
│   ├── reminders/
│   ├── interaction_logs/
│   ├── mood_logs/
│   └── training_sessions/
│
├── models/
│   ├── face_recognition/
│   ├── emotion_detection/
│   ├── speech_models/
│   └── object_detection/
│
├── tests/
├── docs/
├── requirements.txt
├── package.json
└── README.md
```

---

## Tech Stack

| Component         | Technology                          |
| ----------------- | ----------------------------------- |
| Face Recognition  | OpenCV, FaceNet / face_recognition  |
| Speech-to-Text    | Whisper (offline) / Vosk            |
| Text-to-Speech    | pyttsx3 / gTTS                      |
| Emotion Detection | librosa + SER model                 |
| Object Detection  | MobileNet / YOLO (edge-friendly)    |
| Backend           | Flask                               |
| Database          | SQLite                              |
| Frontend          | React                               |
| Deployment        | Raspberry Pi / Laptop / Edge Device |

---

##  Installation & Setup

### 1️ Clone the Repository

```bash
git clone https://github.com/your-username/MemoryAid.git
cd MemoryAid
```

### 2️ Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 3️ Install Dependencies

```bash
pip install -r requirements.txt
```

### 4️ Run the System

```bash
python app/main.py
```

---

##  Testing

Run individual module tests:

```bash
pytest tests/
```

---

##  Roadmap

✔ Face recognition with relationship cues
✔ Voice assistant with reminders
✔ Emotion-aware responses
✔ Emergency phrase detection
✔ Object-based reminders
✔ Daily retrospective digest
⬜ Offline-first optimization
⬜ Clinical pilot testing

---

##  Expected Impact

### Patients

* Reduced anxiety
* Improved social confidence
* Stronger memory reinforcement

### Caregivers

* Peace of mind
* Actionable emotional insights
* Simplified care management

### Healthcare

* Scalable, low-cost cognitive support
* Beyond reminders → **therapeutic AI assistance**

---

## 🏁 Vision

**To empower individuals with cognitive challenges to live safer, fuller, and more connected lives — by placing empathetic, privacy-first AI at their side, 24/7.**


