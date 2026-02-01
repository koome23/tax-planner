# Tax Planner

A full-stack tax planning application for tracking income, calculating tax projections, and optimizing 401(k) contributions.

## Features

- **Dashboard**: Overview of YTD income, tax withheld, projected liability, and action items
- **Paystub Management**: Upload and parse paystub PDFs, view history, edit parsed data
- **RSU Tracker**: Connect to E*Trade to import RSU positions and track vesting
- **401(k) Optimizer**: Calculate optimal contribution percentages to maximize tax savings
- **Quarterly Estimates**: Track estimated tax payments with due date reminders
- **Email Notifications**: Automated reminders for quarterly payments and RSU vests

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- shadcn/ui components
- React Query
- Recharts

### Backend
- FastAPI (Python)
- pdfplumber (PDF parsing)
- requests-oauthlib (E*Trade OAuth)
- aiosmtplib (Email notifications)

### Deployment
- Vercel (Frontend)
- Railway.app (Backend API with full Python dependencies)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tax-planner
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../api
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Running Locally

1. Start the backend:
```bash
cd api
./start.sh
```
Or manually: `uvicorn index:app --reload --port 8001`

2. Start the frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

3. Open http://localhost:3000 in your browser

## Configuration

### Tax Settings

The application is configured for:
- **Filing Status**: Married Filing Jointly
- **States**: California (primary) + Oklahoma (secondary)
- **Tax Year**: 2025

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ETRADE_CONSUMER_KEY` | E*Trade API consumer key |
| `ETRADE_CONSUMER_SECRET` | E*Trade API consumer secret |
| `SMTP_SERVER` | SMTP server for email notifications |
| `SMTP_PORT` | SMTP port (usually 587 for TLS) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASSWORD` | SMTP password or app password |
| `NOTIFICATION_EMAIL` | Email address to receive notifications |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/paystubs` | GET | List all paystubs |
| `/api/paystubs/upload` | POST | Upload and parse paystub PDF |
| `/api/tax/projection` | GET | Get tax projection |
| `/api/optimizer/401k` | POST | Calculate optimal 401(k) contribution |
| `/api/etrade/auth-url` | GET | Get E*Trade OAuth URL |
| `/api/etrade/positions` | GET | Get RSU positions |
| `/api/quarterly/estimate` | GET | Get quarterly tax estimates |
| `/api/notifications/test` | POST | Send test notification |

## 2025 Tax Information

### Federal Tax Brackets (MFJ)
- 10%: $0 - $23,850
- 12%: $23,850 - $96,950
- 22%: $96,950 - $206,700
- 24%: $206,700 - $394,600
- 32%: $394,600 - $501,050
- 35%: $501,050 - $751,600
- 37%: $751,600+

### 401(k) Limits
- Elective Deferral: $23,500
- Catch-up (50+): $7,500
- Total with Catch-up: $31,000

### FICA
- Social Security: 6.2% (up to $176,100)
- Medicare: 1.45% (no cap)
- Additional Medicare: 0.9% (income over $250,000 MFJ)

## Deployment

### Hybrid Architecture

The application uses a hybrid deployment approach:
- **Frontend**: Deployed on Vercel (Next.js)
- **Backend**: Deployed on Railway.app (FastAPI with full Python dependencies)

This architecture allows the backend to use heavy dependencies like `pdfplumber` that exceed Vercel's serverless function size limits.

### Railway.app Backend Setup

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize Railway in your project:
```bash
railway init
```

4. Link to existing project (or create new):
```bash
railway link
```

5. Set environment variables in Railway dashboard:
   - `ETRADE_CONSUMER_KEY`
   - `ETRADE_CONSUMER_SECRET`
   - `SMTP_SERVER`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `NOTIFICATION_EMAIL`
   - `PORT` (automatically set by Railway)

6. Deploy:
```bash
railway up
```

Or connect your GitHub repository in Railway dashboard for automatic deployments on push.

7. Get your Railway deployment URL (e.g., `https://your-app.up.railway.app`)

### Vercel Frontend Setup

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `API_URL`: Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
3. Deploy

The `vercel.json` configuration handles routing for the Next.js frontend. The frontend automatically proxies `/api/*` requests to the Railway backend URL specified in `API_URL` environment variable.

### Local Development

Local development remains unchanged:
- Backend runs on `http://localhost:8001`
- Frontend runs on `http://localhost:3000`
- Frontend automatically proxies API requests to local backend via Next.js rewrites

## License

MIT
