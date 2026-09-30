from typing import Optional
from urllib.parse import urlparse, parse_qs, unquote
import re
import math
import ipaddress
from collections import Counter
import ssl
import socket
import dns.resolver
import whois
import requests
from bs4 import BeautifulSoup
import Levenshtein
from datetime import datetime
import tldextract
tld_extract = tldextract.TLDExtract(suffix_list_urls=())
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables for Supabase
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

supabase_url: str = os.environ.get("VITE_SUPABASE_URL", "")
supabase_key: str = os.environ.get("VITE_SUPABASE_ANON_KEY", "")

supabase: Client | None = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
def url_extractor(text: str) -> list[str]:
    pattern =  r'(?<![@\w.-])(?:https?://\S+|www\.\S+|(?:[\w-]+\.)+[a-zA-Z]{2,}(?:/\s*)?)'
    urls = [url.rstrip(".,!?;:)]}") for url in re.findall(pattern, text)]
    return urls

def normalize_url(url: str) -> str:
    """
    Robust URL normalization:
    - Add missing scheme
    - Lowercase hostname
    - Remove trailing dots
    - Decode safely
    """
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
        
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().rstrip('.')
        
        # Reconstruct URL
        netloc = hostname
        if parsed.port:
            netloc += f":{parsed.port}"
            
        normalized = parsed._replace(netloc=netloc).geturl()
        # Decode safe percent-encoded characters (like %20, %2F)
        normalized = unquote(normalized)
        return normalized
    except Exception:
        return url # fallback

def check_shortened_link(url: str) -> tuple[int, Optional[str]]:
    SHORTENED_URL_POINTS = 2
    points = 0
    reason_string = None
    
    hostname = urlparse(url).hostname #extracts the domain name
    if not hostname:
        return (0, None)
    
    # Expanded list of URL shorteners
    shortened_domains = {
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", 
        "is.gd", "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at"
    }
    
    # Check exact match or subdomains like is.gd
    for shortener in shortened_domains:
        if hostname == shortener or hostname.endswith('.' + shortener):
            points = SHORTENED_URL_POINTS
            reason_string = "Uses a URL Shortening Service"
            break
            
    return (points, reason_string)

def check_ipaddress(url: str) -> tuple[int, Optional[str]]:
    IP_ADDRESS_POINTS = 2
    points = 0
    reason_string = None
    
    hostname = urlparse(url).hostname
    
    if hostname is not None:
        # Strip brackets for IPv6
        clean_hostname = hostname.strip("[]")
        try:
            ipaddress.ip_address(clean_hostname)#checks whether the domain is a valid ip address
            points = IP_ADDRESS_POINTS
            reason_string = "Uses an IP Address instead of a Domain Name"
        except ValueError:
            # Check for hex/octal representations (sometimes used to evade filters)
            if re.match(r'^0x[0-9a-fA-F]+(\.0x[0-9a-fA-F]+){0,3}$', clean_hostname):
                points = IP_ADDRESS_POINTS
                reason_string = "Uses an obfuscated hexadecimal IP Address instead of a Domain Name"
    
    return (points, reason_string)

def check_valid_bank_url(url: str) -> tuple[int, Optional[str]]:
    BANK_LOOKALIKE_POINTS = 3
    banks = {
        "accessbank": ["accessbankplc.com"],
        "access": ["accessbankplc.com"],
        "gtbank": ["gtbank.com"],
        "gtb": ["gtbank.com"],
        "zenith": ["zenithbank.com"],
        "firstbank": ["firstbanknigeria.com"],
        "first bank": ["firstbanknigeria.com"],
        "uba": ["ubagroup.com"],
        "opay": ["opayweb.com"],
        "kuda": ["kuda.com"],
        "moniepoint": ["moniepoint.com"],
        "sterling": ["sterling.ng"],
        "wema": ["wemabank.com"],
        "fidelity": ["fidelitybank.ng"],
        "unionbank": ["unionbankng.com"],
        "union bank": ["unionbankng.com"],
        "stanbic": ["stanbicibtcbank.com"],
        "polaris": ["polarisbanklimited.com"],
        "fcmb": ["fcmb.com"],
    }

    parsed_url = urlparse(url)
    hostname = parsed_url.hostname

    if hostname is None:
        return (0, None)

    hostname = hostname.lower().rstrip(".")

    if looks_like_bank(hostname, banks):
        return (
            BANK_LOOKALIKE_POINTS,
            "Possible bank lookalike domain"
        )

    return (0, None)

