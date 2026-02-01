"""
Tax API Router
Handles tax projection calculations.
"""

from fastapi import APIRouter, Query
from models.schemas import TaxProjection
from services.tax_calculator import calculate_total_tax
from routers.paystubs import get_ytd_totals

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/projection", response_model=TaxProjection)
async def get_tax_projection(
    year: int = Query(default=2025, description="Tax year"),
    annual_income: float = Query(default=None, description="Override annual income"),
    oklahoma_income: float = Query(default=0, description="Income sourced from Oklahoma"),
):
    """
    Calculate tax projection based on current paystub data.

    If annual_income is not provided, it will extrapolate from YTD paystub data.
    """
    ytd = get_ytd_totals()

    # Use provided annual income or extrapolate from YTD
    if annual_income:
        gross_income = annual_income
    else:
        # Extrapolate based on YTD data
        # Assuming roughly linear income distribution
        gross_income = ytd["gross_income"] + ytd["rsu_income"]
        if gross_income == 0:
            # Default demo data if no paystubs uploaded
            gross_income = 450000

    # Calculate tax projection
    tax_data = calculate_total_tax(
        gross_income=gross_income,
        _401k_contribution=ytd["_401k_contribution"] * 2 if ytd["_401k_contribution"] else 23500,
        oklahoma_income=oklahoma_income,
        rsu_income=ytd["rsu_income"],
    )

    # Calculate withheld YTD
    withheld_ytd = (
        ytd["federal_withheld"] +
        ytd["state_withheld"] +
        ytd["fica_withheld"]
    )

    # If no paystubs, use demo withheld amount
    if withheld_ytd == 0:
        withheld_ytd = 145000

    # Calculate projected liability vs withheld
    projected_liability = tax_data["total_tax"]
    refund_or_owed = withheld_ytd - projected_liability

    return TaxProjection(
        gross_income=gross_income,
        federal_tax=tax_data["federal_tax"],
        california_tax=tax_data["california_tax"],
        oklahoma_tax=tax_data["oklahoma_tax"],
        fica_tax=tax_data["fica_tax"],
        total_tax=tax_data["total_tax"],
        effective_rate=tax_data["effective_rate"],
        withheld_ytd=withheld_ytd,
        projected_liability=projected_liability,
        refund_or_owed=refund_or_owed,
    )


@router.get("/brackets")
async def get_tax_brackets(year: int = Query(default=2025)):
    """Get tax bracket information for the specified year."""
    from services.tax_calculator import (
        FEDERAL_BRACKETS_MFJ_2025,
        CALIFORNIA_BRACKETS_MFJ_2025,
        OKLAHOMA_BRACKETS_MFJ_2025,
        FEDERAL_STANDARD_DEDUCTION_MFJ_2025,
        CALIFORNIA_STANDARD_DEDUCTION_MFJ_2025,
        SOCIAL_SECURITY_WAGE_BASE_2025,
    )

    return {
        "year": year,
        "filing_status": "married_filing_jointly",
        "federal": {
            "brackets": [
                {"limit": limit if limit != float("inf") else None, "rate": rate}
                for limit, rate in FEDERAL_BRACKETS_MFJ_2025
            ],
            "standard_deduction": FEDERAL_STANDARD_DEDUCTION_MFJ_2025,
        },
        "california": {
            "brackets": [
                {"limit": limit if limit != float("inf") else None, "rate": rate}
                for limit, rate in CALIFORNIA_BRACKETS_MFJ_2025
            ],
            "standard_deduction": CALIFORNIA_STANDARD_DEDUCTION_MFJ_2025,
        },
        "oklahoma": {
            "brackets": [
                {"limit": limit if limit != float("inf") else None, "rate": rate}
                for limit, rate in OKLAHOMA_BRACKETS_MFJ_2025
            ],
            "standard_deduction": 15000,
        },
        "fica": {
            "social_security_wage_base": SOCIAL_SECURITY_WAGE_BASE_2025,
            "social_security_rate": 0.062,
            "medicare_rate": 0.0145,
            "additional_medicare_threshold": 250000,
            "additional_medicare_rate": 0.009,
        },
    }


@router.get("/marginal-rate")
async def get_marginal_rate(income: float = Query(..., description="Current gross income")):
    """Get current marginal tax rates for given income."""
    from services.tax_calculator import calculate_marginal_rate

    rates = calculate_marginal_rate(income)

    return {
        "income": income,
        "marginal_rates": {
            "federal": f"{rates['federal'] * 100:.1f}%",
            "california": f"{rates['california'] * 100:.2f}%",
            "fica": f"{rates['fica'] * 100:.2f}%",
            "combined": f"{rates['combined'] * 100:.1f}%",
        },
        "raw_rates": rates,
    }
