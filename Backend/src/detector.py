"""
detector.py — Core scam-detection logic for ScamCheck.

WEEK 1 GOAL: get check_message() working as a plain Python function you can
call from the terminal. No database, no UI needed yet — just prove the logic
works on real example text.

Each "check_*" function below looks for ONE type of red flag and returns
points + a plain-English reason if it finds something. check_message() runs
all of them and combines the results into a final risk score.
"""


from typing import TypedDict, Optional
from Backend.src import url_utils
from Backend.src import nlp_utils
import re
import os
import joblib

try:
    from google import genai
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    if GEMINI_API_KEY:
        client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        client = None
except ImportError:
    client = None
    GEMINI_API_KEY = None

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scam_classifier.pkl")
try:
    ml_pipeline = joblib.load(MODEL_PATH)
except Exception as e:
    ml_pipeline = None
    print(f"Warning: Could not load ML model from {MODEL_PATH}. Exception: {e}")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskResult(TypedDict):
    score: int            # 0-100, higher = more suspicious
    level: str             # "green" | "yellow" | "red"
    reasons: list[str]     # plain-English explanations for the score


# Score -> level thresholds. Feel free to tune these once you've tested
# against real examples — these are starting points, not fixed rules.

#max level points
GREEN_MAX = 19
YELLOW_MAX = 59

#check points
URGENCY_LANGUAGE_POINT = 5
SENSITIVE_SECURITY_KEYWORD_POINT = 15
SUSPICIOUS_LINK_CAP_POINT = 7
GENERIC_GREETING_POINT = 2
MONEY_REQUEST_POINTS = 8
PRIZE_REWARD_POINTS = 6
THREAT_POINTS = 8
PERSONAL_INFO_POINTS = 8

#combination points
PIN_AND_URGENCY = 20
LINK_AND_URGENCY = 15
LINK_AND_THREAT = 15
MONEY_AND_URGENCY = 15
PERSONAL_INFO_AND_URGENCY = 10


