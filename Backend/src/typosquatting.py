import Levenshtein
import unicodedata
from urllib.parse import urlparse
import tldextract

tld_extract = tldextract.TLDExtract(suffix_list_urls=())

def is_homoglyph(domain: str) -> bool:
    """Check if the domain uses mixed scripts, unusual unicode, or xn-- punycode."""
    if "xn--" in domain.lower():
        return True
    
    scripts = set()
    for char in domain:
        if char == '.' or char == '-':
            continue
        try:
            name = unicodedata.name(char)
            # Take the first word of the unicode name which usually indicates the script
            # e.g., 'CYRILLIC SMALL LETTER A' -> 'CYRILLIC'
            script = name.split()[0]
            scripts.add(script)
        except ValueError:
            pass
            
    # Typically, a safe domain should only use LATIN or DIGIT
    non_latin_or_digit = [s for s in scripts if s not in ('LATIN', 'DIGIT')]
    
    # If there are scripts other than Latin/Digit, consider it a potential homoglyph
    if non_latin_or_digit:
        return True
        
    return False

def analyze_typosquatting(url: str, trusted_domains: set[str]) -> dict:
    """
    Compare suspicious domains against trusted domains.
    Returns signals for typosquatting, brand_impersonation, and homoglyph.
    """
    signals = {
        "typosquatting": False,
        "brand_impersonation": False,
        "homoglyph": False
    }
    
    try:
        # Use tldextract to robustly identify the registrable domain and subdomains
        ext = tld_extract(url)
        registrable_domain = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
        subdomain = ext.subdomain
        domain_name = ext.domain
    except Exception:
        # Fallback if tldextract is unavailable
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        parts = hostname.split('.')
        if len(parts) >= 2:
            registrable_domain = f"{parts[-2]}.{parts[-1]}"
            subdomain = ".".join(parts[:-2])
            domain_name = parts[-2]
        else:
            registrable_domain = hostname
            subdomain = ""
            domain_name = hostname
            
    if not registrable_domain:
        return signals

    # Homoglyph detection on the full hostname
    hostname = (f"{subdomain}." if subdomain else "") + registrable_domain
    if is_homoglyph(hostname):
        signals["homoglyph"] = True

    # If the domain is exactly a trusted domain, it's not typosquatting
    if registrable_domain in trusted_domains:
        return signals

    # Compare against trusted domains
    for trusted in trusted_domains:
        try:
            trusted_ext = tld_extract(f"http://{trusted}")
            trusted_root = trusted_ext.domain
        except Exception:
            trusted_root = trusted.split('.')[0]
            
        if not trusted_root or len(trusted_root) < 3:
            continue

        # 1. Edit distance (Typosquatting) on the domain name
        dist = Levenshtein.distance(domain_name, trusted_root)
        if 1 <= dist <= 2 and len(domain_name) >= 4:
            signals["typosquatting"] = True
            
        # 2. Brand Impersonation (Brand + suffix/prefix in registrable domain)
        # e.g., paypal-security.com
        if trusted_root in domain_name and domain_name != trusted_root:
            signals["brand_impersonation"] = True
            
        # 3. Brand Impersonation (Brand in subdomain)
        # e.g., secure-paypal.attacker.com (where paypal is in the subdomain)
        if trusted_root in subdomain:
            signals["brand_impersonation"] = True
            
    return signals
