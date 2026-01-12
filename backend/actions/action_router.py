from backend.actions.reminder_manager import ReminderManager
from backend.actions.relationship_cueing import RelationshipCueing
from backend.actions.emergency_handler import EmergencyHandler
from backend.voice_interaction.tts_output import TTSOutput

class ActionRouter:
    """
    Routes intents to appropriate action modules and coordinates responses.
    """

    def __init__(self, db_client, smtp_config):
        self.reminder_manager = ReminderManager(db_client)
        self.relationship_cueing = RelationshipCueing(db_client)
        self.emergency_handler = EmergencyHandler(db_client, smtp_config)
        self.tts = TTSOutput()

    def route_action(self, intent, entities, emotion, patient_id, face_encoding=None):
        """
        Route intent to appropriate action and generate response.
        Returns: (success, response_text, action_taken)
        """
        action_map = {
            'set_reminder': self._handle_reminder,
            'who_is_this': self._handle_identity,
            'emergency_alert': self._handle_emergency,
            'where_is_object': self._handle_object_location,
            'daily_summary': self._handle_daily_summary,
            'small_talk': self._handle_small_talk,
            'memory_training': self._handle_memory_training
        }

        handler = action_map.get(intent, self._handle_unknown)

        try:
            success, response = handler(entities, emotion, patient_id, face_encoding)

            if emotion in ['stressed', 'distressed']:
                is_emergency, severity = self.emergency_handler.detect_emergency(
                    entities.get('raw_text', ''),
                    emotion
                )
                if is_emergency and intent != 'emergency_alert':
                    self.emergency_handler.trigger_alert(
                        patient_id,
                        severity,
                        f"Detected {emotion} emotion during {intent}",
                        entities.get('raw_text')
                    )

            return success, response, intent

        except Exception as e:
            print(f"Error routing action: {e}")
            return False, "I'm having trouble with that request. Could you try again?", 'error'

    def _handle_reminder(self, entities, emotion, patient_id, face_encoding):
        """Handle reminder creation."""
        reminder, response = self.reminder_manager.create_reminder(entities, patient_id)
        return reminder is not None, response

    def _handle_identity(self, entities, emotion, patient_id, face_encoding):
        """Handle person identification."""
        if not face_encoding:
            return False, "I need to see someone's face to identify them. Please look at the person."

        person, cue_message = self.relationship_cueing.identify_person(face_encoding, patient_id)
        return person is not None, cue_message

    def _handle_emergency(self, entities, emotion, patient_id, face_encoding):
        """Handle emergency alert."""
        success, response = self.emergency_handler.trigger_alert(
            patient_id,
            'critical',
            'User-initiated emergency alert',
            entities.get('raw_text')
        )
        return success, response

    def _handle_object_location(self, entities, emotion, patient_id, face_encoding):
        """Handle object location queries."""
        obj = entities.get('object')
        if not obj:
            return False, "What are you looking for?"

        response = f"Let me help you find your {obj}. Check the usual places like the table or your room."
        return True, response

    def _handle_daily_summary(self, entities, emotion, patient_id, face_encoding):
        """Handle daily summary request."""
        interactions = self.relationship_cueing.get_recent_interactions(patient_id, limit=5)
        reminders = self.reminder_manager.get_reminders(patient_id)

        if not interactions and not reminders:
            return True, "You haven't had any recorded interactions today yet."

        summary = "Here's what happened today. "

        if interactions:
            summary += f"You met with {len(interactions)} people. "
            for interaction in interactions[:3]:
                if 'family_members' in interaction:
                    name = interaction['family_members']['name']
                    summary += f"You saw {name}. "

        completed_reminders = [r for r in reminders if r.get('completed')]
        if completed_reminders:
            summary += f"You completed {len(completed_reminders)} reminders. "

        return True, summary

    def _handle_small_talk(self, entities, emotion, patient_id, face_encoding):
        """Handle general conversation."""
        responses = [
            "I'm here to help you. What do you need?",
            "How are you feeling today?",
            "Is there anything I can help you with?",
            "I'm always here if you need me."
        ]

        text = entities.get('raw_text', '').lower()

        if 'how are you' in text:
            return True, "I'm doing well, thank you for asking. How are you feeling?"
        elif 'thank' in text:
            return True, "You're very welcome!"
        elif 'hello' in text or 'hi' in text:
            return True, "Hello! How can I help you today?"
        elif 'goodbye' in text or 'bye' in text:
            return True, "Goodbye! I'll be here if you need me."

        return True, responses[0]

    def _handle_memory_training(self, entities, emotion, patient_id, face_encoding):
        """Handle memory training requests."""
        return True, "Let's practice together. I'll show you some familiar faces and you can tell me who they are."

    def _handle_unknown(self, entities, emotion, patient_id, face_encoding):
        """Handle unrecognized intents."""
        return False, "I'm not sure I understood that. Could you say it again?"

    def speak_response(self, response, emotion=None):
        """
        Speak response using TTS with emotion awareness.
        """
        if emotion:
            self.tts.speak_with_emotion(response, emotion)
        else:
            self.tts.speak(response)
