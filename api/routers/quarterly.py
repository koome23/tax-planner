"""
Quarterly Estimates API Router
Handles quarterly tax payment calculations and tracking.
"""

from typing import List
from datetime import date
from fastapi import APIRouter, Query
from models.schemas import QuarterlyEstimate, MarkQuarterlyPaidRequest, SuccessResponse
from services.tax_calculator import calculate_total_tax, calculate_quarterly_estimate
from routers.paystubs import get_ytd_totals

router = APIRouter(prefix="/quarterly", tags=["quarterly"])

# In-memory storage for payment tracking
_quarterly_payments: dict = {}

# 2025 quarterly due dates
QUARTERLY_DUE_DATES_2025 = {
    1: date(2025, 4, 15),
    2: date(2025, 6, 15),
    3: date(2025, 9, 15),
    4: date(2026, 1, 15),
}


@router.get("/estimate", response_model=List[QuarterlyEstimate])
async def get_quarterly_estimates(
    year: int = Query(default=2025, description="Tax year"),
    annual_income: float = Query(default=None, description="Override annual income"),
    prior_year_tax: float = Query(default=165000, description="Prior year total tax liability"),
):
    """
    Calculate quarterly estimated tax payments.

    Uses safe harbor rules to determine minimum payments needed
    to avoid underpayment penalties.
    """
    ytd = get_ytd_totals()

    # Calculate annual projection
    if annual_income:
        gross_income = annual_income
    else:
        gross_income = ytd["gross_income"] + ytd["rsu_income"]
        if gross_income == 0:
            gross_income = 450000

    # Get tax projection
    tax_data = calculate_total_tax(
        gross_income=gross_income,
        _401k_contribution=23500,  # Assume max 401k
    )

    # Calculate quarterly amounts
    quarterly_calc = calculate_quarterly_estimate(tax_data, prior_year_tax)

    # Build quarterly estimates list
    estimates = []
    for quarter in [1, 2, 3, 4]:
        due_date = QUARTERLY_DUE_DATES_2025.get(quarter, date(2025, 4, 15))

        # Check if payment was recorded
        payment_key = f"{year}-Q{quarter}"
        payment_info = _quarterly_payments.get(payment_key, {})

        estimates.append(QuarterlyEstimate(
            quarter=quarter,
            due_date=due_date,
            federal_amount=quarterly_calc["federal_quarterly"],
            california_amount=quarterly_calc["california_quarterly"],
            oklahoma_amount=quarterly_calc["oklahoma_quarterly"],
            total_amount=quarterly_calc["total_quarterly"],
            paid=payment_info.get("paid", False),
            paid_amount=payment_info.get("amount"),
        ))

    return estimates


@router.post("/mark-paid", response_model=QuarterlyEstimate)
async def mark_quarterly_paid(request: MarkQuarterlyPaidRequest, year: int = 2025):
    """Mark a quarterly payment as paid."""
    if request.quarter not in [1, 2, 3, 4]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Quarter must be 1-4")

    payment_key = f"{year}-Q{request.quarter}"
    _quarterly_payments[payment_key] = {
        "paid": True,
        "amount": request.amount,
    }

    # Return updated estimate
    estimates = await get_quarterly_estimates(year=year)
    for est in estimates:
        if est.quarter == request.quarter:
            return est

    # Should not reach here
    return estimates[request.quarter - 1]


@router.delete("/mark-paid")
async def unmark_quarterly_paid(quarter: int, year: int = 2025):
    """Remove paid status from a quarterly payment."""
    payment_key = f"{year}-Q{quarter}"
    if payment_key in _quarterly_payments:
        del _quarterly_payments[payment_key]

    return SuccessResponse(success=True, message=f"Q{quarter} marked as unpaid")


@router.get("/due-dates")
async def get_due_dates(year: int = 2025):
    """Get quarterly payment due dates."""
    return {
        "year": year,
        "due_dates": {
            "Q1": "April 15, 2025",
            "Q2": "June 15, 2025",
            "Q3": "September 15, 2025",
            "Q4": "January 15, 2026",
        },
        "notes": [
            "Q1 covers income from January 1 - March 31",
            "Q2 covers income from April 1 - May 31",
            "Q3 covers income from June 1 - August 31",
            "Q4 covers income from September 1 - December 31",
            "If due date falls on weekend/holiday, payment is due next business day",
        ],
    }


@router.get("/safe-harbor")
async def get_safe_harbor_info(
    current_year_tax: float = Query(..., description="Estimated current year tax"),
    prior_year_tax: float = Query(..., description="Prior year total tax"),
    prior_year_agi: float = Query(default=0, description="Prior year AGI"),
):
    """
    Calculate safe harbor requirements.

    Safe harbor protects against underpayment penalties if you pay:
    - 100% of prior year tax (110% if AGI > $150k), OR
    - 90% of current year tax
    """
    # High income threshold for 110% rule
    high_income = prior_year_agi > 150000 if prior_year_agi else True

    prior_year_safe_harbor = prior_year_tax * (1.10 if high_income else 1.00)
    current_year_safe_harbor = current_year_tax * 0.90

    minimum_payment = min(prior_year_safe_harbor, current_year_safe_harbor)

    return {
        "safe_harbor_options": {
            "prior_year_method": {
                "percentage": "110%" if high_income else "100%",
                "amount": round(prior_year_safe_harbor, 2),
                "quarterly": round(prior_year_safe_harbor / 4, 2),
            },
            "current_year_method": {
                "percentage": "90%",
                "amount": round(current_year_safe_harbor, 2),
                "quarterly": round(current_year_safe_harbor / 4, 2),
            },
        },
        "recommended_minimum": {
            "annual": round(minimum_payment, 2),
            "quarterly": round(minimum_payment / 4, 2),
        },
        "high_income_taxpayer": high_income,
        "notes": [
            "Meeting safe harbor avoids underpayment penalties",
            "You can use either method - whichever results in lower payments",
            "Withholding from W-2 counts toward safe harbor requirement",
        ],
    }
