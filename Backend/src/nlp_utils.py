import spacy
import re

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: spaCy model 'en_core_web_sm' not found. Please install it.")
    nlp = None

ACTIONABLE_VERBS = {"send", "provide", "verify", "give", "share", "click", "input", "enter", "update"}
PREVENTATIVE_MODIFIERS = {"not", "never", "protect", "avoid", "secure", "private", "ensure"}

def analyze_semantic_intent(text: str, keywords: list[str]) -> str:
    """
    Analyzes the grammatical context of given keywords in the text.
    Returns: "Actionable_Demand", "Security_Warning", or "Neutral"
    """
    if not nlp:
        # Fallback to simple matching if NLP is not available
        text_lower = text.lower()
        for k in keywords:
            if re.search(rf"\b{re.escape(k)}\b", text_lower):
                return "Actionable_Demand"
        return "Neutral"

    # Pre-check if any keyword exists in the text before running NLP
    text_lower = text.lower()
    keyword_found = False
    for kw in keywords:
        if re.search(rf"\b{re.escape(kw)}\b", text_lower):
            keyword_found = True
            break
            
    if not keyword_found:
        return "Neutral"

    doc = nlp(text_lower)
    
    keyword_tokens = []
    
    # 1. Locate the keyword tokens in the parsed document
    # For multi-word keywords (like "bank pin"), we just look for any word part
    # that is highly indicative, e.g. "pin", "password", "bvn", "ssn".
    # We will split keywords by space to catch the nouns.
    keyword_parts = set()
    for kw in keywords:
        for part in kw.split():
            keyword_parts.add(part)
            
    for token in doc:
        if token.text in keyword_parts:
            keyword_tokens.append(token)

    if not keyword_tokens:
        return "Neutral" # Fallback if spaCy missed the exact token but regex matched

    # 2. Analyze the context of the keyword tokens
    for token in keyword_tokens:
        # Trace back to the head (verb usually) governing this noun
        head = token.head
        
        # If the head is a verb or root
        head_verb = head.lemma_
        
        # Look for negative modifiers (e.g. "not", "never") connected to the verb or the token itself
        has_negation = False
        
        # Check children of the verb
        for child in head.children:
            if child.dep_ == 'neg' or child.lemma_ in PREVENTATIVE_MODIFIERS:
                has_negation = True
                
        # Check children of the token itself (e.g. "never share")
        for child in token.children:
            if child.dep_ == 'neg' or child.lemma_ in PREVENTATIVE_MODIFIERS:
                has_negation = True
                
        # Look for preventative verbs or negations in the lineage up to the root
        current = head
        is_preventative_lineage = False
        while current != current.head:
            # Check children of this ancestor
            for child in current.children:
                if child.dep_ == 'neg' or child.lemma_ in PREVENTATIVE_MODIFIERS:
                    is_preventative_lineage = True
                    break
            
            if current.lemma_ in PREVENTATIVE_MODIFIERS:
                is_preventative_lineage = True
                
            if is_preventative_lineage:
                break
            current = current.head
            
        # Check root
        if current.lemma_ in PREVENTATIVE_MODIFIERS:
            is_preventative_lineage = True
        for child in current.children:
            if child.dep_ == 'neg' or child.lemma_ in PREVENTATIVE_MODIFIERS:
                is_preventative_lineage = True
                break
            
        if is_preventative_lineage:
            has_negation = True
            
        # Classify based on verb and modifiers
        if has_negation:
            return "Security_Warning"
        elif head_verb in ACTIONABLE_VERBS:
            return "Actionable_Demand"
            
    # If no explicit verb match, default to Neutral to avoid overflagging safe statements
    return "Neutral"
