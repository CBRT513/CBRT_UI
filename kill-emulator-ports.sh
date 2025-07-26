#!/bin/bash

# List of common Firebase emulator ports to kill
PORTS=(8081 9099 5001 9199 9399 5432 61699)

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -t -i :$PORT)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID
  fi
done

echo "✅ Emulator ports cleared."