@app.get("/check_message")
def check_message(text: str) -> RiskResult:
    
    text = text.lower().strip()
    
    # 1. Extract URLs and remove them from the message text for independent analysis
    url_list = url_utils.url_extractor(text)
    
    text_without_urls = text
    for url in url_list:
        text_without_urls = text_without_urls.replace(url.lower(), "")
    text_without_urls = text_without_urls.strip()
    
    is_critical, critical_reason = check_critical_intents(text_without_urls)
    has_padding, padding_reason = check_social_engineering_padding(text_without_urls)
    
    total_points = 0
    reasons = []
    
    urgency_points, urgency_reason = check_urgency_language(text_without_urls)
    total_points += urgency_points
    reasons.append(urgency_reason)
    
    pin_points, pin_reason = check_pin_otp_request(text_without_urls)
    total_points += pin_points
    reasons.append(pin_reason)
    
    link_points, link_reasons = check_suspicious_links(url_list)
    total_points += link_points
    reasons.extend(link_reasons)
    
    greeting_points, greeting_reason = check_generic_greeting(text_without_urls)
    total_points += greeting_points
    reasons.append(greeting_reason)
    
    money_points, money_reason = check_money_request(text_without_urls)
    total_points += money_points
    reasons.append(money_reason)
    
    prize_points, prize_reason = check_prize_or_reward(text_without_urls)
    total_points += prize_points
    reasons.append(prize_reason)
    
    threat_points, threat_reason = check_threats_or_consequences(text_without_urls)
    total_points += threat_points
    reasons.append(threat_reason)
    
    personal_info_points, personal_info_reason = check_personal_information_request(text_without_urls)
    total_points += personal_info_points
    reasons.append(personal_info_reason)
    
    #combination bonuses
    #didnt use if-elif-else because multiple checks can be true at the same time
    if pin_reason and urgency_reason:
        total_points += PIN_AND_URGENCY
        reasons.append("Urgency combined with a request for sensitive security information.")
    if link_reasons and urgency_reason:
        total_points += LINK_AND_URGENCY
        reasons.append("Urgency combined with a suspicious link.")
    if link_reasons and threat_reason:
        total_points += LINK_AND_THREAT
        reasons.append("A suspicious link is combined with a threat or warning of negative consequences.")
    if money_reason and urgency_reason:
        total_points += MONEY_AND_URGENCY
        reasons.append("An urgent request to send or transfer money.")
    if personal_info_reason and urgency_reason:
        total_points += PERSONAL_INFO_AND_URGENCY
        reasons.append("An urgent request for personal or identifying information.")
        
    if has_padding:
        if urgency_reason or money_reason or link_reasons or pin_reason or personal_info_reason:
            total_points += 20
            reasons.append("Friendly social engineering padding combined with a malicious request or link.")
    
    # ML Classification acting as an assistant (Strict Thresholds & Max Pooling)
    if ml_pipeline is not None and text_without_urls:
        try:
            # Segment text into sentences
            segments = [s.strip() for s in re.split(r'[.!?\n]+', text_without_urls) if s.strip()]
            if not segments:
                segments = [text_without_urls]
                
            max_confidence = 0.0
            
            for segment in segments:
                cleaned = clean_text(segment)
                if cleaned:
                    probas = ml_pipeline.predict_proba([cleaned])[0]
                    classes = ml_pipeline.classes_
                    
                    malicious_idx = -1
                    for i, c in enumerate(classes):
                        if str(c).lower() in ['1', 'scam', 'phishing']:
                            malicious_idx = i
                            break
                            
                    if malicious_idx != -1:
                        conf = probas[malicious_idx]
                        if conf > max_confidence:
                            max_confidence = conf
                            
            if max_confidence > 0.85:
                total_points += 15
                reasons.append(f"ML text analysis detected highly suspicious patterns (Confidence: {max_confidence:.0%})")
        except Exception as e:
            print(f"ML Pipeline error: {e}")

    total_points = min(total_points, 100)
    reasons = [reason for reason in reasons if reason is not None]#removes None
    
    # Critical Override
    if is_critical:
        total_points += 50
        reasons.insert(0, critical_reason)
        
    total_points = min(total_points, 100)
    
    if total_points <= GREEN_MAX:
        level = "GREEN"
    elif total_points <= YELLOW_MAX:
        level = "YELLOW"
    else:
        level = "RED"
        
    # Gemini AI Deep Scan for borderline (YELLOW) messages
    if level == "YELLOW" and client is not None and GEMINI_API_KEY:
        try:
            prompt = f"Analyze the following message for phishing, scam, or fraud tactics. Respond ONLY with a risk score from 0 to 100 (just the number) on the first line, and a 1-sentence explanation on the second line.\n\nMessage: '{text}'"
            response = client.models.generate_content(
                model='gemini-3.1-flash-lite',
                contents=prompt,
                config=genai.types.GenerateContentConfig(max_output_tokens=100)
            )
            lines = response.text.strip().split('\n')
            gemini_score_match = re.search(r'\d+', lines[0])
            if gemini_score_match:
                gemini_score = int(gemini_score_match.group())
                gemini_reason = lines[1] if len(lines) > 1 else "No explanation provided."
                
                if gemini_score >= 70:
                    total_points += 40
                    reasons.append(f"Gemini AI Deep Scan flagged this as a scam ({gemini_score}/100): {gemini_reason}")
                elif gemini_score <= 30:
                    total_points = max(0, total_points - 20)
                    reasons.append(f"Gemini AI Deep Scan considers this safe: {gemini_reason}")
                    
                total_points = min(total_points, 100)
                if total_points <= GREEN_MAX:
                    level = "GREEN"
                elif total_points <= YELLOW_MAX:
                    level = "YELLOW"
                else:
                    level = "RED"
        except Exception as e:
            print(f"Gemini API error: {e}")
            
    riskResult: RiskResult = {
        "score" : total_points,
        "level" : level,
        "reasons" : reasons        
        }    
    
    return riskResult

def check_critical_intents(text: str) -> tuple[bool, Optional[str]]:
    critical_terms = ["bank pin", "password", "ssn", "social security number", "otp", "bvn", "atm pin", "bank details"]
    
    intent = nlp_utils.analyze_semantic_intent(text, critical_terms)
    
    if intent == "Actionable_Demand":
        return True, f"CRITICAL: Immediate override triggered by actionable request for sensitive information."
    return False, None

def check_social_engineering_padding(text: str) -> tuple[bool, Optional[str]]:
    padding_phrases = ["kindly", "dear friend", "good morning", "good afternoon", "good evening", "how are you", "hi pretty", "dear customer"]
    detected = []
    for phrase in padding_phrases:
        if re.search(rf"\b{re.escape(phrase)}\b", text):
            detected.append(phrase)
    
    if detected:
        return True, f"Social engineering padding detected: {', '.join(detected)}"
    return False, None

