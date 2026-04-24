"""
run.py
───────
Convenient development entry-point.

Usage:
    python run.py

For production, use Uvicorn directly:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
"""

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,           # hot-reload in development
        log_level="info",
    )
