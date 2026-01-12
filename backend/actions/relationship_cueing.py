from datetime import datetime
import face_recognition
import numpy as np

class RelationshipCueing:
    """
    Provides relationship-aware identity cues for recognized faces.
    """

    def __init__(self, db_client):
        self.db = db_client

    def identify_person(self, face_encoding, patient_id):
        """
        Identify a person from face encoding and provide relationship context.
        Returns: (person_info, cue_message)
        """
        try:
            result = self.db.table('family_members').select('*').eq('patient_id', patient_id).execute()

            if not result.data:
                return None, "I don't recognize this person yet."

            best_match = None
            best_distance = 1.0

            for person in result.data:
                if not person.get('face_encoding'):
                    continue

                stored_encoding = np.array(person['face_encoding'])
                distance = face_recognition.face_distance([stored_encoding], face_encoding)[0]

                if distance < best_distance and distance < 0.6:
                    best_distance = distance
                    best_match = person

            if not best_match:
                return None, "I don't recognize this person. Would you like to add them?"

            self.log_interaction(patient_id, best_match['id'])

            cue_message = self.build_cue_message(best_match)
            return best_match, cue_message

        except Exception as e:
            print(f"Error identifying person: {e}")
            return None, "I'm having trouble recognizing faces right now."

    def build_cue_message(self, person):
        """
        Build a relationship-aware cue message.
        Returns: message string
        """
        name = person.get('name', 'someone')
        relationship = person.get('relationship', 'a person you know')
        last_interaction = person.get('last_interaction')

        message = f"This is {name}, your {relationship}."

        if last_interaction:
            try:
                last_date = datetime.fromisoformat(last_interaction)
                days_ago = (datetime.now() - last_date).days

                if days_ago == 0:
                    message += f" You saw {name} earlier today."
                elif days_ago == 1:
                    message += f" You saw {name} yesterday."
                elif days_ago < 7:
                    message += f" You last saw {name} {days_ago} days ago."
            except:
                pass

        notes = person.get('notes')
        if notes:
            message += f" {notes}"

        return message

    def log_interaction(self, patient_id, family_member_id):
        """
        Log an interaction between patient and family member.
        """
        try:
            interaction_data = {
                'patient_id': patient_id,
                'family_member_id': family_member_id,
                'timestamp': datetime.now().isoformat(),
                'interaction_type': 'face_recognition'
            }

            self.db.table('interactions').insert(interaction_data).execute()

            self.db.table('family_members').update({
                'last_interaction': datetime.now().isoformat()
            }).eq('id', family_member_id).execute()

        except Exception as e:
            print(f"Error logging interaction: {e}")

    def add_family_member(self, patient_id, name, relationship, face_encoding, photo_url=None, notes=None):
        """
        Add a new family member to the system.
        Returns: success boolean and message
        """
        try:
            member_data = {
                'patient_id': patient_id,
                'name': name,
                'relationship': relationship,
                'face_encoding': face_encoding.tolist() if isinstance(face_encoding, np.ndarray) else face_encoding,
                'photo_url': photo_url,
                'notes': notes,
                'created_at': datetime.now().isoformat()
            }

            result = self.db.table('family_members').insert(member_data).execute()
            return True, f"Added {name} as your {relationship}."
        except Exception as e:
            print(f"Error adding family member: {e}")
            return False, "Could not add this person. Please try again."

    def get_family_members(self, patient_id):
        """
        Get all family members for a patient.
        Returns: list of family members
        """
        try:
            result = self.db.table('family_members').select('*').eq('patient_id', patient_id).order('name').execute()
            return result.data
        except Exception as e:
            print(f"Error fetching family members: {e}")
            return []

    def get_recent_interactions(self, patient_id, limit=10):
        """
        Get recent interactions for daily digest.
        Returns: list of interactions with person details
        """
        try:
            result = self.db.table('interactions').select('*, family_members(name, relationship)').eq('patient_id', patient_id).order('timestamp', desc=True).limit(limit).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching interactions: {e}")
            return []
