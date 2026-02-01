"""
Notifications API Router
Handles email notification testing and configuration.
"""

import os
from fastapi import APIRouter, HTTPException
from models.schemas import TestNotificationRequest, SuccessResponse

# Optional email service (requires aiosmtplib)
try:
    from services.email_service import get_email_service
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/test", response_model=SuccessResponse)
async def send_test_notification(request: TestNotificationRequest):
    """Send a test notification email."""
    if not EMAIL_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Email service not available in this environment"
        )
    try:
        email_service = get_email_service()
        success = await email_service.send_test_email(request.email)

        if success:
            return SuccessResponse(
                success=True,
                message=f"Test email sent to {request.email}"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send test email"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Email service error: {str(e)}"
        )


@router.get("/status")
async def get_notification_status():
    """Check email notification configuration status."""
    smtp_configured = bool(
        os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD")
    )

    return {
        "available": EMAIL_AVAILABLE,
        "configured": smtp_configured,
        "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "notification_email": os.getenv("NOTIFICATION_EMAIL"),
    }