def check_urgency_language(text: str) -> tuple[int, Optional[str]]:
    
    urgency_phrases = urgency_phrases = [  #Add More
    "act now",
    "act immediately",
    "account will be blocked",
    "account will be suspended",
    "immediately",
    "within 24 hours",
    "within 48 hours",
    "urgent action required",
    "urgent response required",
    "respond immediately",
    ]
    
    total_points = 0
    reason_string = None
    urgency_phrases_detected = []
    
    for urgency_phrase in urgency_phrases:
        if re.search(rf"\b{re.escape(urgency_phrase)}\b", text):
            total_points += URGENCY_LANGUAGE_POINT
            urgency_phrases_detected.append(urgency_phrase)            
    
    if urgency_phrases_detected:
        phrases_str = ", ".join([f"'{phrase}'" for phrase in urgency_phrases_detected])
        reason_string = f"Urgency Phrase Detected: {phrases_str}"           
        
    return (total_points, reason_string)


def check_pin_otp_request(text: str) -> tuple[int, Optional[str]]:
    sensitive_keywords = [#add more
    "pin",
    "otp",
    "password",
    "passcode",
    "cvv",
    "security code",
    "verification code",
    "account details",
    "login details",
    "nin",
    "bvn"
    ]
    
    total_points = 0
    reason_string = None
    
    intent = nlp_utils.analyze_semantic_intent(text, sensitive_keywords)
    
    if intent == "Actionable_Demand":
        total_points += SENSITIVE_SECURITY_KEYWORD_POINT
        reason_string = "Sensitive Keyword Request Detected (Actionable Demand)"
        
    return (total_points, reason_string)


from Backend.src import risk_scoring_engine

def check_suspicious_links(url_list: list[str]) -> tuple[int, list[str]]:
    """
    Pass pre-extracted URLs through the multi-layer risk scoring engine.
    """
    total_points = 0
    total_reasons_list = []
    
    for url in url_list:
        result = risk_scoring_engine.analyze_url(url)
        url_points = result["score"]
        url_reasons_list = result["reasons"]
        
        # We no longer cap individual URL points at 7. The risk engine handles its own capping (up to 100).
        total_points += url_points
        total_reasons_list.extend(url_reasons_list)
        
    return (total_points, total_reasons_list)


def check_generic_greeting(text: str) -> tuple[int, Optional[str]]:
    
    generic_greetings = [#add more
        "dear customer",
        "dear valued customer",
        "dear account holder"
    ]
    
    total_points = 0
    reason_string = None
    generic_greetings_detected = []
    
    for greeting in generic_greetings:
        if re.search(rf"\b{re.escape(greeting)}\b", text):
            total_points += GENERIC_GREETING_POINT
            generic_greetings_detected.append(greeting)
            
    if generic_greetings_detected:
        phrases_str = ", ".join([f"'{phrase}'" for phrase in generic_greetings_detected])
        reason_string = f"Generic Greeting Detected: {phrases_str}"
    return (total_points, reason_string)

#Added check_* functions
#check_money_request()
#check_prize_or_reward()
#check_threats_or_consequences()
#check_personal_information_request()

def check_money_request(text: str) -> tuple[int, Optional[str]]:
    
    points = 0
    reason_string = None
    money_request_detected = []
    
    money_request_phrases = [
    "send money",
    "send funds",
    "send payment",
    "make a payment",
    "make payment",
    "transfer money",
    "transfer funds",
    "make a transfer",
    "pay now",
    "pay immediately",
    "pay the fee",
    "pay the charge",
    "pay the amount",
    "pay the balance",
    "send the amount",
    "transfer the amount",
    "deposit money",
    "deposit funds",
    "send to this account",
    "transfer to this account",
    ]
    
    for phrase in money_request_phrases:
        if re.search(rf"\b{re.escape(phrase)}\b", text):
            points += MONEY_REQUEST_POINTS
            money_request_detected.append(phrase)
    
    if money_request_detected:
        phrases_str = ", ".join(f"'{phrase}'"for phrase in money_request_detected)
        reason_string = f"Money Request Detected: {phrases_str}"
      
    return (points, reason_string)

