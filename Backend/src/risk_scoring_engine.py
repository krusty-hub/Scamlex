import tldextract
tld_extract = tldextract.TLDExtract(suffix_list_urls=())
from Backend.src import url_utils
from Backend.src.trusted_domains import get_all_trusted_domains
from Backend.src.typosquatting import analyze_typosquatting
from Backend.src.virustotal_client import get_url_report
from Backend.src.ml_predictor import predict_url

RISK_WEIGHTS = {
    "ip_address": 25,
    "url_shortener": 15,
    "suspicious_tld": 10,
    "typosquatting": 40,
    "homoglyph": 35,
    "brand_impersonation": 30,
    "suspicious_keywords": 5,
    "suspicious_path": 10,
    "suspicious_query": 10,
    "nested_url": 20,
    "obfuscation": 15,
    "userinfo_attack": 30,
    "unusual_port": 8,
    "excessive_subdomains": 10,
    "double_extension": 20,
    "excessive_length": 5,
    "random_domain": 8,
}

SUSPICIOUS_TLDS = {
    "zip", "top", "click", "xyz", "work", "link", 
    "shop", "online", "site", "live", "world"
}

def analyze_url(url: str) -> dict:
    """
    Main entry point for multi-layer URL risk analysis.
    """
    # 1. Normalization
    original_url = url
    normalized_url = url_utils.normalize_url(url)
    
    trusted_domains = get_all_trusted_domains()
    
    score = 0
    reasons = []
    signals = {k: False for k in RISK_WEIGHTS.keys()}
    
    # --- Execute individual checks (Local) ---
    
    # IP Address
    p, r = url_utils.check_ipaddress(normalized_url)
    if p > 0:
        signals["ip_address"] = True
        reasons.append(r)
        
    # Shortener
    p, r = url_utils.check_shortened_link(normalized_url)
    if p > 0:
        signals["url_shortener"] = True
        reasons.append(r)
        
    # TLD
    try:
        ext = tld_extract(normalized_url)
        if ext.suffix and ext.suffix.lower() in SUSPICIOUS_TLDS:
            signals["suspicious_tld"] = True
            reasons.append(f"Domain uses a suspicious top-level domain (.{ext.suffix})")
    except Exception:
        pass
        
    # Typosquatting & Homoglyph & Brand Impersonation
    typo_signals = analyze_typosquatting(normalized_url, trusted_domains)
    if typo_signals["typosquatting"]:
        signals["typosquatting"] = True
        reasons.append("Domain closely resembles a trusted brand (Typosquatting)")
    if typo_signals["brand_impersonation"]:
        signals["brand_impersonation"] = True
        reasons.append("URL attempts to impersonate a trusted brand")
    if typo_signals["homoglyph"]:
        signals["homoglyph"] = True
        reasons.append("Domain uses suspicious unicode or mixed scripts (Homoglyph attack)")
        
    # Keywords
    p, r = url_utils.check_suspicious_language(normalized_url)
    if p > 0:
        signals["suspicious_keywords"] = True
        reasons.append(r)
        
    # Userinfo Attack (use original URL because normalization strips credentials)
    p, r = url_utils.check_url_structure(original_url)
    if p > 0:
        signals["userinfo_attack"] = True
        reasons.append("URL contains a misleading @ symbol that can hide the real destination.")
        
    # Obfuscation (Encoding) (use original URL because normalization decodes)
    p, r = url_utils.check_excessive_percent_encoding(original_url)
    if p > 0:
        signals["obfuscation"] = True
        reasons.append(r)
        
    # Path/Randomness
    p, r = url_utils.check_suspicious_path(normalized_url)
    if p > 0:
        signals["random_domain"] = True
        reasons.append(r)
        
    # Query/Redirects
    p, r = url_utils.check_redirect_parameters(normalized_url)
    if p > 0:
        if "open redirect" in (r or ""):
            signals["nested_url"] = True
        else:
            signals["suspicious_query"] = True
        reasons.append(r)
        
    # Port
    p, r = url_utils.check_suspicious_port(normalized_url)
    if p > 0:
        signals["unusual_port"] = True
        reasons.append(r)
        
    # Double Extension
    p, r = url_utils.check_double_extension(normalized_url)
    if p > 0:
        signals["double_extension"] = True
        reasons.append(r)
        
    # Subdomain Abuse
    p, r = url_utils.check_subdomain_abuse(normalized_url)
    if p > 0:
        signals["excessive_subdomains"] = True
        reasons.append(r)
        
    # Length
    if len(normalized_url) > 150:
        signals["excessive_length"] = True
        reasons.append("URL is unusually long")

    # --- Combine Scores (Base) ---
    for signal, is_active in signals.items():
        if is_active:
            score += RISK_WEIGHTS.get(signal, 0)
            
    # --- Contextual Rules (Hard Positives) ---
    # Rule A: brand-lookalike + auth keywords
    if signals["typosquatting"] and signals["suspicious_keywords"]:
        score += 40
        reasons.append("CRITICAL: Typosquatting domain combined with authentication keywords.")
        
    # Rule B: brand impersonation + login (we assume diff registrable domain if impersonation is true)
    if signals["brand_impersonation"] and signals["suspicious_keywords"]:
        score += 40
        reasons.append("CRITICAL: Brand impersonation combined with authentication/verification terms.")
        
    # Rule C: IP + login/verify
    if signals["ip_address"] and signals["suspicious_keywords"]:
        score += 30
        reasons.append("CRITICAL: IP-based URL requesting authentication.")
        
    # Rule D: userinfo @ attack + brand impersonation
    if signals["userinfo_attack"] and signals["brand_impersonation"]:
        score += 40
        reasons.append("CRITICAL: Userinfo attack used to impersonate a brand.")
        
    # Rule E: nested redirect
    if signals["nested_url"]:
        score += 20
        
    try:
        ext = tld_extract(normalized_url)
        registrable_domain = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
        is_trusted_domain = registrable_domain in trusted_domains
    except:
        is_trusted_domain = False

    # --- ML Engine Prediction ---
    if not is_trusted_domain:
        ml_label, ml_confidence = predict_url(original_url)
        if ml_label in ["phishing", "malware", "defacement"] and ml_confidence > 0.6:
            signals["ml_malicious"] = True
            score += int(50 * ml_confidence)
            reasons.append(f"Machine Learning model classified this URL as {ml_label} (Confidence: {ml_confidence:.0%})")

    # --- VirusTotal Reputation ---
    vt_report = get_url_report(normalized_url)
    if vt_report.get("available"):
        malicious = vt_report.get("malicious", 0)
        suspicious = vt_report.get("suspicious", 0)
            
        if malicious >= 6:
            score += 50
            reasons.append(f"VirusTotal reports {malicious} security engines identifying this URL as highly malicious.")
        elif malicious >= 3:
            score += 30
            reasons.append(f"VirusTotal reports {malicious} security engines identifying this URL as malicious.")
        elif malicious >= 1 or suspicious >= 1:
            # Ignore low VT detections for known trusted domains (frequent false positives)
            if not is_trusted_domain:
                score += 15
                reasons.append(f"VirusTotal flagged this URL as suspicious ({malicious} malicious, {suspicious} suspicious).")
            
    # Ensure legitimate simple URLs are not flagged just because they have "login" in path
    if len(reasons) == 1 and signals["suspicious_keywords"]:
        # If it's the ONLY reason, do not flag it as dangerous
        score = 0
        reasons = []

    # Final cap
    final_score = min(score, 100)
    
    return {
        "score": final_score,
        "reasons": list(set(reasons)), # deduplicate reasons
        "signals": signals,
        "virustotal": vt_report,
        "normalized_url": normalized_url
    }
