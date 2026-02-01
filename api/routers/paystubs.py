"""
Paystubs API Router
Handles paystub upload, parsing, and retrieval.
"""

import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import Paystub

# Optional PDF parsing (not available in serverless due to size)
try:
    import tempfile
    from services.pdf_parser import parse_paystub_pdf, validate_paystub_data
    PDF_PARSING_AVAILABLE = True
except ImportError:
    PDF_PARSING_AVAILABLE = False

router = APIRouter(prefix="/paystubs", tags=["paystubs"])

# In-memory storage (replace with database in production)
_paystubs_store: List[dict] = []


@router.get("", response_model=List[Paystub])
async def get_paystubs():
    """Get all parsed paystubs."""
    return _paystubs_store


@router.get("/{paystub_id}", response_model=Paystub)
async def get_paystub(paystub_id: str):
    """Get a specific paystub by ID."""
    for paystub in _paystubs_store:
        if paystub["id"] == paystub_id:
            return paystub
    raise HTTPException(status_code=404, detail="Paystub not found")


@router.post("/upload", response_model=Paystub)
async def upload_paystub(file: UploadFile = File(...)):
    """Upload and parse a paystub PDF."""
    if not PDF_PARSING_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PDF parsing not available in serverless environment. Use manual entry."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        paystub_data = parse_paystub_pdf(temp_path)

        warnings = validate_paystub_data(paystub_data)
        if warnings:
            print(f"Paystub parsing warnings: {warnings}")

        if paystub_data.get("pay_date"):
            paystub_data["pay_date"] = paystub_data["pay_date"].isoformat()

        _paystubs_store.append(paystub_data)

        return paystub_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post("/manual", response_model=Paystub)
async def add_paystub_manual(paystub: Paystub):
    """Add a paystub manually (for serverless environment)."""
    data = paystub.model_dump()
    data["id"] = str(uuid.uuid4())
    if hasattr(data.get("pay_date"), "isoformat"):
        data["pay_date"] = data["pay_date"].isoformat()
    _paystubs_store.append(data)
    return data


@router.delete("/{paystub_id}")
async def delete_paystub(paystub_id: str):
    """Delete a paystub."""
    global _paystubs_store
    original_len = len(_paystubs_store)
    _paystubs_store = [p for p in _paystubs_store if p["id"] != paystub_id]

    if len(_paystubs_store) == original_len:
        raise HTTPException(status_code=404, detail="Paystub not found")

    return {"success": True, "message": "Paystub deleted"}


@router.put("/{paystub_id}", response_model=Paystub)
async def update_paystub(paystub_id: str, paystub: Paystub):
    """Update a paystub (for manual corrections)."""
    for i, p in enumerate(_paystubs_store):
        if p["id"] == paystub_id:
            updated = paystub.model_dump()
            updated["id"] = paystub_id
            if hasattr(updated.get("pay_date"), "isoformat"):
                updated["pay_date"] = updated["pay_date"].isoformat()
            _paystubs_store[i] = updated
            return updated

    raise HTTPException(status_code=404, detail="Paystub not found")


def get_ytd_totals() -> dict:
    """Calculate YTD totals from all paystubs."""
    totals = {
        "gross_income": 0,
        "federal_withheld": 0,
        "state_withheld": 0,
        "fica_withheld": 0,
        "_401k_contribution": 0,
        "net_pay": 0,
        "rsu_income": 0,
    }

    for paystub in _paystubs_store:
        totals["gross_income"] += paystub.get("gross_pay", 0)
        totals["federal_withheld"] += paystub.get("federal_withheld", 0)
        totals["state_withheld"] += paystub.get("state_withheld", 0)
        totals["fica_withheld"] += paystub.get("fica_withheld", 0)
        totals["_401k_contribution"] += paystub.get("_401k_contribution", 0)
        totals["net_pay"] += paystub.get("net_pay", 0)
        totals["rsu_income"] += paystub.get("rsu_income", 0) or 0

    return totals