def check_prize_or_reward(text: str) -> tuple[int, Optional[str]]:
    
    points = 0
    reason_string = None
    prize_or_reward_detected = []
    
    prize_reward_phrases = [
    "you have won",
    "you've won",
    "you are a winner",
    "you've been selected",
    "you have been selected",
    "congratulations, you have won",
    "claim your prize",
    "claim your reward",
    "claim your winnings",
    "collect your prize",
    "collect your reward",
    "lottery winner",
    "lottery prize",
    "cash prize",
    "cash reward",
    "you won a prize",
    "you won a reward",
    "exclusive reward",
    "special reward",
    "free gift",
    ]
    
    for phrase in prize_reward_phrases:
        if re.search(rf"\b{re.escape(phrase)}\b", text):
            points += PRIZE_REWARD_POINTS
            prize_or_reward_detected.append(phrase)
            
    if prize_or_reward_detected:
        phrases_str = ", ".join(f"'{phrase}'"for phrase in prize_or_reward_detected)
        reason_string = f"The message claims you have won a prize or reward: {phrases_str}"
    
    
    return (points, reason_string)

def check_threats_or_consequences(text: str) -> tuple[int, Optional[str]]:
    
    points = 0
    reason_string = None
    threats_or_consequences_detected = []
    
    threat_phrases = [
    "legal action",
    "legal proceedings",
    "court action",
    "arrest warrant",
    "you will be arrested",
    "you may be arrested",
    "account will be closed",
    "account will be suspended",
    "account will be blocked",
    "access will be revoked",
    "you will lose access",
    "service will be terminated",
    "service will be suspended",
    "you will be fined",
    "a penalty will apply",
    "penalty will be charged",
    "failure to comply",
    "failure to respond",
    ]
    
    for phrase in threat_phrases:
        if re.search(rf"\b{re.escape(phrase)}\b", text):
            points += THREAT_POINTS
            threats_or_consequences_detected.append(phrase)
            
            
    if threats_or_consequences_detected:
        phrases_str = ", ".join(f"'{phrase}'" for phrase in threats_or_consequences_detected)
        reason_string = f"The message contains threats or warnings about negative consequences: {phrases_str}"
        
    return (points, reason_string)

def check_personal_information_request(text: str) -> tuple[int, Optional[str]]:
    
    points = 0
    reason_string = None
    personal_info_request_detected = []
    
    personal_info_phrases = [
    "date of birth",
    "home address",
    "residential address",
    "id number",
    "identification number",
    "national id",
    "identity card",
    "passport number",
    "driver's license",
    "social security number",
    "bank account number",
    ]
    
    for phrase in personal_info_phrases:
        if re.search(rf"\b{re.escape(phrase)}\b", text):
            points += PERSONAL_INFO_POINTS
            personal_info_request_detected.append(phrase)
            
    if personal_info_request_detected:
        phrases_str = ", ".join(f"'{phrase}'" for phrase in personal_info_request_detected)
        reason_string = f"The message asks for personal or identifying information: {phrases_str}"
            
    return (points, reason_string)    
        
if __name__ == "__main__":
    test_messages = [
        "Dear Customer, your account will be blocked in 24 hours. Click here to verify: http://gtb-secure-verify.com",        
        "Hi Chidi, your OPay wallet statement for July is ready to view.",        
        "URGENT: Your BVN has been suspended. Send your PIN and OTP to this number immediately to reactivate.",
    ]
    
    added_test_messages = [
        "Please respond immediately to this message.",
        "Send your OTP to verify your account.",
        "Click here to claim your reward: [link]",
        "Your account will be suspended if you do not respond." ,
        "URGENT: Your account will be suspended today. Send your OTP and password immediately to avoid permanent closure."
    ]
    
    added_test_messages_2 = [
        "Hi Chidi, your OPay wallet statement for July is ready to view.",
        "Please respond immediately to confirm your appointment for tomorrow.",
        "Your electricity bill is due tomorrow. Please make your payment through the official app.",
        "Please provide your date of birth to complete your registration.",
        "Congratulations, you have won a cash prize. Claim your reward today.",
        "Dear Customer, please respond immediately to this message.",
        "Your account will be suspended if you do not respond within 24 hours.",
        "URGENT: Send your OTP immediately to prevent your account from being blocked.",
        "Dear Customer, your account will be blocked today. Verify immediately at http://gtb-secure-verify.com",
        "URGENT: Your account will be permanently suspended. Send your OTP, PIN and password immediately, or legal action will be taken. Pay the verification fee at http://secure-gtb-verify.com",
        "",
        ""
    ]
    
    for msg in test_messages:
        print("-" * 60)
        print(f"Message: {msg}")
        result = check_message(msg)
        print(f"Result: {result}")
