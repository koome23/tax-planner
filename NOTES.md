# Architecture & Design Decisions

This document captures key architectural and design decisions made during the development of the Tax Planner application.

## Deployment Architecture

### Hybrid Deployment (Frontend: Vercel, Backend: Railway)
- **Decision**: Deploy frontend on Vercel and backend on Railway.app
- **Rationale**: 
  - Vercel serverless functions have size limitations that prevent heavy dependencies like `pdfplumber`
  - Railway.app supports full Python environments with all dependencies
  - Maintains fast frontend CDN delivery via Vercel
  - Cost-effective for personal use (both platforms offer free tiers)
- **Implementation**: 
  - Frontend: Next.js app deployed on Vercel as static site
  - Backend: FastAPI deployed on Railway.app as containerized service
  - Frontend proxies `/api/*` requests to Railway backend via `API_URL` environment variable
  - All API routes prefixed with `/api` for clear separation
  - Railway configuration: `railway.toml` specifies Python runtime and start command

### API Route Prefixing
- **Decision**: All backend routes use `/api` prefix
- **Rationale**: Clear separation between frontend routes and API endpoints
- **Implementation**: 
  - FastAPI routers include `prefix="/api"` in `index.py`
  - Frontend API client uses `/api` base path
  - OpenAPI docs available at `/api/docs`

## Graceful Degradation Strategy

### Optional Dependencies (Legacy - Now Resolved)
- **Decision**: Make heavy dependencies (PDF parsing, E*Trade OAuth) optional with graceful fallbacks
- **Rationale**: 
  - ~~Serverless environments have size limitations~~ (Resolved: Railway backend supports full dependencies)
  - ~~Some dependencies (like `pdfplumber`, `requests-oauthlib`) may exceed function size limits~~ (Resolved: Railway deployment supports all dependencies)
  - Allows core functionality to work even if advanced features aren't available (still useful for local development without dependencies)
- **Implementation**:
  - Try/except blocks around imports with `AVAILABLE` flags
  - API endpoints return 501 (Not Implemented) when features unavailable
  - Frontend can detect and handle unavailable features
- **Note**: With Railway backend deployment, `pdfplumber` and other heavy dependencies are now fully available in production. The graceful degradation pattern remains useful for local development scenarios.

### PDF Parsing Fallback
- **Decision**: Provide manual entry endpoint when PDF parsing unavailable
- **Rationale**: Users can still add paystub data even in serverless environment
- **Implementation**:
  - `/api/paystubs/upload` requires PDF parsing
  - `/api/paystubs/manual` accepts JSON payload for manual entry
  - Frontend can detect capability and show appropriate UI

### E*Trade Integration Fallback
- **Decision**: Return mock RSU data when E*Trade integration unavailable
- **Rationale**: 
  - Allows frontend development/testing without API credentials
  - Users can still see RSU tracking UI and functionality
- **Implementation**:
  - `/api/etrade/positions` returns mock data if not connected
  - `/api/etrade/status` endpoint indicates connection state
  - Frontend can show connection status and prompt for setup

## Data Storage

### In-Memory Storage (Current)
- **Decision**: Use in-memory Python lists/dicts for data storage
- **Rationale**: 
  - Simplest implementation for MVP
  - No database setup required
  - Sufficient for single-user personal use
- **Limitations**:
  - Data lost on serverless function restart
  - Not suitable for production multi-user scenarios
- **Future**: Replace with persistent database (PostgreSQL, MongoDB, or Vercel Postgres)

## Authentication & Security

### E*Trade OAuth Flow
- **Decision**: Implement OAuth 1.0 flow for E*Trade API
- **Rationale**: E*Trade requires OAuth 1.0 for API access
- **Implementation**:
  - Three-step flow: request token → authorization → access token
  - State stored in global variables (single-user assumption)
  - Sandbox mode by default for testing
- **Security Note**: Access tokens stored in memory only (lost on restart)

### CORS Configuration
- **Decision**: Allow all origins in development (`allow_origins=["*"]`)
- **Rationale**: Simplifies local development
- **TODO**: Configure specific origins for production deployment

## API Design Patterns

### Response Models
- **Decision**: Use Pydantic models for all API responses
- **Rationale**: 
  - Type safety and validation
  - Automatic OpenAPI schema generation
  - Consistent response structure
- **Implementation**: All endpoints use `response_model` parameter

### Error Handling
- **Decision**: Use HTTPException with appropriate status codes
- **Rationale**: Standard REST API error responses
- **Status Codes Used**:
  - `400`: Bad request (validation errors)
  - `404`: Not found
  - `500`: Internal server error
  - `501`: Not implemented (feature unavailable)

## Frontend Architecture

### React Query for Data Fetching
- **Decision**: Use `@tanstack/react-query` for all API calls
- **Rationale**:
  - Automatic caching and refetching
  - Loading and error states
  - Optimistic updates support
- **Implementation**: Centralized API client in `src/lib/api.ts`

### Component Library
- **Decision**: Use shadcn/ui components built on Radix UI
- **Rationale**:
  - Accessible by default
  - Customizable styling with Tailwind
  - Copy-paste component pattern (not npm dependency)
- **Components Used**: Button, Card, Input, Label, Progress, Slider, Tabs

## Tax Calculation Assumptions

### Filing Status
- **Decision**: Hardcoded for "Married Filing Jointly"
- **Rationale**: Personal use case
- **Future**: Make configurable in settings

### State Taxes
- **Decision**: Support California (primary) + Oklahoma (secondary)
- **Rationale**: Personal tax situation
- **Implementation**: Calculates both state taxes separately

### Tax Year
- **Decision**: Default to 2025 tax brackets and limits
- **Rationale**: Current tax year
- **Future**: Support multiple tax years

## Development Workflow

### Environment Variables
- **Decision**: Use `.env` file for local development, platform-specific env vars for production
- **Rationale**: Standard practice for configuration management
- **Implementation**: 
  - `python-dotenv` loads `.env` in development
  - Vercel: Frontend environment variables (including `API_URL` pointing to Railway backend)
  - Railway: Backend environment variables (ETRADE, SMTP, etc.)
  - `PORT` is automatically set by Railway (no manual configuration needed)

### Local Development
- **Decision**: Run FastAPI with uvicorn on port 8000, Next.js on port 3000
- **Rationale**: Standard ports, easy to remember
- **Implementation**: 
  - Backend: `uvicorn index:app --reload --port 8000`
  - Frontend: `npm run dev` (defaults to 3000)

## Future Considerations

### Database Migration
- Replace in-memory storage with persistent database
- Consider Vercel Postgres for easy integration
- Add data migration scripts

### Multi-User Support
- Add user authentication (Auth0, Clerk, or similar)
- Isolate data per user
- Add user management endpoints

### Enhanced PDF Parsing
- Support multiple paystub formats
- Improve parsing accuracy with ML models
- Add validation and correction UI

### E*Trade Production
- Move from sandbox to production API
- Implement token refresh flow
- Add secure token storage (encrypted database)

### Testing
- Add unit tests for tax calculations
- Add integration tests for API endpoints
- Add E2E tests for critical user flows