def looks_like_bank(
    hostname: str,
    banks: dict[str, list[str]]
) -> bool:
    hostname = hostname.lower()
    for bank_name, official_domains in banks.items():
        if bank_name in hostname:
            for official_domain in official_domains:
                if (
                    hostname == official_domain
                    or hostname.endswith("." + official_domain)
                ):
                    return False
            return True
    return False
                
def check_suspicious_language(url: str) -> tuple[int, Optional[str]]:
    SUSPICIOUS_LANGUAGE_POINTS = 1
    points = 0
    reason_string = None
    
    suspicious_keywords = ["login", "verify", "verification", "security", "account", "update", "signin", "authenticate"]
    
    url_lower = url.lower()
    
    for keyword in suspicious_keywords:
        if keyword in url_lower:
            points = SUSPICIOUS_LANGUAGE_POINTS
            reason_string = "Contains Suspicious security or account-related languages"
            break
            
    return (points, reason_string)

def check_url_structure(url: str) -> tuple[int, Optional[str]]:
    MISLEADING_AT_POINTS = 3
    points = 0
    reason_string = None
    
    # userinfo attack check
    parsed = urlparse(url)
    if parsed.username or parsed.password:
        points = MISLEADING_AT_POINTS
        reason_string = "URL contains misleading username/password information before the @ symbol"
    
    # Also check for encoded @ symbol (%40) before the domain
    if "%40" in parsed.netloc:
        points = MISLEADING_AT_POINTS
        reason_string = "URL contains obfuscated username/password information before the @ symbol"
        
    return (points, reason_string)

def check_punycode_domain(url: str) -> tuple[int, Optional[str]]:
    PUNYCODE_DOMAIN_POINTS = 1
    points = 0
    reason_string = None
    
    hostname = urlparse(url).hostname
    
    if hostname is not None and "xn--" in hostname:
        points = PUNYCODE_DOMAIN_POINTS
        reason_string = "Uses a Punycode domain"
        
    return (points, reason_string)

def check_excessive_percent_encoding(url: str) -> tuple[int, Optional[str]]:
    EXCESSIVE_PERCENT_ENCODING_POINTS = 1
    points = 0
    reason_string = None
    
    pattern = re.findall(r'%[0-9a-fA-F]{2}', url)
    
    # Increased threshold or check for repeated obfuscation could be done, 
    # but maintaining existing logic mostly.
    if len(pattern) >= 3:
        points = EXCESSIVE_PERCENT_ENCODING_POINTS 
        reason_string = "Contains Excessive URL Encoding"
      
    return (points, reason_string)

def _shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    return -sum((count / length) * math.log2(count / length) for count in counts.values())

def check_suspicious_path(url: str) -> tuple[int, Optional[str]]:
    SUSPICIOUS_PATH_POINTS = 3
    LONG_SEGMENT_THRESHOLD = 20
    ENTROPY_THRESHOLD = 3.5

    points = 0
    reason_string = None

    parsed = urlparse(url)

    segments = []
    if parsed.path:
        segments.extend(seg for seg in parsed.path.split('/') if seg)
    if parsed.fragment:
        segments.extend(seg for seg in re.split(r'[/&?]', parsed.fragment) if seg)

    for segment in segments:
        clean_segment = segment.split('.')[0]
        if len(clean_segment) >= LONG_SEGMENT_THRESHOLD:
            entropy = _shannon_entropy(clean_segment)
            if entropy >= ENTROPY_THRESHOLD:
                points = SUSPICIOUS_PATH_POINTS
                reason_string = "Contains a long, random-looking path or fragment"
                break

    return (points, reason_string)

