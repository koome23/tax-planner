#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn index:app --reload --port 8001
