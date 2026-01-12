from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmergencyHandler:
    """
    Handles emergency detection and caregiver notifications via email.
    """

    def __init__(self, db_client, smtp_config):
        self.db = db_client
        self.smtp_config = smtp_config

    def detect_emergency(self, transcript, emotion):
        """
        Detect if user input indicates an emergency.
        Returns: (is_emergency, severity_level)
        """
        emergency_keywords = {
            'critical': ['help', 'emergency', 'urgent', 'ambulance', 'hospital', 'pain', 'hurt', 'fallen', 'fall'],
            'high': ['scared', 'afraid', 'confused', 'lost', 'dizzy', 'cant breathe', 'chest'],
            'medium': ['worried', 'nervous', 'uncomfortable', 'unwell', 'sick']
        }

        text_lower = transcript.lower()

        for severity, keywords in emergency_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return True, severity

        if emotion in ['stressed', 'distressed']:
            return True, 'medium'

        return False, None

    def trigger_alert(self, patient_id, severity, context, transcript=None):
        """
        Trigger emergency alert and notify caregivers.
        Returns: success boolean and message
        """
        try:
            alert_data = {
                'patient_id': patient_id,
                'severity': severity,
                'context': context,
                'transcript': transcript,
                'timestamp': datetime.now().isoformat(),
                'status': 'active',
                'resolved': False
            }

            result = self.db.table('alerts').insert(alert_data).execute()
            alert = result.data[0]

            caregivers = self.get_caregivers(patient_id)
            for caregiver in caregivers:
                self.send_email_alert(caregiver, alert)

            response = "I've notified your caregiver. Help is on the way."
            return True, response

        except Exception as e:
            print(f"Error triggering alert: {e}")
            return False, "I'm having trouble sending the alert. Please call for help."

    def send_email_alert(self, caregiver, alert):
        """
        Send email notification to caregiver.
        """
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config['sender_email']
            msg['To'] = caregiver['email']
            msg['Subject'] = f"ALERT: {alert['severity'].upper()} - Memory Aid Emergency"

            body = f"""
            Emergency Alert from Memory Aid System

            Patient: {caregiver.get('patient_name', 'Patient')}
            Severity: {alert['severity'].upper()}
            Time: {alert['timestamp']}
            Context: {alert['context']}

            {f"Patient said: {alert['transcript']}" if alert.get('transcript') else ''}

            Please check on the patient immediately.

            ---
            Memory Aid System
            """

            msg.attach(MIMEText(body, 'plain'))

            with smtplib.SMTP(self.smtp_config['smtp_server'], self.smtp_config['smtp_port']) as server:
                server.starttls()
                server.login(self.smtp_config['sender_email'], self.smtp_config['password'])
                server.send_message(msg)

            print(f"Email alert sent to {caregiver['email']}")
        except Exception as e:
            print(f"Error sending email: {e}")

    def get_caregivers(self, patient_id):
        """
        Get all caregivers for a patient.
        Returns: list of caregivers with contact info
        """
        try:
            result = self.db.table('caregivers').select('*').eq('patient_id', patient_id).eq('notifications_enabled', True).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching caregivers: {e}")
            return []

    def log_alert(self, patient_id, alert_type, details):
        """
        Log an alert event for tracking.
        """
        try:
            log_data = {
                'patient_id': patient_id,
                'alert_type': alert_type,
                'details': details,
                'timestamp': datetime.now().isoformat()
            }

            self.db.table('alert_logs').insert(log_data).execute()
        except Exception as e:
            print(f"Error logging alert: {e}")

    def resolve_alert(self, alert_id, resolved_by=None):
        """
        Mark an alert as resolved.
        Returns: success boolean
        """
        try:
            self.db.table('alerts').update({
                'resolved': True,
                'resolved_at': datetime.now().isoformat(),
                'resolved_by': resolved_by,
                'status': 'resolved'
            }).eq('id', alert_id).execute()

            return True
        except Exception as e:
            print(f"Error resolving alert: {e}")
            return False

    def get_active_alerts(self, patient_id):
        """
        Get all active alerts for a patient.
        Returns: list of active alerts
        """
        try:
            result = self.db.table('alerts').select('*').eq('patient_id', patient_id).eq('status', 'active').order('timestamp', desc=True).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching alerts: {e}")
            return []
