"""
RSU CSV Parser Service
Parses CSV files containing RSU vesting schedule data.
"""

import csv
import uuid
from datetime import datetime, date
from typing import List, Optional
from io import StringIO
from models.schemas import RSUVestingEventCreate


def parse_rsu_csv(csv_content: str) -> List[RSUVestingEventCreate]:
    """
    Parse CSV content into RSU vesting events.
    
    Expected CSV format:
    grant_id,symbol,grant_date,total_shares,vesting_date,shares_vesting,fmv_at_vest
    
    Example:
    GRANT-001,GOOG,2024-01-15,500,2024-03-15,125,140.50
    GRANT-001,GOOG,2024-01-15,500,2024-06-15,125,155.00
    
    Returns list of RSUVestingEventCreate objects.
    Raises ValueError if CSV format is invalid.
    """
    events = []
    reader = csv.DictReader(StringIO(csv_content))
    
    # Validate required columns
    required_columns = {
        'grant_id', 'symbol', 'grant_date', 
        'vesting_date', 'shares_vesting', 'fmv_at_vest'
    }
    
    if not reader.fieldnames:
        raise ValueError("CSV file is empty or invalid")
    
    missing_columns = required_columns - set(reader.fieldnames)
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Parse grant_id
            grant_id = row['grant_id'].strip()
            if not grant_id:
                raise ValueError(f"Row {row_num}: grant_id is required")
            
            # Parse symbol
            symbol = row['symbol'].strip().upper()
            if not symbol:
                raise ValueError(f"Row {row_num}: symbol is required")
            
            # Parse dates
            grant_date = _parse_date(row['grant_date'], f"Row {row_num}: grant_date")
            vesting_date = _parse_date(row['vesting_date'], f"Row {row_num}: vesting_date")
            
            # Validate dates
            if vesting_date < grant_date:
                raise ValueError(f"Row {row_num}: vesting_date cannot be before grant_date")
            
            # Parse shares
            shares_vesting = _parse_int(row['shares_vesting'], f"Row {row_num}: shares_vesting")
            if shares_vesting <= 0:
                raise ValueError(f"Row {row_num}: shares_vesting must be positive")
            
            # Parse FMV
            fmv_at_vest = _parse_float(row['fmv_at_vest'], f"Row {row_num}: fmv_at_vest")
            if fmv_at_vest < 0:
                raise ValueError(f"Row {row_num}: fmv_at_vest cannot be negative")
            
            events.append(RSUVestingEventCreate(
                grant_id=grant_id,
                symbol=symbol,
                grant_date=grant_date,
                vesting_date=vesting_date,
                shares_vesting=shares_vesting,
                fmv_at_vest=fmv_at_vest
            ))
            
        except KeyError as e:
            raise ValueError(f"Row {row_num}: Missing column {e}")
        except ValueError as e:
            raise ValueError(str(e))
    
    if not events:
        raise ValueError("No valid vesting events found in CSV")
    
    return events


def _parse_date(date_str: str, context: str) -> date:
    """Parse date string in various formats."""
    date_str = date_str.strip()
    formats = [
        '%Y-%m-%d',
        '%m/%d/%Y',
        '%m-%d-%Y',
        '%Y/%m/%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    raise ValueError(f"{context}: Invalid date format '{date_str}'. Use YYYY-MM-DD")


def _parse_int(value: str, context: str) -> int:
    """Parse integer value."""
    try:
        return int(float(value.strip()))  # Handle "125.0" format
    except (ValueError, AttributeError):
        raise ValueError(f"{context}: Invalid integer '{value}'")


def _parse_float(value: str, context: str) -> float:
    """Parse float value."""
    try:
        # Remove currency symbols and commas
        cleaned = value.strip().replace('$', '').replace(',', '')
        return float(cleaned)
    except (ValueError, AttributeError):
        raise ValueError(f"{context}: Invalid number '{value}'")


def validate_vesting_schedule(events: List[RSUVestingEventCreate]) -> List[str]:
    """
    Validate vesting schedule for consistency.
    Returns list of warnings (empty if valid).
    """
    warnings = []
    
    # Group by grant_id
    grants = {}
    for event in events:
        if event.grant_id not in grants:
            grants[event.grant_id] = []
        grants[event.grant_id].append(event)
    
    # Check each grant
    for grant_id, grant_events in grants.items():
        # Check that all events have same symbol and grant_date
        symbols = set(e.symbol for e in grant_events)
        grant_dates = set(e.grant_date for e in grant_events)
        
        if len(symbols) > 1:
            warnings.append(f"Grant {grant_id}: Multiple symbols found {symbols}")
        
        if len(grant_dates) > 1:
            warnings.append(f"Grant {grant_id}: Multiple grant dates found {grant_dates}")
        
        # Check for duplicate vesting dates
        vesting_dates = [e.vesting_date for e in grant_events]
        if len(vesting_dates) != len(set(vesting_dates)):
            warnings.append(f"Grant {grant_id}: Duplicate vesting dates found")
        
        # Check that shares don't exceed reasonable limits
        total_shares = sum(e.shares_vesting for e in grant_events)
        if total_shares > 100000:
            warnings.append(f"Grant {grant_id}: Total shares ({total_shares}) seems unusually high")
    
    return warnings
