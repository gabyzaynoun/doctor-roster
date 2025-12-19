# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Force cache invalidation
RUN echo "Cache bust: v3 - $(date)" > /tmp/cache_bust

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run the application via start script (handles Railway's $PORT)
CMD ["sh", "start.sh"]
