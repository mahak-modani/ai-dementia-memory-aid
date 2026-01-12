# app/face_recognition/face_recognizer.py

import cv2
import face_recognition
from app.face_recognition.embeddings import load_embeddings

def recognize_faces_live():
    known_encodings, known_names = load_embeddings()

    if not known_encodings:
        print("No known faces found. Please run encode_faces.py first.")
        return

    video = cv2.VideoCapture(0)  # Open webcam

    if not video.isOpened():
        print("Could not access the camera.")
        return

    print("Camera is on. Press 'q' to quit.")

    while True:
        ret, frame = video.read()
        if not ret:
            continue

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding, face_location in zip(face_encodings, face_locations):
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
            name = "Unknown"

            if True in matches:
                match_index = matches.index(True)
                name = known_names[match_index]

            top, right, bottom, left = [v * 4 for v in face_location]

            # Draw rectangle and name
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(frame, name, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        cv2.imshow("Memory Aid - Face Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video.release()
    cv2.destroyAllWindows()
