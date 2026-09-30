import re
from typing import List

def extract_urls(text: str) -> List[str]:
    """
    Extracts all URLs from a given text string.
    Ignores email addresses and cleans trailing punctuation.
    """
    if not text:
        return []
        
    # The user's regex pattern:
    # 1. (?<![@\w.-]) -> Negative lookbehind to ignore emails (e.g. user@domain.com)
    # 2. https?://\S+ -> Matches http/https links
    # 3. www\.\S+ -> Matches www links
    # 4. (?:[\w-]+\.)+[a-zA-Z]{2,}(?:/\s*)? -> Matches naked domains (e.g., domain.com, sub.domain.io)
    pattern = r'(?<![@\w.-])(?:https?://\S+|www\.\S+|(?:[\w-]+\.)+[a-zA-Z]{2,}(?:/\S*)?)'
    
    raw_urls = re.findall(pattern, text)
    
    # Clean up trailing punctuation that often gets caught if a URL is at the end of a sentence
    urls = [url.rstrip(".,!?;:)]}") for url in raw_urls]
    
    # Return unique URLs while preserving order (optional, but good practice)
    # Using dict.fromkeys is a fast way to get unique items while maintaining order in Python 3.7+
    return list(dict.fromkeys(urls))
