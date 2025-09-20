# -*- coding: utf-8 -*-
"""
FastAPI wrapper for the high-precision document profiler.
This application exposes the functionality of profile_doc_advanced.py
as a web API endpoint.
"""
import os
import re
import json
import math
import unicodedata
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from collections import defaultdict, Counter

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForTokenClassification

# =========================
# Configuration & Globals
# =========================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# Use a dynamic path to find the model relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "model1l") # Assumes model folder is named "model1l"

# Default processing parameters
MAX_LEN_DEFAULT = 384
STRIDE_DEFAULT = 128
BATCH_DEFAULT = 16

# Shared model assets, loaded on startup
model_assets = {}

# =========================
# API Models (Request & Response)
# =========================
class ProfileRequest(BaseModel):
    text: str = Field(..., description="The full text of the document to be profiled.")
    max_len: int = Field(MAX_LEN_DEFAULT, description="Maximum sequence length for the NER model.")
    stride: int = Field(STRIDE_DEFAULT, description="Overlap stride for processing long documents.")
    batch_size: int = Field(BATCH_DEFAULT, description="Batch size for model inference.")

# =========================
# FastAPI App Initialization
# =========================
app = FastAPI(
    title="Document Profiling API",
    description="An API to deeply analyze and profile legal and compliance documents.",
    version="2.0.0"
)

# =========================
# All Logic from profile_doc_advanced.py
# (Integrated directly into the FastAPI application)
# =========================

# --- Tunables ---
MERGE_MAX_GAP = 3  # chars
MERGE_PUNC_BRIDGE = re.compile(r'^[\s,;—–-]*$')
STOPWORD_BRIDGE = {"and", "or", "to", "of", "the", "a", "an", "in", "for", "with", "by"}

# --- Utilities ---
def now_iso():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    return s

def softmax(x: np.ndarray, axis=-1) -> np.ndarray:
    x = x - np.max(x, axis=axis, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=axis, keepdims=True)

def entropy(p: np.ndarray) -> float:
    p = np.clip(p, 1e-9, 1.0)
    return float(-np.sum(p * np.log(p)))

def sent_spans(text: str) -> List[Tuple[int, int]]:
    spans, start = [], 0
    for m in re.finditer(r'[.!?;]\s+|\n{1,}', text):
        end = m.start() + 1
        if end > start: spans.append((start, end))
        start = m.end()
    if start < len(text):
        spans.append((start, len(text)))
    return spans

# --- Section/Heading Logic ---
HEADING_RX = re.compile(r'^\s*([A-Z][A-Za-z0-9 &/()+\-]{2,})\s*$')
def detect_headings(text: str) -> List[Tuple[int, str]]:
    out, pos = [], 0
    for line in text.splitlines(True):
        if len(line.strip()) <= 80 and HEADING_RX.match(line):
            out.append((pos, line.strip()))
        pos += len(line)
    return out

SECTION_CANON = [
    ("Applicability|Scope|Definitions", "Applicability"),
    ("Compliance|Regulatory|Registers|Records", "Compliance & Regulatory"),
    ("Wages|Benefits|Remuneration|Leave", "Wages & Benefits"),
    ("Industrial Relations|Grievance|Dispute|Conciliation|Tribunal", "Industrial Relations"),
    ("Health|Safety|HSE|OSH|Wellbeing", "Health & Safety"),
    ("Enforcement|Penalty|Penalties|Prosecution|Sanction", "Enforcement & Penalties"),
]
SECTION_CANON_RX = [(re.compile(pat, re.I), name) for pat, name in SECTION_CANON]

def canonical_section(head: Optional[str]) -> Optional[str]:
    if not head: return None
    for rx, name in SECTION_CANON_RX:
        if rx.search(head):
            return name
    return head

def nearest_heading(heads: List[Tuple[int, str]], idx: int) -> Optional[str]:
    last = None
    for p, h in heads:
        if p <= idx: last = h
        else: break
    return canonical_section(last)

