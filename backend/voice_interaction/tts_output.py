import pyttsx3
import os
from datetime import datetime

class TTSOutput:
    """
    Text-to-speech output for patient interactions.
    """

    def __init__(self, rate=150, volume=0.9):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', rate)
        self.engine.setProperty('volume', volume)

        voices = self.engine.getProperty('voices')
        if voices:
            self.engine.setProperty('voice', voices[0].id)

        self.audio_dir = 'data/tts_output'
        os.makedirs(self.audio_dir, exist_ok=True)

    def speak(self, text):
        """
        Speak text aloud immediately.
        """
        try:
            self.engine.say(text)
            self.engine.runAndWait()
        except Exception as e:
            print(f"TTS error: {e}")

    def save_to_file(self, text, filename=None):
        """
        Save TTS output to audio file.
        Returns: path to audio file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tts_{timestamp}.wav"

        filepath = os.path.join(self.audio_dir, filename)

        try:
            self.engine.save_to_file(text, filepath)
            self.engine.runAndWait()
            return filepath
        except Exception as e:
            print(f"Error saving TTS file: {e}")
            return None

    def speak_with_emotion(self, text, emotion):
        """
        Adjust speech parameters based on emotion context.
        """
        if emotion == 'stressed' or emotion == 'emergency':
            self.engine.setProperty('rate', 130)
            self.engine.setProperty('volume', 1.0)
        elif emotion == 'calm':
            self.engine.setProperty('rate', 140)
            self.engine.setProperty('volume', 0.8)
        else:
            self.engine.setProperty('rate', 150)
            self.engine.setProperty('volume', 0.9)

        self.speak(text)

        self.engine.setProperty('rate', 150)
        self.engine.setProperty('volume', 0.9)

    def set_voice_properties(self, rate=None, volume=None, voice_index=None):
        """
        Configure TTS voice properties.
        """
        if rate:
            self.engine.setProperty('rate', rate)
        if volume:
            self.engine.setProperty('volume', volume)
        if voice_index is not None:
            voices = self.engine.getProperty('voices')
            if voice_index < len(voices):
                self.engine.setProperty('voice', voices[voice_index].id)

    def get_available_voices(self):
        """
        Get list of available TTS voices.
        Returns: list of voice names
        """
        voices = self.engine.getProperty('voices')
        return [voice.name for voice in voices]

    def stop(self):
        """
        Stop current speech immediately.
        """
        try:
            self.engine.stop()
        except Exception as e:
            print(f"Error stopping TTS: {e}")
