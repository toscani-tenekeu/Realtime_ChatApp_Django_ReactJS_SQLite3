"""Populate the local Realtime ChatApp database with deterministic demonstration data."""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "realtime_chatapp.settings")

import django

django.setup()

from django.core.management import call_command


if __name__ == "__main__":
    call_command("migrate", interactive=False)
    call_command("seed_demo", reset="--reset" in sys.argv)
