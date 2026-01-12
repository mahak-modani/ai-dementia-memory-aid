import pyaudio
import wave
import os
from datetime import datetime
import whisper

class VoiceCapture:
    """
    Captures audio from microphone and converts to text using Whisper.
    """

    def __init__(self, model_size='base'):
        self.model = whisper.load_model(model_size)
        self.audio_dir = 'data/audio'
        os.makedirs(self.audio_dir, exist_ok=True)

    def record_audio(self, duration=5, sample_rate=16000, channels=1, chunk=1024):
        """
        Record audio from microphone for specified duration.
        Returns: path to saved audio file
        """
        p = pyaudio.PyAudio()

        stream = p.open(
            format=pyaudio.paInt16,
            channels=channels,
            rate=sample_rate,
            input=True,
            frames_per_buffer=chunk
        )

        print("Recording...")
        frames = []

        for _ in range(0, int(sample_rate / chunk * duration)):
            data = stream.read(chunk)
            frames.append(data)

        print("Recording finished.")

        stream.stop_stream()
        stream.close()
        p.terminate()

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_path = os.path.join(self.audio_dir, f"audio_{timestamp}.wav")

        wf = wave.open(audio_path, 'wb')
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
        wf.close()

        return audio_path

    def transcribe_audio(self, audio_path):
        """
        Convert audio file to text using Whisper.
        Returns: transcript string
        """
        try:
            result = self.model.transcribe(audio_path)
            transcript = result['text'].strip()
            return transcript
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""

    def capture_and_transcribe(self, duration=5):
        """
        Complete workflow: record audio and transcribe it.
        Returns: (transcript, audio_file_path)
        """
        audio_path = self.record_audio(duration=duration)
        transcript = self.transcribe_audio(audio_path)
        return transcript, audio_path
