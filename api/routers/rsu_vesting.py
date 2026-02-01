"""
RSU Vesting Schedule API Router
Handles CSV upload and manual entry of RSU vesting schedules.
"""

import uuid
from typing import List
from datetime import date, datetime, timedelta
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import (
    RSUVestingEvent,
    RSUVestingEventCreate,
    RSUVestingScheduleSummary,
    SuccessResponse,
)
from services.rsu_csv_parser import parse_rsu_csv, validate_vesting_schedule

router = APIRouter(prefix="/rsu-vesting", tags=["rsu-vesting"])

# In-memory storage (replace with database in production)
_vesting_events_store: List[dict] = []


def _event_to_dict(event: RSUVestingEventCreate, event_id: str = None) -> dict:
    """Convert RSUVestingEventCreate to dict for storage."""
    if event_id is None:
        event_id = str(uuid.uuid4())
    
    return {
        "id": event_id,
        "grant_id": event.grant_id,
        "symbol": event.symbol,
        "grant_date": event.grant_date.isoformat(),
        "vesting_date": event.vesting_date.isoformat(),
        "shares_vesting": event.shares_vesting,
        "fmv_at_vest": event.fmv_at_vest,
        "total_value": event.shares_vesting * event.fmv_at_vest,
    }


def _dict_to_event(event_dict: dict) -> RSUVestingEvent:
    """Convert dict to RSUVestingEvent."""
    return RSUVestingEvent(
        id=event_dict["id"],
        grant_id=event_dict["grant_id"],
        symbol=event_dict["symbol"],
        grant_date=date.fromisoformat(event_dict["grant_date"]),
        vesting_date=date.fromisoformat(event_dict["vesting_date"]),
        shares_vesting=event_dict["shares_vesting"],
        fmv_at_vest=event_dict["fmv_at_vest"],
        total_value=event_dict["total_value"],
    )


@router.post("/upload-csv", response_model=List[RSUVestingEvent])
async def upload_rsu_csv(file: UploadFile = File(...)):
    """Upload and parse RSU vesting schedule CSV file."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        csv_content = content.decode("utf-8")
        
        # Parse CSV
        events = parse_rsu_csv(csv_content)
        
        # Validate schedule
        warnings = validate_vesting_schedule(events)
        if warnings:
            print(f"CSV validation warnings: {warnings}")
        
        # Store events
        created_events = []
        for event in events:
            event_dict = _event_to_dict(event)
            _vesting_events_store.append(event_dict)
            created_events.append(_dict_to_event(event_dict))
        
        return created_events
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")


@router.post("", response_model=RSUVestingEvent)
async def create_vesting_event(event: RSUVestingEventCreate):
    """Create a new RSU vesting event manually."""
    event_dict = _event_to_dict(event)
    _vesting_events_store.append(event_dict)
    return _dict_to_event(event_dict)


@router.get("", response_model=List[RSUVestingEvent])
async def get_all_vesting_events():
    """Get all RSU vesting events."""
    return [_dict_to_event(e) for e in _vesting_events_store]


@router.get("/summary", response_model=RSUVestingScheduleSummary)
async def get_vesting_summary():
    """Get summary of RSU vesting schedule."""
    events = [_dict_to_event(e) for e in _vesting_events_store]
    
    if not events:
        return RSUVestingScheduleSummary(
            total_grants=0,
            total_shares_granted=0,
            total_shares_vested=0,
            total_shares_pending=0,
            upcoming_vests=[],
            past_vests=[],
        )
    
    # Calculate totals
    grant_ids = set(e.grant_id for e in events)
    total_shares_granted = sum(e.shares_vesting for e in events)
    
    today = date.today()
    past_events = [e for e in events if e.vesting_date < today]
    future_events = [e for e in events if e.vesting_date >= today]
    
    total_shares_vested = sum(e.shares_vesting for e in past_events)
    total_shares_pending = sum(e.shares_vesting for e in future_events)
    
    # Get upcoming vests (next 6 months)
    six_months_from_now = today + timedelta(days=180)
    upcoming_vests = [
        e for e in future_events 
        if e.vesting_date <= six_months_from_now
    ]
    upcoming_vests.sort(key=lambda x: x.vesting_date)
    upcoming_vests = upcoming_vests[:10]  # Limit to 10
    
    # Get past vests (last 12 months)
    one_year_ago = today - timedelta(days=365)
    past_vests = [
        e for e in past_events 
        if e.vesting_date >= one_year_ago
    ]
    past_vests.sort(key=lambda x: x.vesting_date, reverse=True)
    past_vests = past_vests[:10]  # Limit to 10
    
    return RSUVestingScheduleSummary(
        total_grants=len(grant_ids),
        total_shares_granted=total_shares_granted,
        total_shares_vested=total_shares_vested,
        total_shares_pending=total_shares_pending,
        upcoming_vests=upcoming_vests,
        past_vests=past_vests,
    )


@router.get("/grant/{grant_id}", response_model=List[RSUVestingEvent])
async def get_events_by_grant(grant_id: str):
    """Get all vesting events for a specific grant."""
    events = [
        _dict_to_event(e) for e in _vesting_events_store 
        if e["grant_id"] == grant_id
    ]
    events.sort(key=lambda x: x.vesting_date)
    return events


@router.get("/{event_id}", response_model=RSUVestingEvent)
async def get_vesting_event(event_id: str):
    """Get a specific vesting event by ID."""
    for event_dict in _vesting_events_store:
        if event_dict["id"] == event_id:
            return _dict_to_event(event_dict)
    raise HTTPException(status_code=404, detail="Vesting event not found")


@router.put("/{event_id}", response_model=RSUVestingEvent)
async def update_vesting_event(event_id: str, event: RSUVestingEventCreate):
    """Update a vesting event."""
    for i, event_dict in enumerate(_vesting_events_store):
        if event_dict["id"] == event_id:
            updated_dict = _event_to_dict(event, event_id)
            _vesting_events_store[i] = updated_dict
            return _dict_to_event(updated_dict)
    raise HTTPException(status_code=404, detail="Vesting event not found")


@router.delete("/{event_id}", response_model=SuccessResponse)
async def delete_vesting_event(event_id: str):
    """Delete a vesting event."""
    global _vesting_events_store
    original_len = len(_vesting_events_store)
    _vesting_events_store = [e for e in _vesting_events_store if e["id"] != event_id]
    
    if len(_vesting_events_store) == original_len:
        raise HTTPException(status_code=404, detail="Vesting event not found")
    
    return SuccessResponse(success=True, message="Vesting event deleted")
