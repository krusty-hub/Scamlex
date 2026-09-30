import os
import re
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import subprocess

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "scam_message")
MODEL_PATH = os.path.join(DATA_DIR, "scam_classifier.pkl")

def clean_text(text):
    """Clean the text data by converting to lowercase and stripping special chars."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'<[^>]+>', ' ', text)  # Remove HTML tags
    text = re.sub(r'[^a-z0-9\s]', ' ', text)  # Keep only alphanumeric and whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def download_dataset():
    """Attempt to download Kaggle dataset if credentials exist, otherwise return local path."""
    print("Checking for Kaggle dataset...")
    try:
        # Try running kaggle CLI
        result = subprocess.run(["kaggle", "datasets", "download", "-d", "naserabdullahalam/phishing-email-dataset", "-p", DATA_DIR], 
                                capture_output=True, text=True, check=True)
        print("Successfully downloaded Kaggle dataset.")
        # Optional: extract zip here if needed
    except Exception as e:
        print("Warning: Could not download dataset via Kaggle API (missing credentials or kaggle not installed).")
        print(f"Error details: {e}")
        
    return LOCAL_DATA_DIR

def load_and_preprocess_data(dataset_dir):
    """Read optimized_dataset.csv, scamlens_dataset.csv, legit_massage_dataset.csv, scam_detection_dataset.csv"""
    optimized_path = os.path.join(DATA_DIR, "optimized_dataset.csv")
    if not os.path.exists(optimized_path):
        raise FileNotFoundError(f"Optimized dataset not found at: {optimized_path}. Please run shrink_dataset.py first.")
        
    print(f"Processing optimized dataset...")
    df = pd.read_csv(optimized_path)
    
    legit_path = os.path.join(DATA_DIR, "legit_massage_dataset.csv")
    if os.path.exists(legit_path):
        print("Processing legit_massage_dataset.csv...")
        legit_df = pd.read_csv(legit_path)
        if 'text' in legit_df.columns:
            legit_df = legit_df.rename(columns={'text': 'message'})
        df = pd.concat([df, legit_df], ignore_index=True)
        
    scam_path = os.path.join(DATA_DIR, "scam_detection_dataset.csv")
    if os.path.exists(scam_path):
        print("Processing scam_detection_dataset.csv...")
        scam_df = pd.read_csv(scam_path)
        if 'text' in scam_df.columns:
            scam_df = scam_df.rename(columns={'text': 'message'})
        df = pd.concat([df, scam_df], ignore_index=True)
    
    scamlens_path = os.path.join(DATA_DIR, "scamlens_dataset.csv")
    if os.path.exists(scamlens_path):
        print("Processing and appending Scamlens dataset (upsampled)...")
        scamlens_df = pd.read_csv(scamlens_path)
        # Upsample scamlens data to ensure the model learns these high-quality examples
        scamlens_df = pd.concat([scamlens_df] * 500, ignore_index=True)
        df = pd.concat([df, scamlens_df], ignore_index=True)
        
    return df

def train():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    dataset_dir = download_dataset()
    
    print("Loading and cleaning local dataset...")
    df = load_and_preprocess_data(dataset_dir)
    
    if df.empty:
        print("Error: No data available for training.")
        return
        
    print(f"Dataset compiled. Total records: {len(df)}")
    
    X = df['message']
    y = df['label']
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training lightweight model...")
    # TF-IDF with max_features=3000 to keep the model small and fast
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=3000)),
        ('clf', LogisticRegression(random_state=42, max_iter=200))
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    
    # Save model
    print(f"Saving model to {MODEL_PATH}...")
    joblib.dump(pipeline, MODEL_PATH)
    print("Training complete! Model saved and ready for use in detector.py.")

if __name__ == "__main__":
    train()
