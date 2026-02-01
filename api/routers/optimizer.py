"""
401(k) Optimizer API Router
Handles 401(k) contribution optimization calculations.
"""

from fastapi import APIRouter
from models.schemas import Optimizer401kRequest, Optimizer401kResult

router = APIRouter(prefix="/optimizer", tags=["optimizer"])

# 2025 401(k) limits
MAX_CONTRIBUTION_2025 = 23500
CATCH_UP_CONTRIBUTION_2025 = 7500
CATCH_UP_AGE = 50


@router.post("/401k", response_model=Optimizer401kResult)
async def optimize_401k(request: Optimizer401kRequest):
    """
    Calculate optimal 401(k) contribution percentage to maximize contributions.

    Takes into account:
    - Current YTD contributions
    - Remaining pay periods
    - Annual salary
    - Age (for catch-up eligibility)
    """
    # Determine max contribution based on age
    catch_up_eligible = request.age is not None and request.age >= CATCH_UP_AGE
    max_contribution = MAX_CONTRIBUTION_2025
    if catch_up_eligible:
        max_contribution += CATCH_UP_CONTRIBUTION_2025

    # Calculate remaining contribution room
    remaining_room = max(0, max_contribution - request.ytd_contribution)

    # Calculate per-paycheck contribution needed to max out
    if request.remaining_pay_periods > 0:
        per_period_salary = request.annual_salary / 26  # Assuming bi-weekly
        needed_per_period = remaining_room / request.remaining_pay_periods

        # Calculate required percentage
        if per_period_salary > 0:
            recommended_percent = (needed_per_period / per_period_salary) * 100
            # Cap at reasonable maximum (most plans allow up to 75%)
            recommended_percent = min(75, max(0, recommended_percent))
        else:
            recommended_percent = 0
    else:
        recommended_percent = 0

    # Calculate projected year-end contribution at recommended rate
    per_period_salary = request.annual_salary / 26
    projected_contribution = request.ytd_contribution + (
        per_period_salary * (recommended_percent / 100) * request.remaining_pay_periods
    )
    projected_contribution = min(projected_contribution, max_contribution)

    # Estimate tax savings (using approximate combined marginal rate)
    # Assumes 32% federal + 9.3% CA = ~41% marginal rate for high earners
    marginal_rate = 0.41
    additional_contribution = projected_contribution - request.ytd_contribution
    tax_savings = additional_contribution * marginal_rate

    return Optimizer401kResult(
        current_contribution_percent=request.current_contribution_percent,
        recommended_percent=round(recommended_percent, 1),
        remaining_contribution_room=round(remaining_room, 2),
        max_contribution=max_contribution,
        projected_year_end_contribution=round(projected_contribution, 2),
        tax_savings=round(tax_savings, 2),
    )


@router.get("/401k/limits")
async def get_401k_limits(year: int = 2025):
    """Get 401(k) contribution limits for the specified year."""
    # Currently only 2025 limits are implemented
    return {
        "year": year,
        "elective_deferral_limit": MAX_CONTRIBUTION_2025,
        "catch_up_contribution": CATCH_UP_CONTRIBUTION_2025,
        "catch_up_age": CATCH_UP_AGE,
        "total_with_catch_up": MAX_CONTRIBUTION_2025 + CATCH_UP_CONTRIBUTION_2025,
        "notes": [
            "Elective deferral limit applies to employee contributions",
            "Catch-up contributions available for those 50+ by year end",
            "Employer match does not count toward elective deferral limit",
            "Total annual additions limit (employee + employer) is $70,000 for 2025",
        ],
    }


@router.post("/401k/scenario")
async def calculate_scenario(
    annual_salary: float,
    contribution_percent: float,
    ytd_contribution: float = 0,
    remaining_pay_periods: int = 26,
    age: int = None,
):
    """
    Calculate a specific contribution scenario.

    Returns detailed projection of what happens at the given contribution rate.
    """
    catch_up_eligible = age is not None and age >= CATCH_UP_AGE
    max_contribution = MAX_CONTRIBUTION_2025
    if catch_up_eligible:
        max_contribution += CATCH_UP_CONTRIBUTION_2025

    per_period_salary = annual_salary / 26
    per_period_contribution = per_period_salary * (contribution_percent / 100)

    # Project contributions through remaining pay periods
    projections = []
    running_total = ytd_contribution

    for period in range(1, remaining_pay_periods + 1):
        contribution_this_period = min(
            per_period_contribution,
            max(0, max_contribution - running_total)
        )
        running_total += contribution_this_period

        projections.append({
            "period": period,
            "contribution": round(contribution_this_period, 2),
            "cumulative": round(running_total, 2),
            "remaining_room": round(max(0, max_contribution - running_total), 2),
        })

        if running_total >= max_contribution:
            # Will hit max, remaining periods have $0 contribution
            for remaining_period in range(period + 1, remaining_pay_periods + 1):
                projections.append({
                    "period": remaining_period,
                    "contribution": 0,
                    "cumulative": round(max_contribution, 2),
                    "remaining_room": 0,
                })
            break

    final_contribution = projections[-1]["cumulative"] if projections else ytd_contribution
    will_max_out = final_contribution >= max_contribution
    max_out_period = None

    if will_max_out:
        for proj in projections:
            if proj["cumulative"] >= max_contribution:
                max_out_period = proj["period"]
                break

    return {
        "scenario": {
            "annual_salary": annual_salary,
            "contribution_percent": contribution_percent,
            "ytd_contribution": ytd_contribution,
            "remaining_pay_periods": remaining_pay_periods,
            "catch_up_eligible": catch_up_eligible,
        },
        "results": {
            "final_contribution": round(final_contribution, 2),
            "max_contribution": max_contribution,
            "will_max_out": will_max_out,
            "max_out_period": max_out_period,
            "estimated_tax_savings": round(final_contribution * 0.41, 2),
        },
        "projections": projections[:12],  # Return first 12 periods for brevity
    }
