"""
E*Trade API Router
Handles E*Trade OAuth and RSU data retrieval.
"""

from typing import List
from datetime import date
from fastapi import APIRouter, HTTPException
from models.schemas import (
    ETradeAuthResponse,
    ETradeCallbackRequest,
    RSUPosition,
    SuccessResponse,
)

# Optional E*Trade client (requires requests-oauthlib)
try:
    from services.etrade_client import (
        start_auth_flow,
        complete_auth_flow,
        get_etrade_client,
    )
    ETRADE_AVAILABLE = True
except ImportError:
    ETRADE_AVAILABLE = False

router = APIRouter(prefix="/etrade", tags=["etrade"])


@router.get("/auth-url", response_model=ETradeAuthResponse)
async def get_auth_url():
    """Get E*Trade OAuth authorization URL."""
    if not ETRADE_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="E*Trade integration not available in this environment"
        )
    try:
        auth_url = start_auth_flow()
        return ETradeAuthResponse(auth_url=auth_url)
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"E*Trade credentials not configured: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start auth flow: {str(e)}"
        )


@router.post("/callback", response_model=SuccessResponse)
async def handle_callback(request: ETradeCallbackRequest):
    """Complete E*Trade OAuth flow with verifier code."""
    if not ETRADE_AVAILABLE:
        raise HTTPException(status_code=501, detail="E*Trade integration not available")
    try:
        success = complete_auth_flow(request.verifier)
        if success:
            return SuccessResponse(success=True, message="E*Trade connected successfully")
        else:
            raise HTTPException(status_code=400, detail="Failed to complete authentication")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth callback failed: {str(e)}")


@router.get("/positions", response_model=List[RSUPosition])
async def get_positions():
    """Get RSU positions from E*Trade. Returns mock data if not connected."""
    if ETRADE_AVAILABLE:
        try:
            client = get_etrade_client()
            if client.access_token:
                positions = client.get_rsu_positions()
                return [RSUPosition(**pos) for pos in positions]
        except Exception as e:
            print(f"Error fetching E*Trade positions: {e}")

    # Return mock data
    return [
        RSUPosition(
            symbol="GOOG",
            quantity=150,
            cost_basis=140.50,
            current_price=185.25,
            current_value=27787.50,
            unrealized_gain=6712.50,
            vesting_date=date(2024, 3, 15),
        ),
        RSUPosition(
            symbol="GOOG",
            quantity=100,
            cost_basis=155.00,
            current_price=185.25,
            current_value=18525.00,
            unrealized_gain=3025.00,
            vesting_date=date(2024, 6, 15),
        ),
        RSUPosition(
            symbol="GOOG",
            quantity=75,
            cost_basis=168.25,
            current_price=185.25,
            current_value=13893.75,
            unrealized_gain=1275.00,
            vesting_date=date(2024, 9, 15),
        ),
        RSUPosition(
            symbol="GOOG",
            quantity=125,
            cost_basis=172.00,
            current_price=185.25,
            current_value=23156.25,
            unrealized_gain=1656.25,
            vesting_date=date(2024, 12, 15),
        ),
    ]


@router.get("/status")
async def get_connection_status():
    """Check E*Trade connection status."""
    if not ETRADE_AVAILABLE:
        return {"connected": False, "available": False}
    try:
        client = get_etrade_client()
        connected = client.access_token is not None
        return {"connected": connected, "available": True, "sandbox": client.sandbox if connected else None}
    except Exception:
        return {"connected": False, "available": True}


@router.post("/disconnect", response_model=SuccessResponse)
async def disconnect():
    """Disconnect E*Trade integration."""
    if not ETRADE_AVAILABLE:
        return SuccessResponse(success=True, message="E*Trade not connected")
    try:
        client = get_etrade_client()
        client.access_token = None
        client.access_token_secret = None
        return SuccessResponse(success=True, message="E*Trade disconnected")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disconnect: {str(e)}")
