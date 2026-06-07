import sys
import os

# Add project root to path so we can import server.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# Vercel expects a WSGI handler named `handler` or the app itself
handler = app
