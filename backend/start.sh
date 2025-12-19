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
if user_count == 0:
    print('Database empty, running seed script...')
    exec(open('scripts/seed_demo_data.py').read())
else:
    print(f'Database already has {user_count} users, skipping seed.')
"

echo "Starting uvicorn on port $PORT"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
