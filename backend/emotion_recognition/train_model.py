# emotion_detection/train_model.py
import os
import librosa
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

# Define emotions and paths
EMOTIONS = ['neutral', 'calm', 'stressed', 'sad']
DATA_PATH = os.path.join(os.path.dirname(__file__), "sample_data")


def extract_features_from_folder(folder_path):
    features_list = []
    labels_list = []
    for idx, emotion in enumerate(EMOTIONS):
        emotion_folder = os.path.join(folder_path, emotion)
        if not os.path.exists(emotion_folder):
            continue
        for file in os.listdir(emotion_folder):
            if file.endswith('.wav'):
                audio_path = os.path.join(emotion_folder, file)
                y, sr = librosa.load(audio_path, sr=16000)
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                mfccs_mean = np.mean(mfccs.T, axis=0)
                pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
                pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
                energy = np.mean(librosa.feature.rms(y=y))
                features = np.hstack([mfccs_mean, pitch_mean, energy])
                features_list.append(features)
                labels_list.append(idx)
    return np.array(features_list), np.array(labels_list)

# Load data
X, y = extract_features_from_folder(DATA_PATH)
print(f"Extracted {X.shape[0]} samples with {X.shape[1]} features each.")

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Train Random Forest classifier
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Evaluate
accuracy = clf.score(X_test, y_test)
print(f"Validation Accuracy: {accuracy*100:.2f}%")

# Save model and scaler
joblib.dump(clf, 'ser_model.pkl')
joblib.dump(scaler, 'ser_scaler.pkl')
print("Model and scaler saved as 'ser_model.pkl' and 'ser_scaler.pkl'.")