def check_redirect_parameters(url: str) -> tuple[int, Optional[str]]:
    REDIRECT_PATTERN_POINTS = 3
    MIN_PARAM_COUNT = 4
    NUMERIC_VALUE_RATIO_THRESHOLD = 0.6

    points = 0
    reason_string = None

    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    if '?' in parsed.fragment:
        query_params.update(parse_qs(parsed.fragment.split('?', 1)[1]))

    if len(query_params) >= MIN_PARAM_COUNT:
        numeric_like = 0
        for values in query_params.values():
            value = values[0] if values else ""
            if re.match(r'^\d+(_\w+)?$', value):
                numeric_like += 1

        if numeric_like / len(query_params) >= NUMERIC_VALUE_RATIO_THRESHOLD:
            points = REDIRECT_PATTERN_POINTS
            reason_string = "Contains ad-redirect/click-tracking style query parameters"

    # NEW logic: Check for nested URLs in query parameters
    for key, values in query_params.items():
        if key.lower() in {'redirect', 'url', 'next', 'return', 'returnurl', 'continue', 'target', 'dest', 'destination', 'redirect_uri'}:
            for val in values:
                if val.startswith('http://') or val.startswith('https://'):
                    points = max(points, REDIRECT_PATTERN_POINTS)
                    reason_string = f"Contains an open redirect parameter ({key}) pointing to another URL"

    return (points, reason_string)

def check_malformed_query(url: str) -> tuple[int, Optional[str]]:
    MALFORMED_QUERY_POINTS = 2
    parsed = urlparse(url)
    if parsed.query and "=" not in parsed.query:
        return (MALFORMED_QUERY_POINTS, "Contains a malformed or suspicious query string")
    return (0, None)

def check_typosquatting(url: str, trusted_domains: list[str] = None) -> tuple[int, Optional[str]]:
    if trusted_domains is None:
        trusted_domains = [
            "google.com", "facebook.com", "amazon.com", "apple.com", "microsoft.com", 
            "paypal.com", "netflix.com", "linkedin.com", "instagram.com", "twitter.com"
        ]
        
    points = 0
    reason_string = None
    hostname = urlparse(url).hostname
    
    if hostname:
        hostname = hostname.lower()
        for domain in trusted_domains:
            if hostname == domain or hostname.endswith('.' + domain):
                continue
                
            distance = Levenshtein.distance(hostname, domain)
            if distance == 1 or distance == 2:
                points = 3
                reason_string = f"Possible typosquatting of {domain}"
                break
                
    return (points, reason_string)

def check_dns_records(url: str) -> tuple[int, Optional[str]]:
    points = 0
    reason_string = None
    hostname = urlparse(url).hostname
    
    if hostname:
        try:
            # Added explicit lifetime to prevent hanging
            answers = dns.resolver.resolve(hostname, 'A', lifetime=3.0)
            if not answers:
                points = 3
                reason_string = "Domain has no valid A records"
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, dns.resolver.NoNameservers):
            points = 3
            reason_string = "Domain failed to resolve or has no valid DNS A records"
        except Exception:
            points = 3
            reason_string = "Error resolving domain DNS records"
            
    return (points, reason_string)

def check_domain_age(url: str) -> tuple[int, Optional[str]]:
    points = 0
    reason_string = None
    hostname = urlparse(url).hostname
    
    if hostname:
        try:
            # python-whois can hang indefinitely. In a real production app, 
            # you might want to run this in a thread or use a whois API instead.
            import threading
            domain_info = None
            def fetch_whois():
                nonlocal domain_info
                domain_info = whois.whois(hostname)
                
            t = threading.Thread(target=fetch_whois)
            t.start()
            t.join(timeout=3.0) # 3 second strict timeout
            
            if t.is_alive():
                return (0, None) # Timed out
                
            if domain_info:
                creation_date = domain_info.creation_date
            
            if creation_date:
                if isinstance(creation_date, list):
                    creation_date = creation_date[0]
                    
                age_days = (datetime.now() - creation_date).days
                if age_days < 30:
                    points = 3
                    reason_string = f"Domain was registered very recently (less than 30 days ago)"
        except Exception:
            pass 
            
    return (points, reason_string)

