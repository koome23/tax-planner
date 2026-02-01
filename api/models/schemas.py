from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from enum import Enum


class FilingStatus(str, Enum):
    SINGLE = "single"
    MARRIED_FILING_JOINTLY = "married_filing_jointly"
    MARRIED_FILING_SEPARATELY = "married_filing_separately"
    HEAD_OF_HOUSEHOLD = "head_of_household"


# Paystub Models
class PaystubBase(BaseModel):
    pay_date: Optional[str] = None  # ISO format string (YYYY-MM-DD)
    gross_pay: float
    federal_withheld: float
    state_withheld: float
    fica_withheld: float
    net_pay: float
    _401k_contribution: float
    rsu_income: Optional[float] = None


class PaystubCreate(PaystubBase):
    pass


class Paystub(PaystubBase):
    id: str

    class Config:
        from_attributes = True


# Tax Projection Models
class TaxProjection(BaseModel):
    gross_income: float
    federal_tax: float
    california_tax: float
    oklahoma_tax: float
    fica_tax: float
    total_tax: float
    effective_rate: float
    withheld_ytd: float
    projected_liability: float
    refund_or_owed: float


# RSU Models
class RSUPosition(BaseModel):
    symbol: str
    quantity: int
    cost_basis: float
    current_price: float
    current_value: float
    unrealized_gain: float
    vesting_date: date


# RSU Vesting Schedule Models
class RSUGrant(BaseModel):
    """Represents an RSU grant with multiple vesting events."""
    id: str
    grant_id: str
    symbol: str
    grant_date: date
    total_shares: int
    vesting_schedule: str  # e.g., "4 years, quarterly"


class RSUVestingEventBase(BaseModel):
    """Base model for RSU vesting event."""
    grant_id: str
    symbol: str
    grant_date: date
    vesting_date: date
    shares_vesting: int
    fmv_at_vest: float  # Fair market value per share at vest date


class RSUVestingEventCreate(RSUVestingEventBase):
    """Model for creating a new vesting event."""
    pass


class RSUVestingEvent(RSUVestingEventBase):
    """Model for a vesting event with ID."""
    id: str
    total_value: float  # shares_vesting * fmv_at_vest
    
    class Config:
        from_attributes = True


class RSUVestingScheduleSummary(BaseModel):
    """Summary of all vesting events."""
    total_grants: int
    total_shares_granted: int
    total_shares_vested: int
    total_shares_pending: int
    upcoming_vests: list[RSUVestingEvent]  # Next 6 months
    past_vests: list[RSUVestingEvent]  # Last 12 months


# 401k Optimizer Models
class Optimizer401kRequest(BaseModel):
    current_contribution_percent: float
    annual_salary: float
    ytd_contribution: float
    remaining_pay_periods: int
    age: Optional[int] = None


class Optimizer401kResult(BaseModel):
    current_contribution_percent: float
    recommended_percent: float
    remaining_contribution_room: float
    max_contribution: float
    projected_year_end_contribution: float
    tax_savings: float


# Quarterly Estimates Models
class QuarterlyEstimate(BaseModel):
    quarter: int
    due_date: date
    federal_amount: float
    california_amount: float
    oklahoma_amount: float
    total_amount: float
    paid: bool
    paid_amount: Optional[float] = None


class MarkQuarterlyPaidRequest(BaseModel):
    quarter: int
    amount: float


# E*Trade Models
class ETradeAuthResponse(BaseModel):
    auth_url: str


class ETradeCallbackRequest(BaseModel):
    code: str
    verifier: str


# Notification Models
class TestNotificationRequest(BaseModel):
    email: EmailStr


class SuccessResponse(BaseModel):
    success: bool
    message: Optional[str] = None
