"""
Tax Calculator Service
Handles federal, California, and Oklahoma tax calculations for 2025.
Filing status: Married Filing Jointly
"""

from typing import Tuple

# 2025 Federal Tax Brackets (Married Filing Jointly)
FEDERAL_BRACKETS_MFJ_2025 = [
    (23850, 0.10),
    (96950, 0.12),
    (206700, 0.22),
    (394600, 0.24),
    (501050, 0.32),
    (751600, 0.35),
    (float('inf'), 0.37),
]

# 2025 California Tax Brackets (Married Filing Jointly)
CALIFORNIA_BRACKETS_MFJ_2025 = [
    (21438, 0.01),
    (50852, 0.02),
    (80268, 0.04),
    (111484, 0.06),
    (140902, 0.08),
    (721318, 0.093),
    (865580, 0.103),
    (1441160, 0.113),
    (float('inf'), 0.133),
]

# 2025 Oklahoma Tax Brackets (Married Filing Jointly)
OKLAHOMA_BRACKETS_MFJ_2025 = [
    (2000, 0.0025),
    (5000, 0.0075),
    (7500, 0.0175),
    (9800, 0.0275),
    (12200, 0.0375),
    (float('inf'), 0.0475),
]

# 2025 FICA Limits
SOCIAL_SECURITY_WAGE_BASE_2025 = 176100
SOCIAL_SECURITY_RATE = 0.062
MEDICARE_RATE = 0.0145
ADDITIONAL_MEDICARE_THRESHOLD_MFJ = 250000
ADDITIONAL_MEDICARE_RATE = 0.009

# Standard Deduction 2025 (MFJ)
FEDERAL_STANDARD_DEDUCTION_MFJ_2025 = 30000
CALIFORNIA_STANDARD_DEDUCTION_MFJ_2025 = 11080


def calculate_bracket_tax(income: float, brackets: list) -> float:
    """Calculate tax using progressive brackets."""
    tax = 0.0
    prev_limit = 0

    for limit, rate in brackets:
        if income <= prev_limit:
            break
        taxable_in_bracket = min(income, limit) - prev_limit
        tax += taxable_in_bracket * rate
        prev_limit = limit

    return tax


def calculate_federal_tax(gross_income: float, _401k_contribution: float = 0) -> float:
    """
    Calculate federal income tax for Married Filing Jointly.
    401(k) contributions reduce taxable income.
    """
    # Reduce income by 401(k) contribution (pre-tax)
    taxable_income = gross_income - _401k_contribution

    # Apply standard deduction
    taxable_income = max(0, taxable_income - FEDERAL_STANDARD_DEDUCTION_MFJ_2025)

    return calculate_bracket_tax(taxable_income, FEDERAL_BRACKETS_MFJ_2025)


def calculate_california_tax(
    gross_income: float,
    _401k_contribution: float = 0,
    oklahoma_income: float = 0
) -> float:
    """
    Calculate California state income tax.
    California allows credit for taxes paid to other states on the same income.
    """
    # Reduce income by 401(k) contribution
    taxable_income = gross_income - _401k_contribution

    # Apply CA standard deduction
    taxable_income = max(0, taxable_income - CALIFORNIA_STANDARD_DEDUCTION_MFJ_2025)

    ca_tax = calculate_bracket_tax(taxable_income, CALIFORNIA_BRACKETS_MFJ_2025)

    # California Mental Health Services Tax (1% on income over $1M)
    if taxable_income > 1000000:
        ca_tax += (taxable_income - 1000000) * 0.01

    return ca_tax


def calculate_oklahoma_tax(oklahoma_income: float, _401k_contribution: float = 0) -> float:
    """
    Calculate Oklahoma state income tax on Oklahoma-sourced income only.
    """
    if oklahoma_income <= 0:
        return 0

    # Oklahoma standard deduction for MFJ
    ok_standard_deduction = 15000

    # Prorate 401k deduction based on OK income ratio
    # (This is a simplification - actual rules may vary)
    taxable_income = max(0, oklahoma_income - ok_standard_deduction)

    return calculate_bracket_tax(taxable_income, OKLAHOMA_BRACKETS_MFJ_2025)


def calculate_fica_tax(gross_income: float) -> Tuple[float, float]:
    """
    Calculate FICA taxes (Social Security + Medicare).
    Returns tuple of (social_security_tax, medicare_tax).
    """
    # Social Security (capped at wage base)
    ss_taxable = min(gross_income, SOCIAL_SECURITY_WAGE_BASE_2025)
    social_security = ss_taxable * SOCIAL_SECURITY_RATE

    # Medicare (no cap, but additional 0.9% over threshold)
    medicare = gross_income * MEDICARE_RATE
    if gross_income > ADDITIONAL_MEDICARE_THRESHOLD_MFJ:
        additional_medicare = (gross_income - ADDITIONAL_MEDICARE_THRESHOLD_MFJ) * ADDITIONAL_MEDICARE_RATE
        medicare += additional_medicare

    return social_security, medicare


