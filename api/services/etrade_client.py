"""
E*Trade API Client
Handles OAuth authentication and fetching RSU position data.
"""

import os
from typing import Optional
from datetime import datetime, date
from requests_oauthlib import OAuth1Session


class ETradeClient:
    """Client for interacting with E*Trade API."""

    SANDBOX_BASE_URL = "https://apisb.etrade.com"
    PROD_BASE_URL = "https://api.etrade.com"

    def __init__(
        self,
        consumer_key: Optional[str] = None,
        consumer_secret: Optional[str] = None,
        sandbox: bool = True
    ):
        self.consumer_key = consumer_key or os.getenv("ETRADE_CONSUMER_KEY")
        self.consumer_secret = consumer_secret or os.getenv("ETRADE_CONSUMER_SECRET")
        self.sandbox = sandbox
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.PROD_BASE_URL

        self.request_token = None
        self.request_token_secret = None
        self.access_token = None
        self.access_token_secret = None

    def get_request_token(self) -> tuple:
        """Get request token for OAuth flow."""
        if not self.consumer_key or not self.consumer_secret:
            raise ValueError("E*Trade consumer key and secret are required")

        oauth = OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            callback_uri="oob"
        )

        request_token_url = f"{self.base_url}/oauth/request_token"
        response = oauth.fetch_request_token(request_token_url)

        self.request_token = response.get("oauth_token")
        self.request_token_secret = response.get("oauth_token_secret")

        return self.request_token, self.request_token_secret

    def get_authorization_url(self) -> str:
        """Get URL for user to authorize the application."""
        if not self.request_token:
            self.get_request_token()

        auth_url = (
            f"https://{'apisb' if self.sandbox else 'us'}.etrade.com/e/t/etws/authorize"
            f"?key={self.consumer_key}&token={self.request_token}"
        )
        return auth_url

    def get_access_token(self, verifier: str) -> tuple:
        """Exchange verifier for access token."""
        if not self.request_token or not self.request_token_secret:
            raise ValueError("Must call get_request_token first")

        oauth = OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=self.request_token,
            resource_owner_secret=self.request_token_secret,
            verifier=verifier
        )

        access_token_url = f"{self.base_url}/oauth/access_token"
        response = oauth.fetch_access_token(access_token_url)

        self.access_token = response.get("oauth_token")
        self.access_token_secret = response.get("oauth_token_secret")

        return self.access_token, self.access_token_secret

    def _get_session(self) -> OAuth1Session:
        """Get authenticated OAuth session."""
        if not self.access_token or not self.access_token_secret:
            raise ValueError("Not authenticated. Complete OAuth flow first.")

        return OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=self.access_token,
            resource_owner_secret=self.access_token_secret
        )

    def get_accounts(self) -> list:
        """Get list of user accounts."""
        session = self._get_session()
        url = f"{self.base_url}/v1/accounts/list.json"

        response = session.get(url)
        response.raise_for_status()

        data = response.json()
        accounts = data.get("AccountListResponse", {}).get("Accounts", {}).get("Account", [])

        return accounts if isinstance(accounts, list) else [accounts]

    def get_positions(self, account_id: str) -> list:
        """Get positions for a specific account."""
        session = self._get_session()
        url = f"{self.base_url}/v1/accounts/{account_id}/portfolio.json"

        response = session.get(url)
        response.raise_for_status()

        data = response.json()
        positions = data.get("PortfolioResponse", {}).get("AccountPortfolio", [])

        if positions and isinstance(positions, list):
            positions = positions[0].get("Position", [])

        return positions if isinstance(positions, list) else [positions] if positions else []

    def get_rsu_positions(self) -> list:
        """Get RSU positions from all accounts."""
        rsu_positions = []

        try:
            accounts = self.get_accounts()

            for account in accounts:
                account_id = account.get("accountId")
                if not account_id:
                    continue

                positions = self.get_positions(account_id)

                for pos in positions:
                    product = pos.get("Product", {})
                    symbol = product.get("symbol", "")

                    quantity = pos.get("quantity", 0)
                    cost_basis = pos.get("costBasis", 0)
                    current_price = pos.get("Quick", {}).get("lastTrade", 0)
                    current_value = quantity * current_price if current_price else 0
                    unrealized_gain = current_value - cost_basis if cost_basis else 0

                    vesting_date = pos.get("vestingDate")
                    if vesting_date:
                        try:
                            vesting_date = datetime.strptime(vesting_date, "%Y-%m-%d").date()
                        except (ValueError, TypeError):
                            vesting_date = date.today()
                    else:
                        vesting_date = date.today()

                    rsu_positions.append({
                        "symbol": symbol,
                        "quantity": int(quantity),
                        "cost_basis": round(cost_basis / quantity if quantity else 0, 2),
                        "current_price": round(current_price, 2),
                        "current_value": round(current_value, 2),
                        "unrealized_gain": round(unrealized_gain, 2),
                        "vesting_date": vesting_date,
                    })

        except Exception as e:
            print(f"Error fetching RSU positions: {e}")

        return rsu_positions


_client_instance: Optional[ETradeClient] = None
_pending_auth: dict = {}


def get_etrade_client() -> ETradeClient:
    """Get or create E*Trade client instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = ETradeClient()
    return _client_instance


def start_auth_flow() -> str:
    """Start OAuth flow and return authorization URL."""
    global _pending_auth
    client = get_etrade_client()
    request_token, request_token_secret = client.get_request_token()
    _pending_auth = {
        "request_token": request_token,
        "request_token_secret": request_token_secret,
    }
    return client.get_authorization_url()


def complete_auth_flow(verifier: str) -> bool:
    """Complete OAuth flow with verifier code."""
    global _pending_auth, _client_instance
    if not _pending_auth:
        raise ValueError("No pending auth flow")
    client = get_etrade_client()
    client.request_token = _pending_auth["request_token"]
    client.request_token_secret = _pending_auth["request_token_secret"]
    try:
        client.get_access_token(verifier)
        _pending_auth = {}
        return True
    except Exception as e:
        print(f"Auth flow error: {e}")
        return False
