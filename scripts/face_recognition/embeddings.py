# app/face_recognition/embeddings.py

import face_recognition
import os
import pickle

def load_known_faces(directory="data/faces"):
    known_encodings = []
    known_names = []

    for filename in os.listdir(directory):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            name = ''.join([c for c in os.path.splitext(filename)[0] if not c.isdigit()]).lower()
            path = os.path.join(directory, filename)
            image = face_recognition.load_image_file(path)
            encodings = face_recognition.face_encodings(image)

            if encodings:
                known_encodings.append(encodings[0])
                known_names.append(name)
            else:
                print(f"No face found in {filename}, skipping.")

    return known_encodings, known_names

def save_embeddings(encodings, names, filepath="data/embeddings/known_faces.pkl"):
    with open(filepath, "wb") as f:
        pickle.dump((encodings, names), f)

def load_embeddings(filepath="data/embeddings/known_faces.pkl"):
    if not os.path.exists(filepath):
        return [], []
    with open(filepath, "rb") as f:
        return pickle.load(f)
