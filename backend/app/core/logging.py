"""
app/core/logging.py
────────────────────
Structured JSON logging using Python's standard `logging` library.
All application modules should retrieve a logger via `get_logger(__name__)`.
"""

import logging
import sys
from typing import Optional


_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


def configure_logging(level: int = logging.INFO) -> None:
    """Call once at application startup to configure root logger."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers if called more than once (e.g. during testing)
    if not root.handlers:
        root.addHandler(handler)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return a logger for the given module name."""
    return logging.getLogger(name)
