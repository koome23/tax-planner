from .tax_calculator import (
    calculate_total_tax,
    calculate_federal_tax,
    calculate_california_tax,
    calculate_oklahoma_tax,
    calculate_fica_tax,
    calculate_quarterly_estimate,
    calculate_marginal_rate,
)

# Optional imports - may not be available in serverless environment
try:
    from .pdf_parser import parse_paystub_pdf, validate_paystub_data
except ImportError:
    parse_paystub_pdf = None
    validate_paystub_data = None

try:
    from .etrade_client import (
        ETradeClient,
        get_etrade_client,
        start_auth_flow,
        complete_auth_flow,
    )
except ImportError:
    ETradeClient = None
    get_etrade_client = None
    start_auth_flow = None
    complete_auth_flow = None

try:
    from .email_service import EmailService, get_email_service
except ImportError:
    EmailService = None
    get_email_service = None