# --- Date Extraction Logic ---
MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], start=1)}
RX_DMY = re.compile(r'\b(?P<day>\d{1,2})\s+(?P<mon>January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+(?P<year>(19|20)\d{2})\b', re.I)
RX_MY = re.compile(r'\b(?P<mon>January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+(?P<year>(19|20)\d{2})\b', re.I)
RX_Y = re.compile(r'\b(?P<year>(19|20)\d{2})\b')

def to_iso(day: Optional[int], mon: Optional[str], year: int) -> str:
    m = MONTHS[mon.capitalize()] if mon else 9
    d = day if day else 1
    d = max(1, min(28, d))
    return datetime(year, m, d).strftime("%Y-%m-%d")

KW = {
    "EFFECTIVE_START": ["effective from", "comes into force", "commences", "effective date"],
    "FILING_DEADLINE": ["file", "filing", "return", "deadline", "submit", "no later than"],
    "REVIEW_MILESTONE": ["review", "readiness", "assessment", "interim"],
    "ENFORCEMENT_START": ["enforcement", "penalties apply", "liable from"],
}
def extract_date_matches(text: str) -> List[Tuple[str, str, int, int, str]]:
    hits, occ = [], []
    for m in RX_DMY.finditer(text):
        hits.append((m.group(0), to_iso(int(m.group("day")), m.group("mon"), int(m.group("year"))), m.start(), m.end(), "DMY")); occ.append((m.start(), m.end()))
    def overlaps(s, e): return any(not (e <= s0 or s >= e0) for s0, e0 in occ)
    for m in RX_MY.finditer(text):
        if overlaps(m.start(), m.end()): continue
        hits.append((m.group(0), to_iso(None, m.group("mon"), int(m.group("year"))), m.start(), m.end(), "MY")); occ.append((m.start(), m.end()))
    for m in RX_Y.finditer(text):
        if overlaps(m.start(), m.end()): continue
        hits.append((m.group(0), to_iso(None, None, int(m.group("year"))), m.start(), m.end(), "Y")); occ.append((m.start(), m.end()))
    return sorted(hits, key=lambda x: x[2])

