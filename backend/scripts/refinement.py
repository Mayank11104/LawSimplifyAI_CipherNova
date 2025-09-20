import json, re
from collections import defaultdict, Counter
from datetime import date
from dateutil import parser as dtp

# --- Refinement Script Logic (Copied from your file) ---

# --- Config knobs ---
MIN_SPAN_CONF = 0.55
MIN_SPAN_LEN = 25
MERGE_GAP_CHARS = 8

DATE_ROLE_PATTERNS = [
    ("EFFECTIVE_START",  r"\beffective\s+from\b|\bcomes?\s+into\s+force\b|\bcommence(?:s|ment)\b", 2.0),
    ("READINESS_REVIEW", r"\breadiness\s+review\b|\binterim\s+review\b|\bmilestone\b|\breview\b", 1.6),
    ("FILING_DEADLINE",  r"\b(return|report|filing|submission)s?\s+due\b|\bdue\s+by\b|\bdeadline\b", 2.2),
    ("SUNSET",           r"\bexpires\b|\bsunset\b|\bceases?\s+to\s+apply\b", 1.8),
    ("TRANSITION_END",   r"\btransition(?:al)?\s+period\b|\bgrace\s+period\b|\buntil\b", 1.4),
]

SECTION_PRIORS = {
    "Compliance & Regulatory": {"EFFECTIVE_START": 0.6, "FILING_DEADLINE": 0.5, "READINESS_REVIEW": 0.4},
    "Disclosure & Reporting":  {"FILING_DEADLINE": 0.7},
    "Contracting Requirements":{"EFFECTIVE_START": 0.2},
    "Governance & Risk":       {"READINESS_REVIEW": 0.3},
}

BUCKETS = {
    "obligations": {"Audit_Records","Obligations","Compliance_Regulatory","Access_Control","Security_Measures","BYOD_Endpoint_Security","Contracting_Requirements","Data_Security"},
    "rights": {"Rights"},
    "penalties": {"Enforcement_Penalties","Compliance_Termination","Deletion_Return"},
    "safety": {"Health_Safety"},
    "dispute_resolution": {"Dispute_Resolution_Arbitration","Industrial_Relations"},
    "filings_reporting": {"Disclosure_Reporting","Notices","Incident_Reporting","Reporting_Incident","Disclosure_Privacy_Requirements"},
    "governance": {"Governance_Risk","Corporate_Governance","Statutory_Interpretation"},
    "cross_references": {"Cross_Reference"},
}

DATE_TEXT_REGEX = re.compile(r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4}|[A-Za-z]{3,9}\s+\d{4}|\d{4})\b")

def _norm_space(s): return re.sub(r"\s+", " ", s).strip()

def robust_parse_date(txt):
    try:
        d = dtp.parse(txt, dayfirst=True, fuzzy=True, default=date(1900,1,1))
        if d.year < 1900 or d.year > 2100: return None
        return d.date().isoformat()
    except Exception:
        return None

def choose_date_role(date_item):
    text = date_item.get("evidence","") + " " + date_item.get("context","")
    section = date_item.get("section")
    score = Counter()
    window = text.lower()
    for role, pat, w in DATE_ROLE_PATTERNS:
        if re.search(pat, window):
            score[role] += w
    if section in SECTION_PRIORS:
        for role, w in SECTION_PRIORS[section].items():
            score[role] += w
    if not score:
        if re.search(r"\bdue\b|\bdeadline\b", window): return "FILING_DEADLINE", 0.5
        return "EFFECTIVE_START", 0.4
    role, s = score.most_common(1)[0]
    conf = min(0.5 + 0.1*s, 0.95)
    return role, conf

def filter_spans(clauses):
    cleaned = []
    for c in clauses:
        if c.get("confidence", 0) < MIN_SPAN_CONF: continue
        if len(_norm_space(c.get("text",""))) < MIN_SPAN_LEN: continue
        cleaned.append(c)
    return cleaned