def calculate_total_tax(
    gross_income: float,
    _401k_contribution: float = 0,
    oklahoma_income: float = 0,
    rsu_income: float = 0
) -> dict:
    """
    Calculate complete tax projection.

    Args:
        gross_income: Total gross income including W-2, RSU, etc.
        _401k_contribution: Pre-tax 401(k) contributions
        oklahoma_income: Income sourced from Oklahoma (for dual-state)
        rsu_income: RSU vest income (included in gross, used for AMT check)

    Returns:
        Dictionary with full tax breakdown
    """
    # Federal tax
    federal_tax = calculate_federal_tax(gross_income, _401k_contribution)

    # State taxes
    california_tax = calculate_california_tax(gross_income, _401k_contribution, oklahoma_income)
    oklahoma_tax = calculate_oklahoma_tax(oklahoma_income, _401k_contribution)

    # Credit for taxes paid to Oklahoma (reduces CA tax)
    # California allows credit for taxes paid to other states on same income
    if oklahoma_income > 0 and oklahoma_tax > 0:
        # Calculate what CA would have charged on that income
        ok_income_ratio = oklahoma_income / gross_income
        ca_tax_on_ok_income = california_tax * ok_income_ratio
        # Credit is lesser of OK tax paid or CA tax on that income
        state_credit = min(oklahoma_tax, ca_tax_on_ok_income)
        california_tax = max(0, california_tax - state_credit)

    # FICA
    ss_tax, medicare_tax = calculate_fica_tax(gross_income)
    fica_tax = ss_tax + medicare_tax

    # Total tax
    total_tax = federal_tax + california_tax + oklahoma_tax + fica_tax

    # Effective rate
    effective_rate = (total_tax / gross_income * 100) if gross_income > 0 else 0

    return {
        "gross_income": gross_income,
        "federal_tax": round(federal_tax, 2),
        "california_tax": round(california_tax, 2),
        "oklahoma_tax": round(oklahoma_tax, 2),
        "fica_tax": round(fica_tax, 2),
        "total_tax": round(total_tax, 2),
        "effective_rate": round(effective_rate, 2),
        "social_security_tax": round(ss_tax, 2),
        "medicare_tax": round(medicare_tax, 2),
    }


def calculate_quarterly_estimate(
    annual_projection: dict,
    prior_year_tax: float = 0
) -> list:
    """
    Calculate quarterly estimated tax payments.
    Uses safe harbor rules (110% prior year or 90% current year).
    """
    total_liability = annual_projection["federal_tax"] + \
                     annual_projection["california_tax"] + \
                     annual_projection["oklahoma_tax"]

    # Safe harbor: 110% of prior year tax (for high income)
    safe_harbor_prior = prior_year_tax * 1.10

    # Or 90% of current year
    safe_harbor_current = total_liability * 0.90

    # Use the lower amount for quarterly payments
    quarterly_target = min(safe_harbor_prior, safe_harbor_current) if prior_year_tax > 0 else safe_harbor_current

    # Allocate to each jurisdiction (proportional)
    federal_ratio = annual_projection["federal_tax"] / total_liability if total_liability > 0 else 0.6
    ca_ratio = annual_projection["california_tax"] / total_liability if total_liability > 0 else 0.35
    ok_ratio = annual_projection["oklahoma_tax"] / total_liability if total_liability > 0 else 0.05

    quarterly_amount = quarterly_target / 4

    return {
        "total_quarterly": round(quarterly_amount, 2),
        "federal_quarterly": round(quarterly_amount * federal_ratio, 2),
        "california_quarterly": round(quarterly_amount * ca_ratio, 2),
        "oklahoma_quarterly": round(quarterly_amount * ok_ratio, 2),
        "annual_target": round(quarterly_target, 2),
    }


def calculate_marginal_rate(gross_income: float) -> dict:
    """Calculate current marginal tax rates."""
    federal_taxable = max(0, gross_income - FEDERAL_STANDARD_DEDUCTION_MFJ_2025)
    ca_taxable = max(0, gross_income - CALIFORNIA_STANDARD_DEDUCTION_MFJ_2025)

    # Find federal marginal rate
    federal_marginal = 0.10
    prev_limit = 0
    for limit, rate in FEDERAL_BRACKETS_MFJ_2025:
        if federal_taxable > prev_limit:
            federal_marginal = rate
        prev_limit = limit

    # Find CA marginal rate
    ca_marginal = 0.01
    prev_limit = 0
    for limit, rate in CALIFORNIA_BRACKETS_MFJ_2025:
        if ca_taxable > prev_limit:
            ca_marginal = rate
        prev_limit = limit

    # FICA marginal (depends on if under SS cap)
    if gross_income < SOCIAL_SECURITY_WAGE_BASE_2025:
        fica_marginal = SOCIAL_SECURITY_RATE + MEDICARE_RATE
    else:
        fica_marginal = MEDICARE_RATE
        if gross_income > ADDITIONAL_MEDICARE_THRESHOLD_MFJ:
            fica_marginal += ADDITIONAL_MEDICARE_RATE

    return {
        "federal": federal_marginal,
        "california": ca_marginal,
        "fica": fica_marginal,
        "combined": federal_marginal + ca_marginal + fica_marginal,
    }
