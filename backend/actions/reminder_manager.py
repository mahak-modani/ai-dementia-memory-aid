from datetime import datetime
import uuid

class ReminderManager:
    """
    Manages reminders for patients including creation, retrieval, and completion tracking.
    """

    def __init__(self, db_client):
        self.db = db_client

    def create_reminder(self, entities, patient_id):
        """
        Create a new reminder from extracted entities.
        Returns: reminder object and response message
        """
        task = entities.get('task', 'Task')
        time = entities.get('time')
        date = entities.get('date', datetime.now().strftime('%Y-%m-%d'))

        if not time:
            return None, "I need a time for the reminder. When should I remind you?"

        reminder_id = str(uuid.uuid4())

        reminder_data = {
            'id': reminder_id,
            'patient_id': patient_id,
            'task': task,
            'time': time,
            'date': date,
            'completed': False,
            'created_at': datetime.now().isoformat(),
            'status': 'active'
        }

        try:
            result = self.db.table('reminders').insert(reminder_data).execute()
            response = f"Reminder set for {task} at {time} on {date}."
            return result.data[0], response
        except Exception as e:
            print(f"Error creating reminder: {e}")
            return None, "I had trouble creating that reminder. Please try again."

    def get_reminders(self, patient_id, date=None):
        """
        Get all reminders for a patient, optionally filtered by date.
        Returns: list of reminders
        """
        try:
            query = self.db.table('reminders').select('*').eq('patient_id', patient_id)

            if date:
                query = query.eq('date', date)

            result = query.eq('status', 'active').order('time').execute()
            return result.data
        except Exception as e:
            print(f"Error fetching reminders: {e}")
            return []

    def get_upcoming_reminders(self, patient_id, limit=5):
        """
        Get upcoming reminders for today.
        Returns: list of upcoming reminders
        """
        today = datetime.now().strftime('%Y-%m-%d')
        reminders = self.get_reminders(patient_id, date=today)

        current_time = datetime.now().strftime('%H:%M')
        upcoming = [r for r in reminders if r['time'] >= current_time and not r['completed']]

        return upcoming[:limit]

    def mark_completed(self, reminder_id):
        """
        Mark a reminder as completed.
        Returns: success boolean and message
        """
        try:
            result = self.db.table('reminders').update({
                'completed': True,
                'completed_at': datetime.now().isoformat()
            }).eq('id', reminder_id).execute()

            return True, "Reminder marked as completed."
        except Exception as e:
            print(f"Error completing reminder: {e}")
            return False, "Could not mark reminder as completed."

    def delete_reminder(self, reminder_id):
        """
        Delete a reminder.
        Returns: success boolean and message
        """
        try:
            result = self.db.table('reminders').update({
                'status': 'deleted'
            }).eq('id', reminder_id).execute()

            return True, "Reminder deleted."
        except Exception as e:
            print(f"Error deleting reminder: {e}")
            return False, "Could not delete reminder."

    def get_missed_reminders(self, patient_id):
        """
        Get reminders that were not completed on time.
        Returns: list of missed reminders
        """
        today = datetime.now().strftime('%Y-%m-%d')
        current_time = datetime.now().strftime('%H:%M')

        try:
            result = self.db.table('reminders').select('*').eq('patient_id', patient_id).eq('date', today).eq('completed', False).execute()

            missed = [r for r in result.data if r['time'] < current_time]
            return missed
        except Exception as e:
            print(f"Error fetching missed reminders: {e}")
            return []
