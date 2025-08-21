from fastapi import FastAPI
from datetime import datetime, timezone
import os
from .cors import add_cors
from .routes import cbrt

app = FastAPI()
add_cors(app)

@app.get("/api/health")
def health():
  return {
    "ok": True,
    "service": "broker",
    "env": os.getenv("ENV","staging"),
    "version": os.getenv("VERSION","v1"),
    "time": datetime.now(timezone.utc).isoformat()
  }

app.include_router(cbrt.router)