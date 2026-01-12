from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
import os
from dotenv import load_dotenv
import base64
import numpy as np
import face_recognition

from backend.voice_interaction.voice_capture import VoiceCapture
from backend.emotion_recognition.voice_stress_analysis import VoiceEmotionAnalyzer
from backend.nlp.intent_classifier import IntentClassifier
from backend.nlp.entity_extractor import EntityExtractor
from backend.actions.action_router import ActionRouter

load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SMTP_CONFIG = {
    'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
    'smtp_port': int(os.getenv('SMTP_PORT', 587)),
    'sender_email': os.getenv('SENDER_EMAIL'),
    'password': os.getenv('SENDER_PASSWORD')
}

voice_capture = VoiceCapture()
emotion_analyzer = VoiceEmotionAnalyzer()
intent_classifier = IntentClassifier()
entity_extractor = EntityExtractor()
action_router = ActionRouter(supabase, SMTP_CONFIG)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Memory Aid Backend is running'})

@app.route('/api/voice/transcribe', methods=['POST'])
def transcribe_voice():
    """
    Transcribe audio file to text
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        audio_path = f'data/audio/temp_{audio_file.filename}'
        audio_file.save(audio_path)

        transcript = voice_capture.transcribe_audio(audio_path)

        return jsonify({
            'success': True,
            'transcript': transcript,
            'audio_path': audio_path
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emotion/analyze', methods=['POST'])
def analyze_emotion():
    """
    Analyze emotion from audio file
    """
    try:
        data = request.json
        audio_path = data.get('audio_path')

        if not audio_path:
            return jsonify({'error': 'No audio path provided'}), 400

        emotion = emotion_analyzer.predict_emotion(audio_path)

        result = supabase.table('mood_logs').insert({
            'patient_id': data.get('patient_id'),
            'emotion': emotion,
            'confidence': 0.8,
            'context': data.get('context', '')
        }).execute()

        return jsonify({
            'success': True,
            'emotion': emotion
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/intent/classify', methods=['POST'])
def classify_intent():
    """
    Classify user intent from text
    """
    try:
        data = request.json
        text = data.get('text', '')

        intent, confidence = intent_classifier.predict_with_confidence(text)

        return jsonify({
            'success': True,
            'intent': intent,
            'confidence': confidence
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/entities/extract', methods=['POST'])
def extract_entities():
    """
    Extract entities from text
    """
    try:
        data = request.json
        text = data.get('text', '')

        entities = entity_extractor.extract_all(text)

        return jsonify({
            'success': True,
            'entities': entities
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice/process', methods=['POST'])
def process_voice():
    """
    Complete voice processing pipeline: transcription -> emotion -> intent -> action
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        audio_path = f'data/audio/temp_{audio_file.filename}'
        audio_file.save(audio_path)

        patient_id = request.form.get('patient_id')

        transcript = voice_capture.transcribe_audio(audio_path)
        emotion = emotion_analyzer.predict_emotion(audio_path)
        intent, confidence = intent_classifier.predict_with_confidence(transcript)
        entities = entity_extractor.extract_all(transcript)

        success, response, action_taken = action_router.route_action(
            intent,
            entities,
            emotion,
            patient_id
        )

        supabase.table('activity_log').insert({
            'patient_id': patient_id,
            'activity_type': 'voice_command',
            'description': f'{intent}: {transcript}',
            'metadata': {
                'emotion': emotion,
                'intent': intent,
                'confidence': confidence
            }
        }).execute()

        return jsonify({
            'success': True,
            'transcript': transcript,
            'emotion': emotion,
            'intent': intent,
            'response': response,
            'action_taken': action_taken
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/recognize', methods=['POST'])
def recognize_face():
    """
    Recognize face from image and provide relationship cue
    """
    try:
        data = request.json
        patient_id = data.get('patient_id')
        image_data = data.get('image')

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_image)
        if not face_locations:
            return jsonify({'success': False, 'message': 'No face detected'})

        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        if not face_encodings:
            return jsonify({'success': False, 'message': 'Could not encode face'})

        person, cue_message = action_router.relationship_cueing.identify_person(
            face_encodings[0],
            patient_id
        )

        return jsonify({
            'success': True,
            'person': person,
            'message': cue_message,
            'face_location': face_locations[0]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders', methods=['GET', 'POST'])
def manage_reminders():
    """
    Get or create reminders for a patient
    """
    try:
        if request.method == 'GET':
            patient_id = request.args.get('patient_id')
            reminders = action_router.reminder_manager.get_reminders(patient_id)
            return jsonify({'success': True, 'reminders': reminders})

        elif request.method == 'POST':
            data = request.json
            patient_id = data.get('patient_id')
            entities = {
                'task': data.get('task'),
                'time': data.get('time'),
                'date': data.get('date')
            }

            reminder, response = action_router.reminder_manager.create_reminder(entities, patient_id)

            return jsonify({
                'success': reminder is not None,
                'reminder': reminder,
                'message': response
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<reminder_id>/complete', methods=['POST'])
def complete_reminder(reminder_id):
    """Mark reminder as completed"""
    try:
        success, message = action_router.reminder_manager.mark_completed(reminder_id)
        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/family-members', methods=['GET', 'POST'])
def manage_family_members():
    """
    Get or add family members for a patient
    """
    try:
        if request.method == 'GET':
            patient_id = request.args.get('patient_id')
            members = action_router.relationship_cueing.get_family_members(patient_id)
            return jsonify({'success': True, 'members': members})

        elif request.method == 'POST':
            data = request.json
            patient_id = data.get('patient_id')
            name = data.get('name')
            relationship = data.get('relationship')
            photo_url = data.get('photo_url')
            notes = data.get('notes')

            image_data = data.get('image')
            if image_data:
                image_bytes = base64.b64decode(image_data.split(',')[1])
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                face_encodings = face_recognition.face_encodings(rgb_image)
                if face_encodings:
                    face_encoding = face_encodings[0]
                else:
                    return jsonify({'error': 'No face detected in image'}), 400
            else:
                face_encoding = None

            success, message = action_router.relationship_cueing.add_family_member(
                patient_id,
                name,
                relationship,
                face_encoding,
                photo_url,
                notes
            )

            return jsonify({'success': success, 'message': message})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get alerts for a patient"""
    try:
        patient_id = request.args.get('patient_id')
        alerts = action_router.emergency_handler.get_active_alerts(patient_id)
        return jsonify({'success': True, 'alerts': alerts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts/<alert_id>/resolve', methods=['POST'])
def resolve_alert(alert_id):
    """Resolve an alert"""
    try:
        data = request.json
        resolved_by = data.get('resolved_by')
        success = action_router.emergency_handler.resolve_alert(alert_id, resolved_by)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/activity', methods=['GET'])
def get_activity():
    """Get activity log for a patient"""
    try:
        patient_id = request.args.get('patient_id')
        result = supabase.table('activity_log').select('*').eq('patient_id', patient_id).order('timestamp', desc=True).limit(50).execute()
        return jsonify({'success': True, 'activities': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    os.makedirs('data/audio', exist_ok=True)
    os.makedirs('data/tts_output', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
