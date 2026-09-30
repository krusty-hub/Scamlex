import os
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from Backend.src.ml_features import extract_features

def main():
    dataset_path = os.path.join(os.path.dirname(__file__), 'url dataset', 'scam_dataset_fixed.csv')
    model_dir = os.path.join(os.path.dirname(__file__), 'url_model')
    
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    print(f"Loading dataset from {dataset_path}...")
    # Load dataset. Sampling if needed for speed, but let's load all for now.
    df = pd.read_csv(dataset_path)
    
    # Optional: map labels to simpler categories if desired, but we can train on the original 4 labels
    print(f"Dataset loaded. Total rows: {len(df)}")
    
    print("Extracting features...")
    # Convert URLs to strings and handle NaNs
    urls = df['url'].astype(str).tolist()
    labels = df['label'].astype(str).tolist()
    
    features_list = [extract_features(url) for url in urls]
    
    print("Vectorizing features...")
    vectorizer = DictVectorizer(sparse=False)
    X = vectorizer.fit_transform(features_list)
    y = labels
    
    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=50, max_depth=15, n_jobs=-1, random_state=42)
    clf.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = clf.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("Saving model and vectorizer...")
    model_path = os.path.join(model_dir, 'rf_model.pkl')
    vectorizer_path = os.path.join(model_dir, 'vectorizer.pkl')
    
    joblib.dump(clf, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    
    print(f"Model saved to {model_path}")
    print(f"Vectorizer saved to {vectorizer_path}")

if __name__ == '__main__':
    main()
