.PHONY: install install-backend install-frontend backend frontend clean help

# Default target
help:
	@echo "Doctor Roster Scheduling System - Development Commands"
	@echo ""
	@echo "Usage:"
	@echo "  make install          Install all dependencies (backend + frontend)"
	@echo "  make install-backend  Install backend dependencies only"
	@echo "  make install-frontend Install frontend dependencies only"
	@echo "  make backend          Run backend server (port 8000)"
	@echo "  make frontend         Run frontend dev server (port 5173)"
	@echo "  make clean            Remove generated files and caches"
	@echo ""

# Install all dependencies
install: install-backend install-frontend
	@echo "All dependencies installed successfully!"

# Install backend dependencies
install-backend:
	@echo "Setting up backend..."
	cd backend && python -m venv .venv
	cd backend && .venv\Scripts\pip install -r requirements.txt
	@echo "Backend setup complete!"

# Install frontend dependencies
install-frontend:
	@echo "Setting up frontend..."
	cd frontend && npm install
	@echo "Frontend setup complete!"

# Run backend server
backend:
	cd backend && .venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run frontend development server
frontend:
	cd frontend && npm run dev

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	-rmdir /s /q backend\__pycache__ 2>nul
	-rmdir /s /q backend\app\__pycache__ 2>nul
	-rmdir /s /q frontend\node_modules 2>nul
	-rmdir /s /q frontend\dist 2>nul
	@echo "Clean complete!"
