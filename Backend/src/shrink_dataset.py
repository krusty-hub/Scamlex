import os
import re
import pandas as pd

LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "scam_message")
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "optimized_dataset.csv")

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    if not os.path.exists(LOCAL_DATA_DIR):
        print(f"Directory not found: {LOCAL_DATA_DIR}")
        return

    combined_df = pd.DataFrame()
    csv_files = [f for f in os.listdir(LOCAL_DATA_DIR) if f.endswith('.csv')]
    
    print("Extracting and cleaning data...")
    for file in csv_files:
        file_path = os.path.join(LOCAL_DATA_DIR, file)
        try:
            # Read a larger chunk to ensure we have enough after deduplication
            df = pd.read_csv(file_path, on_bad_lines='skip', nrows=15000)
            
            body_col = None
            label_col = None
            cols_lower = [str(c).lower() for c in df.columns]
            
            if 'body' in cols_lower:
                body_col = df.columns[cols_lower.index('body')]
            elif 'text' in cols_lower:
                body_col = df.columns[cols_lower.index('text')]
            elif 'email text' in cols_lower:
                body_col = df.columns[cols_lower.index('email text')]
                
            if 'label' in cols_lower:
                label_col = df.columns[cols_lower.index('label')]
            elif 'class' in cols_lower:
                label_col = df.columns[cols_lower.index('class')]
                
            if body_col and label_col:
                subset = df[[body_col, label_col]].copy()
                subset.columns = ['message', 'label']
                subset['label'] = pd.to_numeric(subset['label'], errors='coerce')
                subset = subset.dropna()
                subset['message'] = subset['message'].apply(clean_text)
                subset = subset[subset['message'] != ""]
                combined_df = pd.concat([combined_df, subset], ignore_index=True)
                
        except Exception as e:
            print(f"Skipping {file}: {e}")

    print(f"Total rows before deduplication: {len(combined_df)}")
    
    # Drop completely identical messages
    combined_df = combined_df.drop_duplicates(subset=['message'])
    print(f"Total rows after deduplication: {len(combined_df)}")
    
    # Stratified Sampling: Let's take up to 10000 of each class
    spam_df = combined_df[combined_df['label'] == 1]
    ham_df = combined_df[combined_df['label'] == 0]
    
    spam_sample = spam_df.sample(min(len(spam_df), 10000), random_state=42)
    ham_sample = ham_df.sample(min(len(ham_df), 10000), random_state=42)
    
    final_df = pd.concat([spam_sample, ham_sample], ignore_index=True)
    
    # Shuffle the dataset
    final_df = final_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    print(f"Final balanced dataset size: {len(final_df)} rows")
    print(f"Spam: {len(spam_sample)}, Ham: {len(ham_sample)}")
    
    final_df.to_csv(OUTPUT_CSV, index=False)
    
    size_mb = os.path.getsize(OUTPUT_CSV) / (1024 * 1024)
    print(f"Successfully saved to {OUTPUT_CSV}")
    print(f"File size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
