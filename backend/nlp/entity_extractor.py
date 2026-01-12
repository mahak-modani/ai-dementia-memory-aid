import re
from datetime import datetime, timedelta
import spacy

class EntityExtractor:
    """
    Extracts entities like time, person names, tasks, objects from text.
    Uses regex patterns and optional spaCy for named entity recognition.
    """

    def __init__(self, use_spacy=True):
        self.use_spacy = use_spacy
        if use_spacy:
            try:
                self.nlp = spacy.load('en_core_web_sm')
            except:
                print("spaCy model not found. Using regex only.")
                self.use_spacy = False

    def extract_time(self, text):
        """
        Extract time expressions from text.
        Returns: time string or None
        """
        time_patterns = [
            r'(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))',
            r'(\d{1,2}\s*(?:AM|PM|am|pm))',
            r'at\s+(\d{1,2}(?::\d{2})?)',
            r'(\d{1,2})\s*(?:o\'clock|oclock)'
        ]

        for pattern in time_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        relative_time = {
            'morning': '09:00 AM',
            'afternoon': '02:00 PM',
            'evening': '06:00 PM',
            'night': '08:00 PM',
            'noon': '12:00 PM',
            'midnight': '12:00 AM'
        }

        for key, value in relative_time.items():
            if key in text.lower():
                return value

        return None

    def extract_date(self, text):
        """
        Extract date expressions from text.
        Returns: date string or None
        """
        text_lower = text.lower()

        if 'today' in text_lower:
            return datetime.now().strftime('%Y-%m-%d')
        if 'tomorrow' in text_lower:
            return (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        if 'yesterday' in text_lower:
            return (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

        date_pattern = r'(\d{1,2}/\d{1,2}/\d{2,4})'
        match = re.search(date_pattern, text)
        if match:
            return match.group(1)

        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in weekdays:
            if day in text_lower:
                return day

        return None

    def extract_task(self, text):
        """
        Extract task or action from text.
        Returns: task string or None
        """
        task_keywords = ['medication', 'medicine', 'pills', 'appointment', 'doctor',
                         'meeting', 'call', 'exercise', 'eat', 'drink', 'take']

        text_lower = text.lower()
        for keyword in task_keywords:
            if keyword in text_lower:
                words = text.split()
                for i, word in enumerate(words):
                    if keyword in word.lower():
                        task = ' '.join(words[max(0, i-2):min(len(words), i+3)])
                        return task

        return text

    def extract_person(self, text):
        """
        Extract person names from text using spaCy.
        Returns: list of person names
        """
        if not self.use_spacy:
            return []

        doc = self.nlp(text)
        persons = [ent.text for ent in doc.ents if ent.label_ == 'PERSON']
        return persons

    def extract_object(self, text):
        """
        Extract objects mentioned in text.
        Returns: object name or None
        """
        common_objects = ['keys', 'glasses', 'phone', 'wallet', 'pillbox',
                         'medicine', 'remote', 'book', 'watch', 'bag']

        text_lower = text.lower()
        for obj in common_objects:
            if obj in text_lower:
                return obj

        return None

    def extract_all(self, text):
        """
        Extract all entities from text.
        Returns: dictionary of entities
        """
        entities = {
            'time': self.extract_time(text),
            'date': self.extract_date(text),
            'task': self.extract_task(text),
            'persons': self.extract_person(text),
            'object': self.extract_object(text),
            'raw_text': text
        }

        return entities
