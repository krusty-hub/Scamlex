import os
import base64
import requests
from typing import Optional
from dotenv import load_dotenv, find_dotenv

# Load environment variables (from .env file)
load_dotenv(find_dotenv())

def get_vt_api_key() -> Optional[str]:
    return os.getenv("VIRUSTOTAL_API_KEY")

def encode_url_for_vt(url: str) -> str:
    """Encode URL to Base64 without '=' padding as required by VirusTotal API v3."""
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    return url_id

def get_url_report(url: str) -> dict:
    """
    Check a URL against VirusTotal.
    1. Try to get the existing report.
    2. If not found, try to submit it and get the analysis.
    Returns a normalized dictionary.
    """
    api_key = get_vt_api_key()
    if not api_key:
        return {
            "available": False,
            "error": "VIRUSTOTAL_API_KEY not configured",
            "source": "VirusTotal"
        }

    headers = {
        "x-apikey": api_key
    }
    
    url_id = encode_url_for_vt(url)
    
    try:
        # Step 1: Check existing report
        response = requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            return normalize_vt_stats(stats)
            
        elif response.status_code == 404:
            # Step 2: Submit the URL
            submit_resp = requests.post(
                "https://www.virustotal.com/api/v3/urls",
                headers=headers,
                data={"url": url},
                timeout=5
            )
            if submit_resp.status_code == 200:
                submit_data = submit_resp.json()
                analysis_id = submit_data.get("data", {}).get("id")
                
                # Note: VT API v3 returns an analysis ID for the submission.
                # We could poll, but to avoid blocking the scanner indefinitely,
                # we just do a quick poll or return what we can. 
                # For this implementation, we will just try to fetch the analysis once 
                # after a short delay, or just return undetected for now to avoid hanging.
                # Since we don't want to block, let's just do a single lookup.
                analysis_resp = requests.get(
                    f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
                    headers=headers,
                    timeout=5
                )
                if analysis_resp.status_code == 200:
                    analysis_data = analysis_resp.json()
                    stats = analysis_data.get("data", {}).get("attributes", {}).get("stats", {})
                    return normalize_vt_stats(stats)
                
            return {
                "available": True,
                "error": "URL submitted but analysis not immediately ready.",
                "source": "VirusTotal"
            }
            
        else:
            return {
                "available": False,
                "error": f"API error: {response.status_code}",
                "source": "VirusTotal"
            }
            
    except requests.exceptions.Timeout:
        return {
            "available": False,
            "error": "VirusTotal API request timed out",
            "source": "VirusTotal"
        }
    except requests.exceptions.RequestException as e:
        return {
            "available": False,
            "error": f"Network error: {str(e)}",
            "source": "VirusTotal"
        }

def normalize_vt_stats(stats: dict) -> dict:
    return {
        "available": True,
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "undetected": stats.get("undetected", 0),
        "timeout": stats.get("timeout", 0),
        "total_engines": sum(stats.values()),
        "source": "VirusTotal"
    }