def merge_adjacent_spans(spans):
    spans = sorted(spans, key=lambda x: (x.get("section",""), x.get("category",""), x["start"], x["end"]))
    out = []
    for s in spans:
        if out and \
           out[-1]["section"] == s["section"] and \
           out[-1]["category"] == s["category"] and \
           s["start"] - out[-1]["end"] <= MERGE_GAP_CHARS:
            out[-1]["text"] = _norm_space(out[-1]["text"] + " " + s["text"])
            out[-1]["end"]  = max(out[-1]["end"], s["end"])
            out[-1]["confidence"] = max(out[-1]["confidence"], s.get("confidence",0))
        else:
            out.append(dict(s))
    return out

def dedupe_keep_longer(items):
    seen = set(); out=[]
    for t in items:
        k = _norm_space(t)
        if k in seen: continue
        seen.add(k); out.append(t)
    return out

def bucketize(items):
    res = {k:[] for k in BUCKETS}
    for cl in items:
        cat = cl.get("category")
        text = _norm_space(cl.get("text",""))
        for b, cats in BUCKETS.items():
            if cat in cats and text:
                res[b].append(text)
    for b in res:
        res[b] = dedupe_keep_longer(res[b])
    return res

def select_doc_type(doc_type, clauses, statutes):
    if doc_type: return doc_type
    text_blob = " ".join([c.get("text","") for c in clauses]).lower()
    if "code" in text_blob and "labour" in text_blob: return "Labour Compliance Code Summary"
    if "policy" in text_blob and "compliance" in text_blob: return "Compliance Policy"
    return "Legal Summary"

def refine(profile):
    doc_type = profile.get("document_type")
    statutes = profile.get("statutes_or_codes", [])
    juris = profile.get("jurisdiction")
    clauses = profile.get("clauses", [])
    raw_dates = profile.get("important_dates", [])
    
    keep = filter_spans(clauses)
    merged = merge_adjacent_spans(keep)
    
    dates = []
    for d in raw_dates:
        txt = d.get("text","")
        iso = robust_parse_date(txt) or d.get("iso")
        evid = d.get("evidence","") or ""
        m = DATE_TEXT_REGEX.search(evid)
        if m:
            iso_from_evid = robust_parse_date(m.group(0))
            if iso_from_evid: iso = iso_from_evid
        role, conf = choose_date_role({"evidence": evid, "section": d.get("section"), "context": ""})
        dates.append({"text": txt, "iso": iso, "role": role, "confidence": round(conf,3), "evidence": _norm_space(evid)[:240]})
        
    buckets = bucketize(merged)
    
    scope_clause = next((c for c in merged if c["category"] in ("Definitions","Applicability")), None)
    legal_context = {"scope": _norm_space(scope_clause["text"]) if scope_clause else None, "exemptions": None}
    for c in merged:
        if c["category"] in ("Industrial_Relations","Applicability") and re.search(r"\bexemption|excluded\b", c["text"].lower()):
            legal_context["exemptions"] = _norm_space(c["text"]); break

    mean_conf = sum(c.get("confidence",0) for c in merged) / len(merged) if merged else 0.0
    final_doc_type = select_doc_type(doc_type, merged, statutes)
    
    out = {
        "document_type": final_doc_type, "jurisdiction": juris, "statutes_or_codes": statutes,
        "dates": sorted(dates, key=lambda x: (x["iso"] or "9999-99-99")),
        "legal_context": {k:v for k,v in legal_context.items() if v},
        **buckets, # Unpack all bucket lists into the main dictionary
        "meta": {
            "source_quality": {
                "mean_span_confidence": round(mean_conf,3),
                "spans_used": len(merged),
                "spans_dropped": len(clauses) - len(keep)
            }
        }
    }
    for k in list(out.keys()):
        if isinstance(out[k], list) and not out[k]:
            del out[k]
    return out

# --- End of Refinement Script Logic ---