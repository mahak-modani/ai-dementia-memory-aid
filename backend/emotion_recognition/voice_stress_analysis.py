# emotion_detection/voice_stress_analysis.py
import librosa
import numpy as np
import joblib

class VoiceEmotionAnalyzer:
    """
    Analyze the emotion of an audio clip using a pre-trained ML model.
    """

    def __init__(self, model_path='ser_model.pkl', scaler_path='ser_scaler.pkl'):
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.emotions = ['neutral', 'calm', 'stressed', 'sad']

    def extract_features(self, audio_path):
        """
        Extract MFCCs, pitch, and energy features from audio.
        Returns a 1xN numpy array suitable for ML model.
        """
        y, sr = librosa.load(audio_path, sr=16000)
        # MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfccs_mean = np.mean(mfccs.T, axis=0)
        # Pitch
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        # Energy
        energy = np.mean(librosa.feature.rms(y=y))
        # Combine features
        features = np.hstack([mfccs_mean, pitch_mean, energy])
        return features.reshape(1, -1)

    def predict_emotion(self, audio_path):
        features = self.extract_features(audio_path)
        features_scaled = self.scaler.transform(features)
        prediction_index = self.model.predict(features_scaled)[0]
        return self.emotions[prediction_index]
