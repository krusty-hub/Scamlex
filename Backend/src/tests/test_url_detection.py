import pytest
from detector import check_message
import risk_scoring_engine
import url_utils

# Test 30: Basic Known Legitimate URLs
@pytest.mark.parametrize("url", [
    "https://google.com",
    "https://www.google.com",
    "https://github.com",
    "https://accounts.google.com",
    "https://www.microsoft.com",
    "https://paypal.com",
])
def test_legitimate_urls(url):
    result = risk_scoring_engine.analyze_url(url)
    assert result["score"] == 0, f"Expected 0 score for legitimate URL {url}, got {result['score']}. Reasons: {result['reasons']}"

# Test 30: Typosquatting
@pytest.mark.parametrize("url", [
    "https://paypa1.com",
    "https://paypall.com",
    "https://g00gle.com",
    "https://faceboook.com",
    "https://micros0ft.com",
])
def test_typosquatting(url):
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["typosquatting"] == True or result["signals"]["homoglyph"] == True
    assert result["score"] > 0

# Test 30: Brand Impersonation
@pytest.mark.parametrize("url", [
    "https://paypal-security-login.com",
    "https://google-account-verification.com",
    "https://amazon-security-check.com",
])
def test_brand_impersonation(url):
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["brand_impersonation"] == True
    assert result["score"] >= 30

# Test 30: @ attacks
def test_userinfo_attack():
    url = "https://paypal.com@attacker.com/login"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["userinfo_attack"] == True
    assert result["score"] > 0

# Test 30: Nested redirect
def test_nested_redirect():
    url = "https://example.com/login?redirect=https%3A%2F%2Fmalicious-example.com"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["nested_url"] == True
    assert result["score"] >= 20

# Test 30: IP URLs
def test_ip_urls():
    url = "http://192.168.10.20/login"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["ip_address"] == True
    # combined with login it should trigger Rule C
    assert result["score"] >= 55

# Test 30: Suspicious TLD
def test_suspicious_tld():
    url = "https://paypal-login.xyz"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["suspicious_tld"] == True

# Test 30: Encoding
def test_excessive_encoding():
    url = "https://example.com/%70%61%79%70%61%6c"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["obfuscation"] == True

# Test 30: Deep subdomains
def test_deep_subdomains():
    url = "https://paypal.secure.login.verify.attacker.com"
    result = risk_scoring_engine.analyze_url(url)
    assert result["signals"]["excessive_subdomains"] == True
    assert result["signals"]["brand_impersonation"] == True

# Test 31: False positive testing (legitimate paths on good domains)
@pytest.mark.parametrize("url", [
    "https://accounts.google.com/login",
    "https://login.microsoftonline.com/account",
    "https://github.com/login",
    "https://www.paypal.com/signin",
])
def test_legitimate_login_urls(url):
    result = risk_scoring_engine.analyze_url(url)
    # The score should be 0 because if 'suspicious_keywords' is the ONLY reason, it is cancelled out.
    assert result["score"] == 0, f"False positive on {url}, got {result['score']}"

# Test 36: Final Verification - check_message still works
def test_check_message_interface():
    text = "Dear Customer, your account will be blocked today. Verify immediately at http://192.168.1.1/login"
    result = check_message(text)
    assert "score" in result
    assert "level" in result
    assert "reasons" in result
    assert result["score"] > 50 # Should be highly suspicious due to IP + urgency + login