def label_date(text: str, s: int, e: int) -> Tuple[str, float, Dict[str, int]]:
    ctx = text[max(0, s - 140): min(len(text), e + 140)].lower()
    scores = defaultdict(int)
    for role, kws in KW.items():
        for kw in kws:
            for m in re.finditer(re.escape(kw), ctx):
                dist = min(abs(m.start() - len(ctx) // 2), 140)
                scores[role] += 3 if dist < 30 else 2 if dist < 70 else 1
    if not scores: scores["OTHER"] = 1
    total = sum(scores.values())
    best, val = max(scores.items(), key=lambda kv: kv[1])
    return best, round(val / max(1, total), 3), scores

# --- Other Metadata Extraction ---
STATUTE_PATTS = [
    (r'\bConsolidated Labour Compliance Code\b', "Consolidated Labour Compliance Code"),
    (r'\bIndustrial Relations Code\b', "Industrial Relations Code"),
]
def extract_statutes(text: str) -> List[str]:
    return sorted({name for rx, name in STATUTE_PATTS if re.search(rx, text, re.I)})

def extract_jurisdiction(text: str) -> Optional[str]:
    if m := re.search(r'\bLocation\s*:\s*(.+?)(?:\r?\n|$)', text, re.I):
        return m.group(1).strip().rstrip(".")
    if m2 := re.search(r'\b([A-Z][a-zA-Z]+),\s*([A-Z][a-zA-Z]+)\b', text[:300]):
        return f"{m2.group(1)}, {m2.group(2)}"
    return None

DOCTYPE_VOCAB = [
    ("Employment Rules Summary", [r'employment rules', r'labour compliance']),
    ("Privacy Policy", [r'privacy policy', r'data protection policy']),
]
def infer_doctype(text: str, headings: List[Tuple[int, str]]) -> str:
    title = headings[0][1].lower() if headings else ""
    for label, pats in DOCTYPE_VOCAB:
        for pat in pats:
            if re.search(pat, text, re.I) or re.search(pat, title, re.I):
                return label
    return headings[0][1].strip() if headings else "Unknown"

# --- NER Inference ---
def decode_spans(offsets, pred_ids, probs, id2label, text: str) -> List[Dict]:
    spans, cur, cur_probs = [], None, []
    for (a, b), pid, pvec in zip(offsets, pred_ids, probs):
        if a == b: continue
        tag = id2label.get(int(pid), "O")
        if tag == "O":
            if cur: spans.append(cur); cur = None; cur_probs = []
            continue
        pref, cat = ("I", tag) if "-" not in tag else tag.split("-", 1)
        maxp, ent = float(np.max(pvec)), float(entropy(pvec))
        if pref == "B" or (cur and cur["category"] != cat):
            if cur: spans.append(cur)
            cur = {"category": cat, "start": a, "end": b, "_p": [maxp], "_h": [ent]}
        elif cur:
            cur["end"] = max(cur["end"], b)
            cur["_p"].append(maxp); cur["_h"].append(ent)
        else:
             cur = {"category": cat, "start": a, "end": b, "_p": [maxp], "_h": [ent]}
    if cur: spans.append(cur)
    for s in spans:
        s["text"] = text[s["start"]:s["end"]]
        s["confidence"] = round(float(np.mean(s["_p"])), 3)
        s["uncertainty"] = round(float(np.mean(s["_h"])), 3)
        del s["_p"]; del s["_h"]
    return spans

def should_merge(a, b, text: str) -> bool:
    if b["start"] - a["end"] > MERGE_MAX_GAP: return False
    mid = text[a["end"]:b["start"]]
    if MERGE_PUNC_BRIDGE.match(mid): return True
    if mid.strip().lower() in STOPWORD_BRIDGE: return False
    return False

def merge_spans(spans: List[Dict], text: str) -> List[Dict]:
    if not spans: return []
    spans = sorted(spans, key=lambda s: (s["start"], s["end"]))
    out = [spans[0]]
    for s in spans[1:]:
        last = out[-1]
        if s["category"] == last["category"] and should_merge(last, s, text):
            last["end"] = s["end"]
            last["confidence"] = round((last["confidence"] + s["confidence"]) / 2, 3)
            last["uncertainty"] = round((last["uncertainty"] + s["uncertainty"]) / 2, 3)
            last["text"] = text[last["start"]:last["end"]]
        else:
            out.append(s)
    return out

def run_ner(tok, model, text: str, max_len: int, stride: int, batch: int):
    enc = tok(text, truncation=True, max_length=max_len, stride=stride, return_overflowing_tokens=True, return_offsets_mapping=True, padding=False)
    preds_chunks, probs_chunks = [], []
    with torch.no_grad():
        for i in range(0, len(enc["input_ids"]), batch):
            batch_inputs = {"input_ids": enc["input_ids"][i:i + batch], "attention_mask": enc["attention_mask"][i:i + batch]}
            padded = tok.pad(batch_inputs, padding=True, return_tensors="pt").to(DEVICE)
            logits = model(**padded).logits
            sm = torch.softmax(logits, dim=-1).cpu().numpy()
            preds_chunks.append(np.argmax(sm, axis=-1))
            probs_chunks.append(sm)
    preds, probs = np.concatenate(preds_chunks, axis=0), np.concatenate(probs_chunks, axis=0)
    id2label = {int(k): v for k, v in model.config.id2label.items()}
    decoded_spans = [s for off, pr, pb in zip(enc["offset_mapping"], preds, probs) for s in decode_spans(off, pr[:len(off)], pb[:len(off)], id2label, text)]
    merged = merge_spans(decoded_spans, text)
    return {"spans": merged, "label_set": sorted({s["category"] for s in merged})}

# --- Final Analysis & Quality ---
OBLIG_RX = re.compile(r'\b(shall|must|required to|is required to|prohibited|ensure)\b', re.I)
def extract_key_points(text: str, limit: int = 14) -> List[str]:
    points, seen = [], set()
    for s, e in sent_spans(text):
        sent = re.sub(r'\s+', ' ', text[s:e].strip())
        if len(sent) > 40 and OBLIG_RX.search(sent) and not sent.lower().startswith("this summary"):
            if (k := sent.lower()) not in seen:
                seen.add(k); points.append(sent)
    return points[:limit]

def build_clauses(spans: List[Dict], text: str, heads: List[Tuple[int, str]]) -> Tuple[List[Dict], Dict[str, int]]:
    clauses, topics = [], Counter()
    for s in spans:
        head = nearest_heading(heads, s["start"])
        topics[s["category"]] += 1
        clauses.append({"section": head or "General", "category": s["category"], "text": s["text"], "start": s["start"], "end": s["end"], "confidence": s.get("confidence"), "uncertainty": s.get("uncertainty")})
    return clauses, dict(topics.most_common())

def quality_report(text: str, spans: List[Dict], topics: Dict[str, int]) -> Dict[str, object]:
    coverage = round(sum(s["end"] - s["start"] for s in spans) / max(1, len(text)), 4)
    confs = [s.get("confidence", 0.0) for s in spans]
    mean_conf = round(float(np.mean(confs)) if confs else 0.0, 3)
    red_flags = []
    if coverage < 0.02: red_flags.append("Very low coverage — check if model is appropriate for this document type.")
    if mean_conf < 0.6: red_flags.append("Low mean span confidence — results may be unreliable.")
    return {"text_length": len(text), "span_count": len(spans), "coverage_ratio": coverage, "mean_span_confidence": mean_conf, "red_flags": red_flags}


# =========================
# FastAPI Lifespan & Endpoints
# =========================


@app.on_event("startup")
def load_model():
    """
    Load the NER model and tokenizer once when the application starts.
    This is critical for performance.
    """
    try:
        if not os.path.exists(MODEL_DIR):
             raise FileNotFoundError(f"Model directory not found at {MODEL_DIR}. Please ensure the 'model1l' folder exists relative to the script.")
        
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, use_fast=True)
        model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR).to(DEVICE)
        model.eval()
        
        model_assets["tokenizer"] = tokenizer
        model_assets["model"] = model
        
        print(f"Model loaded successfully from {MODEL_DIR} on {DEVICE} device.")
    except Exception as e:
        print(f"FATAL: Error loading model: {e}")
        # Raising the error will stop the Uvicorn server from starting.
        raise e

