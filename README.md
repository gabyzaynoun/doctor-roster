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

## License

Proprietary - Internal use only.
