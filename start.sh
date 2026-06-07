#!/bin/bash
# 政策化债追踪工作台 — 启动脚本
# Usage: ./start.sh

cd "$(dirname "$0")"

# Kill any existing instance
pkill -f "python3 server.py" 2>/dev/null
sleep 1

# Set optional environment variables
# export OPENAI_API_KEY="your_key_here"
# export PORT=3000

echo "Starting Policy Debt Intelligence server..."
python3 server.py
