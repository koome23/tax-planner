"""
PDF Parser Service
Extracts paystub data from uploaded PDF files using pdfplumber.
"""

import re
import uuid
from datetime import datetime, date
from typing import Optional
import pdfplumber


def parse_currency(value: str) -> float:
    """Convert currency string to float."""
    if not value:
        return 0.0
    cleaned = re.sub(r'[$,\s]', '', value)
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_date(value: str) -> Optional[date]:
    """Parse various date formats."""
    date_formats = [
        '%m/%d/%Y',      # 01/15/2025
        '%m-%d-%Y',      # 01-15-2025
        '%Y-%m-%d',      # 2025-01-15
        '%B %d, %Y',     # January 15, 2025
        '%b %d, %Y',     # Jan 15, 2025
        '%B %d %Y',      # January 15 2025
        '%b %d %Y',      # Jan 15 2025
        '%m/%d/%y',      # 01/15/25
        '%m-%d-%y',      # 01-15-25
        '%d %B %Y',      # 15 January 2025
        '%d %b %Y',      # 15 Jan 2025
    ]
    # Normalize the value - remove extra whitespace and periods after month abbreviations
    normalized = ' '.join(value.strip().split())
    normalized = re.sub(r'\.(?=\s)', '', normalized)  # Remove periods after abbreviations

    for fmt in date_formats:
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue
    return None


