"""
Tax Planner API
FastAPI backend for tax planning automation.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
try:
    from routers import (
        paystubs_router,
        tax_router,
        optimizer_router,
        etrade_router,
        notifications_router,
        quarterly_router,
        rsu_vesting_router,
    )
except Exception as e:
    raise

# Create FastAPI app
app = FastAPI(
    title="Tax Planner API",
    description="API for personal tax planning and projection",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(paystubs_router, prefix="/api")
app.include_router(tax_router, prefix="/api")
app.include_router(optimizer_router, prefix="/api")
app.include_router(etrade_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(quarterly_router, prefix="/api")
app.include_router(rsu_vesting_router, prefix="/api")


@app.get("/api")
async def root():
    """API root endpoint."""
    return {
        "name": "Tax Planner API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/api/docs",
            "paystubs": "/api/paystubs",
            "tax": "/api/tax",
            "optimizer": "/api/optimizer",
            "etrade": "/api/etrade",
            "quarterly": "/api/quarterly",
            "notifications": "/api/notifications",
            "rsu_vesting": "/api/rsu-vesting",
        },
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
