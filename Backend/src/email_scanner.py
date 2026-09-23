import dns.resolver
import whois
import datetime
import tldextract
from email_validator import validate_email, EmailNotValidError
from Levenshtein import distance
from typing import TypedDict, Tuple, List, Optional
from Backend.src.trusted_domains import get_all_trusted_domains

class EmailRiskResult(TypedDict):
    score: int
    level: str
    reasons: list[str]

DISPOSABLE_DOMAINS = {
    "mailinator.com", "temp-mail.org", "10minutemail.com", "guerrillamail.com",
    "sharklasers.com", "yopmail.com", "getnada.com", "dispostable.com",
    "throwawaymail.com", "tempmail.com"
}

def analyze_email(email_address: str) -> EmailRiskResult:
    total_points = 0
    reasons = []
    
    email_address = email_address.strip()
    
    # 1. Format Validation
    try:
        # We don't use check_deliverability here because we'll do MX check manually for better scoring logic
        v = validate_email(email_address, check_deliverability=False)
        email_address = v.normalized
        domain = v.domain
    except EmailNotValidError as e:
        return {
            "score": 100,
            "level": "RED",
            "reasons": [f"Invalid email format: {str(e)}"]
        }

    # 2. DNS / MX Checks
    has_mx = False
    try:
        mx_records = dns.resolver.resolve(domain, 'MX')
        if len(mx_records) > 0:
            has_mx = True
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        has_mx = False
    
    if not has_mx:
        total_points += 80
        reasons.append("Domain has no valid MX records (cannot receive mail).")

    # 3. Disposable Domain Detection
    if domain.lower() in DISPOSABLE_DOMAINS:
        total_points += 80
        reasons.append(f"Domain '{domain}' is a known disposable email provider.")

    # 4. Typosquatting / Impersonation
    trusted_domains = get_all_trusted_domains()
    # If the domain is exactly a trusted domain, it's generally safe (though spoofing is checked later)
    if domain.lower() not in trusted_domains:
        # Check Levenshtein distance for typosquatting
        ext = tldextract.extract(domain)
        core_domain = ext.domain
        
        is_typosquatting = False
        for trusted in trusted_domains:
            trusted_ext = tldextract.extract(trusted)
            trusted_core = trusted_ext.domain
            
            # Simple heuristic: if the strings are very close (distance 1 or 2) and length > 4
            if len(trusted_core) > 4 and len(core_domain) > 4:
                dist = distance(core_domain, trusted_core)
                if dist == 1:
                    is_typosquatting = True
                    total_points += 50
                    reasons.append(f"Domain looks suspiciously similar to trusted brand '{trusted_core}'.")
                    break

    # 5. Domain Age (WHOIS)
    try:
        w = whois.whois(domain)
        creation_date = w.creation_date
        if type(creation_date) is list:
            creation_date = creation_date[0]
            
        if isinstance(creation_date, datetime.datetime):
            age_days = (datetime.datetime.now() - creation_date).days
            if age_days < 30:
                total_points += 30
                reasons.append(f"Domain is very new (registered {age_days} days ago).")
            elif age_days < 180:
                total_points += 15
                reasons.append(f"Domain is relatively new (registered {age_days} days ago).")
    except Exception as e:
        # WHOIS failed or domain not found
        pass

    # 6. SPF / DMARC Checks
    try:
        txt_records = dns.resolver.resolve(domain, 'TXT')
        has_spf = any("v=spf1" in str(r) for r in txt_records)
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        has_spf = False

    try:
        dmarc_records = dns.resolver.resolve(f"_dmarc.{domain}", 'TXT')
        has_dmarc = any("v=DMARC1" in str(r) for r in dmarc_records)
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        has_dmarc = False

    if not has_spf:
        total_points += 10
        reasons.append("Domain is missing SPF authentication records.")
    
    if not has_dmarc:
        total_points += 10
        reasons.append("Domain is missing DMARC authentication records.")

    # Calculate Level
    total_points = min(total_points, 100)
    
    if total_points <= 19:
        level = "GREEN"
    elif total_points <= 59:
        level = "YELLOW"
    else:
        level = "RED"

    if not reasons:
        reasons.append("No significant risk factors found.")

    return {
        "score": total_points,
        "level": level,
        "reasons": reasons
    }
