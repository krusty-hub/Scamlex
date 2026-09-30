import os
import joblib

from Backend.src.ml_features import extract_features

# Cache the loaded model and vectorizer in memory to avoid reloading on every prediction
_model = None
_vectorizer = None

def _load_model():
    global _model, _vectorizer
    if _model is not None and _vectorizer is not None:
        return True
        
    model_dir = os.path.join(os.path.dirname(__file__), 'url_model')
    model_path = os.path.join(model_dir, 'rf_model.pkl')
    vectorizer_path = os.path.join(model_dir, 'vectorizer.pkl')
    
    if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
        return False
        
    try:
        _model = joblib.load(model_path)
        _vectorizer = joblib.load(vectorizer_path)
        return True
    except Exception as e:
        print(f"Error loading ML model: {e}")
        return False

def predict_url(url: str) -> tuple[str, float]:
    """
    Predicts the maliciousness of a URL.
    Returns a tuple of (predicted_label, confidence_score).
    If the model fails to load or predict, returns ("unknown", 0.0).
    """
    if not _load_model():
        return ("unknown", 0.0)
        
    try:
        features = extract_features(url)
        X = _vectorizer.transform([features])
        
        # Predict probabilities
        probas = _model.predict_proba(X)[0]
        classes = _model.classes_
        
        # Find the max probability
        max_idx = probas.argmax()
        predicted_class = classes[max_idx]
        confidence = probas[max_idx]
        
        return (predicted_class, float(confidence))
    except Exception as e:
        print(f"Prediction error for URL {url}: {e}")
        return ("unknown", 0.0)

if __name__ == "__main__":
    # Test script
    test_urls = [
        "https://www.google.com",
        "http://secure-login.paypal-update.com.verify.xyz"
    ]
    for test_url in test_urls:
        label, conf = predict_url(test_url)
        print(f"URL: {test_url}\nPrediction: {label} (confidence: {conf:.2f})\n")