@app.get('/health', summary="Health Check", tags=["Health"])
def health_check():
    """Simple health check endpoint to confirm the service is running."""
    return {"status": "OK", "model_loaded": "model" in model_assets}

@app.post('/profile', summary="Profile a Document", tags=["Profiling"])
def profile_document(request: ProfileRequest):
    """
    Analyzes a document's text and returns a structured profile containing
    clauses, topics, important dates, key points, and quality metrics.
    """
    try:
        # Retrieve loaded model assets
        tokenizer = model_assets.get("tokenizer")
        model = model_assets.get("model")
        if not tokenizer or not model:
            raise HTTPException(status_code=503, detail="Model is not available. Check server logs.")

        # --- Run the full analysis pipeline ---
        text = normalize_text(request.text)
        heads = detect_headings(text)
        ner = run_ner(tokenizer, model, text, request.max_len, request.stride, request.batch_size)
        spans = ner["spans"]
        clauses, topics = build_clauses(spans, text, heads)
        
        dates = []
        for raw, iso, s, e, kind in extract_date_matches(text):
            dlabel, dconf, scorevec = label_date(text, s, e)
            dates.append({
                "text": raw, "iso": iso, "start": s, "end": e, "granularity": kind,
                "label": dlabel, "confidence": dconf
            })
        
        profile = {
            "document_type": infer_doctype(text, heads),
            "jurisdiction": extract_jurisdiction(text),
            "statutes_or_codes": extract_statutes(text),
            "important_dates": dates,
            "topics": topics,
            "clauses": clauses,
            "key_points": extract_key_points(text),
            "meta": {
                "model_dir": os.path.basename(MODEL_DIR),
                "device": DEVICE,
                "generated_at": now_iso(),
                "label_set": ner["label_set"],
                "quality": quality_report(text, spans, topics)
            }
        }
        
        return profile

    except Exception as e:
        # Log the full traceback for debugging on the server
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")


if __name__ == '__main__':
    port = int(os.environ.get('AIP_HTTP_PORT', 8080))
    uvicorn.run(app, host='0.0.0.0', port=port)

