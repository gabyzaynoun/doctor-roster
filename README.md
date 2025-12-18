# Doctor Roster Scheduling System

A production-grade scheduling system for managing doctor rosters across multiple medical centers.

## Features

- Multi-center support (Al Narjis, Al Ghadir, Digital City, Diplomatic Quarter, Airport)
- Automatic constraint validation (hours, rest periods, shift sequences)
- Auto-builder for generating complete monthly schedules
- Role-based access (Admin, Team Lead, Doctor)
- Leave management and request handling

## Project Structure

```
doctor-roster/
├── backend/          # FastAPI application
├── frontend/         # React + Vite application
├── docs/             # Documentation
├── Makefile          # Convenience scripts
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

## Quick Start

### Using Make (Recommended)

```bash
# Install all dependencies
make install

# Run both backend and frontend (in separate terminals)
make backend   # Terminal 1
make frontend  # Terminal 2
```

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## Access

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## Development

### Backend Commands

```bash
cd backend
uvicorn app.main:app --reload  # Development server with hot reload
```

### Frontend Commands

```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## API Endpoints

| Method | Endpoint  | Description         |
|--------|-----------|---------------------|
| GET    | /health   | Health check        |

## Deployment

### Option 1: Railway (Easiest - Keeps SQLite)

Railway supports persistent storage, so you can keep using SQLite without migrating to PostgreSQL.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
cd backend
railway login
railway init
railway up

# Deploy frontend
cd ../frontend
railway init
railway up
```

Set environment variables in Railway Dashboard:
- `SECRET_KEY` - Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`
- `CORS_ORIGINS` - Your frontend Railway URL

### Option 2: Render (SQLite with Persistent Disk)

Render offers persistent disks for SQLite databases.

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a new "Blueprint"
3. Connect your repo - Render will detect `render.yaml` and deploy both services

### Option 3: Vercel (Requires PostgreSQL)

Vercel's serverless functions don't have persistent storage, so SQLite won't work. You'll need PostgreSQL.

#### Deploy Backend
```bash
cd backend
vercel
```

Set up a PostgreSQL database ([Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Supabase](https://supabase.com/), or [Neon](https://neon.tech/)) and configure:
```
DATABASE_URL=postgresql://...
SECRET_KEY=your-secure-secret-key
APP_ENV=production
CORS_ORIGINS=https://your-frontend.vercel.app
```

#### Deploy Frontend
```bash
cd frontend
vercel
```

Set: `BACKEND_URL=https://your-backend.vercel.app`

### Environment Variables

#### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | Database connection string | `sqlite:///./doctor_roster.db` |
| SECRET_KEY | JWT signing key | `your-32-char-secret` |
| APP_ENV | Environment mode | `production` |
| CORS_ORIGINS | Allowed origins | `https://app.example.com` |

#### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL (optional) | `https://api.example.com` |

## License

Proprietary - Internal use only.