def extract_value_after_label(text: str, labels: list) -> Optional[str]:
    """Extract value that appears after any of the given labels."""
    for label in labels:
        pattern = rf'{re.escape(label)}[:\s]*\$?([\d,]+\.?\d*)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def parse_paystub_pdf(pdf_path: str) -> dict:
    """Parse a paystub PDF and extract relevant financial data."""
    result = {
        'id': str(uuid.uuid4()),
        'pay_date': None,
        'gross_pay': 0.0,
        'federal_withheld': 0.0,
        'state_withheld': 0.0,
        'fica_withheld': 0.0,
        'net_pay': 0.0,
        '_401k_contribution': 0.0,
        'rsu_income': None,
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ''
            for page in pdf.pages:
                page_text = page.extract_text() or ''
                full_text += page_text + '\n'

            tables = []
            for page in pdf.pages:
                page_tables = page.extract_tables() or []
                tables.extend(page_tables)

            result.update(_parse_from_text(full_text))

            if tables:
                table_data = _parse_from_tables(tables)
                for key, value in table_data.items():
                    if result.get(key) in (0.0, None) and value:
                        result[key] = value

    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")

    return result


def _parse_from_text(text: str) -> dict:
    """Extract paystub data from raw text."""
    data = {}

    # Try multiple date extraction strategies
    date_labels = ['Pay Date', 'Check Date', 'Payment Date', 'Period Ending', 'Paid', 'Date Paid']

    # Strategy 1: Numeric dates (01/15/2025, 01-15-2025, etc.)
    for label in date_labels:
        pattern = rf'{label}[:\s]*(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}})'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            parsed_date = parse_date(match.group(1))
            if parsed_date:
                data['pay_date'] = parsed_date
                break

    # Strategy 2: Text dates (January 15, 2025 or Jan 15, 2025)
    if 'pay_date' not in data:
        for label in date_labels:
            pattern = rf'{label}[:\s]*([A-Za-z]+\.?\s+\d{{1,2}},?\s+\d{{4}})'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                parsed_date = parse_date(match.group(1))
                if parsed_date:
                    data['pay_date'] = parsed_date
                    break

    # Strategy 3: ISO format dates (2025-01-15)
    if 'pay_date' not in data:
        for label in date_labels:
            pattern = rf'{label}[:\s]*(\d{{4}}-\d{{2}}-\d{{2}})'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                parsed_date = parse_date(match.group(1))
                if parsed_date:
                    data['pay_date'] = parsed_date
                    break

    # Strategy 4: Look for standalone date patterns near common keywords
    if 'pay_date' not in data:
        # Look for dates that appear near "pay" or "check" keywords
        date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        matches = re.findall(date_pattern, text)
        for match in matches:
            parsed_date = parse_date(match)
            if parsed_date:
                data['pay_date'] = parsed_date
                break

    gross_value = extract_value_after_label(text, [
        'Gross Pay', 'Gross Earnings', 'Total Gross', 'Gross',
        'Current Gross', 'Total Earnings'
    ])
    if gross_value:
        data['gross_pay'] = parse_currency(gross_value)

    federal_value = extract_value_after_label(text, [
        'Federal Income Tax', 'Federal Tax', 'Fed Income Tax',
        'Federal Withholding', 'FIT', 'Fed Tax'
    ])
    if federal_value:
        data['federal_withheld'] = parse_currency(federal_value)

    state_value = extract_value_after_label(text, [
        'State Income Tax', 'State Tax', 'CA Tax', 'California Tax',
        'OK Tax', 'Oklahoma Tax', 'SIT', 'State Withholding'
    ])
    if state_value:
        data['state_withheld'] = parse_currency(state_value)

    ss_value = extract_value_after_label(text, [
        'Social Security', 'FICA SS', 'OASDI', 'Soc Sec',
        'SS Tax', 'FICA-OASDI'
    ])
    ss_amount = parse_currency(ss_value) if ss_value else 0.0

    medicare_value = extract_value_after_label(text, [
        'Medicare', 'FICA Med', 'Medicare Tax', 'FICA-HI'
    ])
    medicare_amount = parse_currency(medicare_value) if medicare_value else 0.0

    data['fica_withheld'] = ss_amount + medicare_amount

    k401_value = extract_value_after_label(text, [
        '401(k)', '401k', '401 K', 'Retirement', '401(K) Pretax',
        'Pre-Tax 401', 'Employee 401'
    ])
    if k401_value:
        data['_401k_contribution'] = parse_currency(k401_value)

    net_value = extract_value_after_label(text, [
        'Net Pay', 'Net Amount', 'Take Home', 'Net Check',
        'Amount Paid', 'Total Net'
    ])
    if net_value:
        data['net_pay'] = parse_currency(net_value)

    rsu_value = extract_value_after_label(text, [
        'RSU', 'Restricted Stock', 'Stock Compensation',
        'Equity Compensation', 'Stock Award'
    ])
    if rsu_value:
        data['rsu_income'] = parse_currency(rsu_value)

    return data


def _parse_from_tables(tables: list) -> dict:
    """Extract paystub data from PDF tables."""
    data = {}

    for table in tables:
        if not table:
            continue

        for row in table:
            if not row or len(row) < 2:
                continue

            label = str(row[0] or '').lower().strip()
            value = None
            for cell in row[1:]:
                if cell and re.search(r'\d', str(cell)):
                    value = str(cell)
                    break

            if not value:
                continue

            if any(term in label for term in ['gross', 'total earn']):
                if 'gross_pay' not in data:
                    data['gross_pay'] = parse_currency(value)

            elif any(term in label for term in ['federal', 'fed tax', 'fit']):
                if 'federal_withheld' not in data:
                    data['federal_withheld'] = parse_currency(value)

            elif any(term in label for term in ['state', 'sit', 'california', 'ca tax']):
                if 'state_withheld' not in data:
                    data['state_withheld'] = parse_currency(value)

            elif any(term in label for term in ['social sec', 'oasdi', 'ss tax']):
                data['ss'] = parse_currency(value)

            elif 'medicare' in label:
                data['medicare'] = parse_currency(value)

            elif any(term in label for term in ['401', 'retirement']):
                if '_401k_contribution' not in data:
                    data['_401k_contribution'] = parse_currency(value)

            elif any(term in label for term in ['net pay', 'net amount', 'take home']):
                if 'net_pay' not in data:
                    data['net_pay'] = parse_currency(value)

    if 'ss' in data or 'medicare' in data:
        data['fica_withheld'] = data.pop('ss', 0) + data.pop('medicare', 0)

    return data


def validate_paystub_data(data: dict) -> list:
    """Validate parsed paystub data and return list of warnings."""
    warnings = []

    if not data.get('pay_date'):
        warnings.append("Could not detect pay date")

    if data.get('gross_pay', 0) == 0:
        warnings.append("Gross pay is zero or not detected")

    if data.get('net_pay', 0) == 0:
        warnings.append("Net pay is zero or not detected")

    if data.get('net_pay', 0) > data.get('gross_pay', 0):
        warnings.append("Net pay exceeds gross pay - values may be swapped")

    total_deductions = (
        data.get('federal_withheld', 0) +
        data.get('state_withheld', 0) +
        data.get('fica_withheld', 0) +
        data.get('_401k_contribution', 0)
    )

    expected_net = data.get('gross_pay', 0) - total_deductions
    if data.get('net_pay', 0) > 0 and abs(expected_net - data.get('net_pay', 0)) > 1000:
        warnings.append("Calculated deductions don't match gross - net difference")

    return warnings
