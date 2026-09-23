# ScamCheck — Current State + Full Project Directions

This is where the project actually stands right now, based on a real review
of what you built for the demo — not a generic template. Good work so far:
the weighted scoring system and the four extra check functions (money
request, prize/reward, threats, personal info) were already ahead of the
original plan.

## What's already working

- Rule-based detection with weighted scoring + combination bonuses
  (`detector.py`)
- URL red-flag checks: shortened links, IP addresses, bank-lookalike
  domains, suspicious keywords, misleading `@` structure, punycode,
  excessive percent-encoding (`url_utils.py`)
- **NEW**: `check_suspicious_path()` and `check_redirect_parameters()` in
  `url_utils.py` — added to catch the False Negative cases you found
  yourself (see `tests/False_Negative_Test_Cases.txt`). These catch links
  hosted on legitimate platforms (like cloud storage) that get abused —
  the giveaway isn't the domain, it's the random-looking path/fragment or
  the ad-redirect-style query parameters. Read the docstrings in
  `url_utils.py` — they explain the reasoning, not just the code.
- Streamlit UI with clean status styling (`app.py`)
- SQLite storage, `init_db()` / `seed_from_examples()` / `get_all_patterns()`
  working (`db.py`)
- 15 seed patterns in `seed_patterns.py` (target for full build: 25-30+)

## Known open issues — fix these before moving on to new features

These were found through real testing, not guessed at. Fix them in this
order, since some make others easier to verify:

1. **Word-boundary bug in keyword matching.** Every `check_*` function that
   does `if keyword in text` will false-trigger on a keyword that appears
   *inside* another word — e.g. the NIN check fires on the word
   "thannina" because "nin" is a substring of it. Confirmed with:
   ```python
   from detector import check_pin_otp_request
   check_pin_otp_request("view it at thannina.html")
   # -> (15, "Sensitive Keyword Request Detected")  <- false positive
   ```
   Fix: use `re.search(r'\bkeyword\b', text)` (word-boundary matching)
   instead of `keyword in text`, for every keyword-list check across
   `detector.py`. This is a bigger fix than it sounds like — it touches
   ~8 functions — but it's the same pattern repeated, so once you fix
   one you can apply the same fix everywhere.(FIXED)

2. **Bank-lookalike dictionary bug.** The `banks` dict in
   `check_valid_bank_url()` has a `"gtb": "gtbank"` entry where the value
   isn't a real domain. Confirmed this causes a false positive on a real
   GTBank URL:
   ```python
   check_valid_bank_url("https://www.gtbank.com/personal-banking")
   # -> (3, "Possible bank lookalike domain")  <- false positive on a REAL bank URL
   ```
   You've already started fixing this — worth double-checking the fix
   against this exact test case once it's in.(FIXED)

3. **Generic reason strings.** `check_urgency_language()`,
   `check_pin_otp_request()`, and `check_generic_greeting()` build a
   `*_detected` list tracking which specific phrase matched, then never
   use it — the reason string just says generic text like "Urgency Phrase
   Detected" instead of naming the actual phrase found. Fix: work the
   detected-phrase list into the actual reason string so the "why did it
   flag this" explanation is specific, not generic. This matters for the
   evaluation criterion about explaining your own logic clearly.(FIXED)

4. **FN03 is still an open case.** `http://unichemlabs.com/index.php?8b9sol`
   still scores 0 — it's a different pattern from the other three (a
   compromised legitimate small-business site with a short, malformed
   query string instead of proper key=value pairs). This is a good one to
   think through as a team before deciding whether it's worth a dedicated
   check or an acceptable gap for v1.(FIXED)

## Full project roadmap from here

**Phase 1 (next few weeks) — everyone:**
- Fix the three known issues above
- Grow `seed_patterns.py` to 25-30+ examples (mix of scam tactics: fake
  job offers, romance scams, fake customer care, phishing links, fake
  refunds — plus tricky "safe" examples that could otherwise look
  suspicious)
- Write real tests in a `test_detector.py` and `test_url_utils.py` —
  including the False Negative cases as permanent regression tests, so
  future changes can't silently reintroduce this exact bug
- Basic user accounts (so someone can save their check history)

**Phase 2 — community layer:**
- Community scam reporting: implement `add_reported_scam()` in `db.py`
  (currently a stub) so users can submit new scam examples that grow the
  shared database
- Illustrator's production-grade risk-badge visuals and reporting-flow UI

**Phase 3 (stretch, time-permitting) — deeper dev only:**
- Lightweight ML classifier (scikit-learn) trained on the grown pattern
  database, run alongside the rule-based system, not replacing it
- Deploy to Streamlit Community Cloud or Render for a real shareable link

## Folder structure

```
scamcheck/
├── README.md                          <- this file
├── src/
│   ├── detector.py                     <- your actual working detection engine
│   ├── url_utils.py                     <- URL checks + the 2 new functions
│   ├── app.py                            <- your working Streamlit UI
│   └── db.py                              <- your working SQLite layer
├── data/
│   └── seed_patterns.py                 <- your 15 seed examples (grow this)
└── tests/
    └── False_Negative_Test_Cases.txt   <- the FN cases you found — turn
                                             these into real pytest tests
```
