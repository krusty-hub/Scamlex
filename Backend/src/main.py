from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import core detection logic and database setup
from Backend.src.detector import check_message
from Backend.src import db
from Backend.src.email_scanner import analyze_email

app = FastAPI(title="Scamlex Backend API")
executor = ThreadPoolExecutor(max_workers=10)

# Allow requests from browser extension content scripts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to build SQLite DB and seed patterns automatically
@app.on_event("startup")
def startup_db_client():
    db.init_db()
    try:
        from Backend.data.seed_patterns import SEED_EXAMPLES
        db.seed_from_examples(SEED_EXAMPLES)
    except Exception as e:
        print(f"DB Seeding skipped/failed: {e}")

class ScanPayload(BaseModel):
    text: str
    url: str

def extract_flagged_texts(text: str, result: dict) -> list[str]:
    """
    Extracts specific URLs or key flagged phrases from the payload
    that should be highlighted by content.js on the page.
    """
    flagged = []
    
    # Check if detector output contains explicit matched tokens or URLs
    if "matched_terms" in result and isinstance(result["matched_terms"], list):
        flagged.extend(result["matched_terms"])
        
    if "urls" in result and isinstance(result["urls"], list):
        flagged.extend(result["urls"])

    # Fallback/Regex extraction: Extract raw URLs from the scanned text
    url_pattern = r'https?://[^\s]+'
    found_urls = re.findall(url_pattern, text)
    flagged.extend(found_urls)

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for item in flagged:
        clean_item = item.strip()
        if clean_item and clean_item.lower() not in seen:
            seen.add(clean_item.lower())
            deduped.append(clean_item)
            
    return deduped

@app.post("/scan")
async def scan_text(data: ScanPayload):
    try:
        # Wrap the synchronous processing in an executor with a strict 10s timeout
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(executor, check_message, data.text),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        return {
            "isScam": False,
            "score": 0,
            "level": "TIMEOUT",
            "message": "Scan timed out. A network service (like VirusTotal, DNS, or Whois) took too long to respond.",
            "reasons": [],
            "flaggedTexts": []
        }
    except Exception as e:
        return {
            "isScam": False,
            "score": 0,
            "level": "ERROR",
            "message": f"Internal scanner error: {str(e)}",
            "reasons": [],
            "flaggedTexts": []
        }
        
    reasons_list = result.get("reasons", [])
    flagged_items = extract_flagged_texts(data.text, result)
    
    # Construct primary summary message for top of card
    summary_msg = reasons_list[0] if reasons_list else "No significant indicators found."

    return {
        "isScam": result["score"] >= 60,
        "score": result["score"],
        "level": result.get("level", "LOW"),
        "message": summary_msg,
        "reasons": reasons_list,
        "flaggedTexts": flagged_items
    }

class EmailScanPayload(BaseModel):
    email: str

@app.post("/scan_email")
async def scan_email_endpoint(data: EmailScanPayload):
    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(executor, analyze_email, data.email),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        return {
            "score": 0,
            "level": "TIMEOUT",
            "message": "Scan timed out during DNS/WHOIS checks.",
            "reasons": []
        }
    except Exception as e:
        return {
            "score": 0,
            "level": "ERROR",
            "message": f"Internal email scanner error: {str(e)}",
            "reasons": []
        }
        
    return {
        "score": result.get("score", 0),
        "level": result.get("level", "LOW"),
        "reasons": result.get("reasons", [])
    }