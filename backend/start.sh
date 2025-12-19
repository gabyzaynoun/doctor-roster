#!/bin/sh
set -e

# Default to port 8000 if PORT not set
export PORT="${PORT:-8000}"

# Run database seed if not already seeded
echo "Checking if database needs seeding..."
python -c "
from app.core.database import SessionLocal
from app.models import User
db = SessionLocal()
user_count = db.query(User).count()
db.close()
print(f'Database has {user_count} users')
exit(0 if user_count > 0 else 1)
" && echo "Database already seeded" || python scripts/seed_demo_data.py

echo "Starting uvicorn on port $PORT"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
