"""
Vercel serverless function entry point.
This file exports the FastAPI app for Vercel's Python runtime.
"""
import sys
from pathlib import Path

# Add the parent directory to the Python path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

# Vercel expects the app to be named 'app' or 'handler'
# FastAPI apps work directly with Vercel's Python runtime
