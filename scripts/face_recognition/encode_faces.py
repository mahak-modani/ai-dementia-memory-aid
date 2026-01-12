# encode_faces.py

from embeddings import load_known_faces, save_embeddings

def main():
    print("📸 Encoding known faces from 'data/faces'...")
    encodings, names = load_known_faces()
    save_embeddings(encodings, names)
    print("Encodings saved to 'data/embeddings/known_faces.pkl'.")

if __name__ == "__main__":
    main()
