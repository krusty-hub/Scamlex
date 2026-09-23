import re
import math
from collections import Counter
from urllib.parse import urlparse
import ipaddress

def _shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    return -sum((count / length) * math.log2(count / length) for count in counts.values())

def extract_features(url: str) -> dict:
    """
    Extracts lexical and structural features from a URL.
    Returns a dictionary of feature names to float values.
    """
    if not isinstance(url, str):
        url = str(url)
        
    if not url.startswith(('http://', 'https://')):
        url_with_scheme = 'http://' + url
    else:
        url_with_scheme = url

    try:
        parsed = urlparse(url_with_scheme)
        hostname = parsed.hostname or ""
        path = parsed.path or ""
        query = parsed.query or ""
    except ValueError:
        hostname = ""
        path = ""
        query = ""
    
    features = {}
    
    # Basic length features
    features['url_length'] = len(url)
    features['hostname_length'] = len(hostname)
    features['path_length'] = len(path)
    features['query_length'] = len(query)
    
    # Entropy
    features['url_entropy'] = _shannon_entropy(url)
    features['hostname_entropy'] = _shannon_entropy(hostname)
    
    # Character counts
    features['num_dots'] = url.count('.')
    features['num_hyphens'] = url.count('-')
    features['num_at_symbols'] = url.count('@')
    features['num_question_marks'] = url.count('?')
    features['num_ampersands'] = url.count('&')
    features['num_equals'] = url.count('=')
    features['num_percent'] = url.count('%')
    features['num_digits'] = sum(c.isdigit() for c in url)
    features['num_letters'] = sum(c.isalpha() for c in url)
    
    # Derived ratios
    if len(url) > 0:
        features['digit_ratio'] = features['num_digits'] / len(url)
    else:
        features['digit_ratio'] = 0.0
        
    # Domain specific features
    parts = hostname.split('.')
    features['num_subdomains'] = max(0, len(parts) - 2)
    
    # IP Address in domain
    try:
        clean_hostname = hostname.strip("[]")
        if re.match(r'^0x[0-9a-fA-F]+(\.0x[0-9a-fA-F]+){0,3}$', clean_hostname):
            features['has_ip'] = 1.0
        else:
            ipaddress.ip_address(clean_hostname)
            features['has_ip'] = 1.0
    except ValueError:
        features['has_ip'] = 0.0
        
    # Keyword based features
    suspicious_words = ['login', 'verify', 'update', 'secure', 'account', 'banking', 'confirm', 'password', 'free']
    url_lower = url.lower()
    features['suspicious_word_count'] = sum(1 for word in suspicious_words if word in url_lower)
    
    return features
