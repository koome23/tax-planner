"""
Email Notification Service
Handles sending email reminders for quarterly payments and other notifications.
"""

import os
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import date, timedelta
import aiosmtplib


class EmailService:
    """Service for sending email notifications."""

    def __init__(
        self,
        smtp_server: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
    ):
        self.smtp_server = smtp_server or os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = smtp_user or os.getenv("SMTP_USER")
        self.smtp_password = smtp_password or os.getenv("SMTP_PASSWORD")
        self.notification_email = os.getenv("NOTIFICATION_EMAIL")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """Send an email notification."""
        if not self.smtp_user or not self.smtp_password:
            raise ValueError("SMTP credentials not configured")

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = self.smtp_user
        message["To"] = to_email

        if body_text:
            message.attach(MIMEText(body_text, "plain"))
        message.attach(MIMEText(body_html, "html"))

        try:
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
            )
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    async def send_test_email(self, to_email: str) -> bool:
        """Send a test notification email."""
        subject = "Tax Planner - Test Notification"
        body_html = """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Tax Planner Notification Test</h2>
            <p>This is a test email from your Tax Planner application.</p>
            <p>If you received this, your email notifications are configured correctly!</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                This is an automated message from Tax Planner.
            </p>
        </body>
        </html>
        """
        body_text = "Tax Planner Test Notification\n\nThis is a test email. Your notifications are configured correctly!"

        return await self.send_email(to_email, subject, body_html, body_text)

    async def send_quarterly_reminder(
        self,
        to_email: str,
        quarter: int,
        due_date: date,
        federal_amount: float,
        state_amount: float,
        total_amount: float,
    ) -> bool:
        """Send quarterly tax payment reminder."""
        days_until = (due_date - date.today()).days
        urgency = "urgent" if days_until <= 3 else "upcoming"

        subject = f"Tax Planner - Q{quarter} Estimated Tax Payment {'Due Soon!' if urgency == 'urgent' else 'Reminder'}"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: {'#dc2626' if urgency == 'urgent' else '#2563eb'};">
                Q{quarter} Estimated Tax Payment {'Due Soon!' if urgency == 'urgent' else 'Reminder'}
            </h2>

            <p>Your Q{quarter} estimated tax payment is due on <strong>{due_date.strftime('%B %d, %Y')}</strong>
            ({days_until} days from now).</p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Payment Summary</h3>
                <table style="width: 100%;">
                    <tr>
                        <td>Federal (IRS)</td>
                        <td style="text-align: right; font-weight: bold;">${federal_amount:,.2f}</td>
                    </tr>
                    <tr>
                        <td>State (CA + OK)</td>
                        <td style="text-align: right; font-weight: bold;">${state_amount:,.2f}</td>
                    </tr>
                    <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding-top: 10px;"><strong>Total</strong></td>
                        <td style="text-align: right; font-weight: bold; padding-top: 10px; font-size: 18px;">
                            ${total_amount:,.2f}
                        </td>
                    </tr>
                </table>
            </div>

            <h3>Payment Methods</h3>
            <ul>
                <li><strong>Federal:</strong> <a href="https://www.irs.gov/payments">IRS Direct Pay</a></li>
                <li><strong>California:</strong> <a href="https://www.ftb.ca.gov/pay">FTB Web Pay</a></li>
                <li><strong>Oklahoma:</strong> <a href="https://oktap.tax.ok.gov">OkTAP</a></li>
            </ul>

            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                This is an automated reminder from Tax Planner.
            </p>
        </body>
        </html>
        """

        body_text = f"""
Q{quarter} Estimated Tax Payment Reminder

Due Date: {due_date.strftime('%B %d, %Y')} ({days_until} days)

Payment Summary:
- Federal (IRS): ${federal_amount:,.2f}
- State (CA + OK): ${state_amount:,.2f}
- Total: ${total_amount:,.2f}

Payment Methods:
- Federal: https://www.irs.gov/payments
- California: https://www.ftb.ca.gov/pay
- Oklahoma: https://oktap.tax.ok.gov
        """

        return await self.send_email(to_email, subject, body_html, body_text)

    async def send_rsu_vest_notification(
        self,
        to_email: str,
        symbol: str,
        shares: int,
        value: float,
        vest_date: date,
    ) -> bool:
        """Send RSU vesting notification."""
        subject = f"Tax Planner - RSU Vesting Today: {shares} shares of {symbol}"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">RSU Vesting Notification</h2>

            <p>Your RSU shares have vested today!</p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                    <tr>
                        <td>Symbol</td>
                        <td style="text-align: right; font-weight: bold;">{symbol}</td>
                    </tr>
                    <tr>
                        <td>Shares Vested</td>
                        <td style="text-align: right; font-weight: bold;">{shares}</td>
                    </tr>
                    <tr>
                        <td>Estimated Value</td>
                        <td style="text-align: right; font-weight: bold;">${value:,.2f}</td>
                    </tr>
                    <tr>
                        <td>Vest Date</td>
                        <td style="text-align: right;">{vest_date.strftime('%B %d, %Y')}</td>
                    </tr>
                </table>
            </div>

            <h3>Tax Implications</h3>
            <p>The fair market value at vesting (${value:,.2f}) will be included as ordinary income
            on your W-2. Taxes are typically withheld by your employer through share withholding.</p>

            <p>Your cost basis for future capital gains calculations is the price at vesting.</p>

            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                This is an automated notification from Tax Planner.
            </p>
        </body>
        </html>
        """

        return await self.send_email(to_email, subject, body_html)

    async def send_year_end_summary(
        self,
        to_email: str,
        year: int,
        gross_income: float,
        total_tax: float,
        effective_rate: float,
        refund_or_owed: float,
    ) -> bool:
        """Send year-end tax summary."""
        status = "Refund Expected" if refund_or_owed >= 0 else "Additional Tax Owed"
        status_color = "#16a34a" if refund_or_owed >= 0 else "#dc2626"

        subject = f"Tax Planner - {year} Year-End Tax Summary"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{year} Year-End Tax Summary</h2>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                    <tr>
                        <td>Gross Income</td>
                        <td style="text-align: right; font-weight: bold;">${gross_income:,.0f}</td>
                    </tr>
                    <tr>
                        <td>Total Tax Liability</td>
                        <td style="text-align: right; font-weight: bold;">${total_tax:,.0f}</td>
                    </tr>
                    <tr>
                        <td>Effective Tax Rate</td>
                        <td style="text-align: right; font-weight: bold;">{effective_rate:.1f}%</td>
                    </tr>
                    <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding-top: 10px;"><strong>{status}</strong></td>
                        <td style="text-align: right; font-weight: bold; padding-top: 10px;
                            font-size: 18px; color: {status_color};">
                            ${abs(refund_or_owed):,.0f}
                        </td>
                    </tr>
                </table>
            </div>

            <h3>Next Steps</h3>
            <ul>
                <li>Gather all tax documents (W-2, 1099s, etc.)</li>
                <li>Review your 401(k) contributions for the year</li>
                <li>Prepare for tax filing season (opens January)</li>
            </ul>

            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                This is an automated summary from Tax Planner.
            </p>
        </body>
        </html>
        """

        return await self.send_email(to_email, subject, body_html)


_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