def check_ssl_tls(url: str) -> tuple[int, Optional[str]]:
    points = 0
    reason_string = None
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname
    
    if hostname:
        if parsed_url.scheme == 'http':
            return (2, "URL uses insecure HTTP connection")
            
        context = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, 443), timeout=3) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    pass 
        except Exception:
            points = 2
            reason_string = "Invalid, expired, or missing SSL/TLS certificate"
            
    return (points, reason_string)

def check_url_redirects(url: str) -> tuple[int, Optional[str]]:
    points = 0
    reason_string = None
    
    if not url.startswith('http'):
        url = 'http://' + url
        
    try:
        response = requests.head(url, allow_redirects=True, timeout=5)
        if len(response.history) >= 3:
            points = 2
            reason_string = "URL contains a suspicious number of redirects (3 or more)"
    except requests.RequestException:
        pass 
        
    return (points, reason_string)

def check_cloned_website(url: str, brand_name: str = "paypal", official_domain: str = "paypal.com") -> tuple[int, Optional[str]]:
    points = 0
    reason_string = None
    hostname = urlparse(url).hostname
    
    if hostname and hostname != official_domain and not hostname.endswith("." + official_domain):
        if not url.startswith('http'):
            url = 'http://' + url
            
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, timeout=5, headers=headers)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                title_tag = soup.title
                
                if title_tag and title_tag.string and brand_name.lower() in title_tag.string.lower():
                    points = 3
                    reason_string = f"Website title impersonates brand '{brand_name}' but is hosted on a different domain"
        except requests.RequestException:
            pass 
            
    return (points, reason_string)

# --- NEW FUNCTIONS FOR MULTI-LAYER ENGINE ---

def check_suspicious_port(url: str) -> tuple[int, Optional[str]]:
    """Flags unusual ports (not 80 or 443)."""
    parsed = urlparse(url)
    if parsed.port and parsed.port not in [80, 443]:
        return (2, f"URL uses a non-standard port ({parsed.port})")
    return (0, None)

def check_double_extension(url: str) -> tuple[int, Optional[str]]:
    """Detects suspicious file-like paths (e.g., document.pdf.exe)."""
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    suspicious_combos = [
        ".pdf.exe", ".pdf.zip", ".pdf.scr",
        ".html.exe", ".php.exe", ".zip.scr"
    ]
    
    for combo in suspicious_combos:
        if path.endswith(combo):
            return (4, f"Suspicious double extension found ({combo})")
            
    return (0, None)

def check_subdomain_abuse(url: str) -> tuple[int, Optional[str]]:
    """Detects excessive subdomains."""
    hostname = urlparse(url).hostname
    if not hostname:
        return (0, None)
        
    try:
        ext = tld_extract(url)
        subdomain = ext.subdomain
        if subdomain:
            # Count labels in the subdomain
            labels = subdomain.split('.')
            if len(labels) >= 3:
                return (3, "URL uses an excessive number of subdomains")
    except Exception:
        pass
        
    return (0, None)

def check_database_for_scam(input_url: str) -> tuple[int, str | None]:
    if not supabase:
        return (0, None)
    try:
        # Calls the SQL function we just created
        response = supabase.rpc(
            "match_similar_url", 
            {"input_url": input_url, "match_threshold": 0.6}
        ).execute()

        if response.data:
            match = response.data[0]
            if match["label"] in ["phishing", "scam"]:
                return (3, f"Matches known {match['label']} in database.")
            elif match["label"] == "benign":
                return (0, "Matches known safe URL.")
                
    except Exception as e:
        print(f"Supabase lookup failed: {e}")
        
    return (0, None)
