from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import os

class IntentClassifier:
    """
    Classifies user intents using a lightweight transformer model.
    """

    def __init__(self, model_name='distilbert-base-uncased', num_labels=7):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

        self.model_path = 'models/intent_classifier'
        if os.path.exists(self.model_path):
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_path)
        else:
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=num_labels
            )

        self.model.to(self.device)
        self.model.eval()

        self.intent_labels = [
            'set_reminder',
            'who_is_this',
            'emergency_alert',
            'where_is_object',
            'daily_summary',
            'small_talk',
            'memory_training'
        ]

    def predict_intent(self, text):
        """
        Predict the intent of user input text.
        Returns: intent string (e.g., 'set_reminder')
        """
        if not text.strip():
            return 'small_talk'

        text_lower = text.lower()

        if any(word in text_lower for word in ['help', 'emergency', 'urgent', 'problem', 'scared']):
            return 'emergency_alert'

        if any(word in text_lower for word in ['who is', 'who are', "who's", 'recognize']):
            return 'who_is_this'

        if any(word in text_lower for word in ['remind', 'reminder', 'schedule', 'appointment', 'medication']):
            return 'set_reminder'

        if any(word in text_lower for word in ['where is', 'find', 'looking for', 'lost']):
            return 'where_is_object'

        if any(word in text_lower for word in ['summary', 'what did i do', 'today', 'recap']):
            return 'daily_summary'

        if any(word in text_lower for word in ['quiz', 'practice', 'train', 'remember']):
            return 'memory_training'

        return 'small_talk'

    def predict_with_confidence(self, text):
        """
        Predict intent with confidence score using transformer model.
        Returns: (intent, confidence)
        """
        try:
            inputs = self.tokenizer(
                text,
                return_tensors='pt',
                truncation=True,
                max_length=128
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=1)
                confidence, predicted_idx = torch.max(probs, dim=1)

            intent = self.intent_labels[predicted_idx.item()]
            return intent, confidence.item()
        except Exception as e:
            print(f"Model prediction error: {e}, falling back to rule-based")
            return self.predict_intent(text), 0.5
