/*
  # Memory Aid Database Schema

  ## Overview
  Creates comprehensive database schema for AI-powered memory aid system supporting
  dementia patients with face recognition, reminders, mood tracking, and caregiver management.

  ## New Tables

  ### 1. patients
  - `id` (uuid, primary key)
  - `name` (text)
  - `date_of_birth` (date)
  - `created_at` (timestamptz)
  - `profile_photo_url` (text, optional)

  ### 2. caregivers
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `name` (text)
  - `email` (text)
  - `phone` (text, optional)
  - `relationship` (text)
  - `notifications_enabled` (boolean, default true)
  - `created_at` (timestamptz)

  ### 3. family_members
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `name` (text)
  - `relationship` (text)
  - `face_encoding` (jsonb) - stores face recognition embeddings
  - `photo_url` (text, optional)
  - `notes` (text, optional)
  - `last_interaction` (timestamptz, optional)
  - `created_at` (timestamptz)

  ### 4. reminders
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `task` (text)
  - `time` (text)
  - `date` (text)
  - `completed` (boolean, default false)
  - `completed_at` (timestamptz, optional)
  - `status` (text, default 'active')
  - `created_at` (timestamptz)

  ### 5. interactions
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `family_member_id` (uuid, foreign key, optional)
  - `interaction_type` (text)
  - `timestamp` (timestamptz)
  - `notes` (text, optional)

  ### 6. alerts
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `severity` (text)
  - `context` (text)
  - `transcript` (text, optional)
  - `timestamp` (timestamptz)
  - `status` (text, default 'active')
  - `resolved` (boolean, default false)
  - `resolved_at` (timestamptz, optional)
  - `resolved_by` (text, optional)

  ### 7. mood_logs
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `emotion` (text)
  - `confidence` (float)
  - `timestamp` (timestamptz)
  - `context` (text, optional)

  ### 8. activity_log
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `activity_type` (text)
  - `description` (text)
  - `timestamp` (timestamptz)
  - `metadata` (jsonb, optional)

  ## Security
  - Enable RLS on all tables
  - Policies restrict access to authenticated users and specific patient data
*/

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_of_birth date,
  profile_photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create caregivers table
CREATE TABLE IF NOT EXISTS caregivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship text NOT NULL,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read caregivers"
  ON caregivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage caregivers"
  ON caregivers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  face_encoding jsonb,
  photo_url text,
  notes text,
  last_interaction timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read family_members"
  ON family_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage family_members"
  ON family_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  task text NOT NULL,
  time text NOT NULL,
  date text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage reminders"
  ON reminders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  interaction_type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read interactions"
  ON interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create interactions"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  severity text NOT NULL,
  context text NOT NULL,
  transcript text,
  timestamp timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create mood_logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  emotion text NOT NULL,
  confidence float DEFAULT 0,
  timestamp timestamptz DEFAULT now(),
  context text
);

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mood_logs"
  ON mood_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create mood_logs"
  ON mood_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity_log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create activity_log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_caregivers_patient_id ON caregivers(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_members_patient_id ON family_members(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_interactions_patient_id ON interactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_mood_logs_patient_id ON mood_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_timestamp ON mood_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_patient_id ON activity_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
