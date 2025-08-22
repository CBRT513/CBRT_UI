from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import os
from .cors import add_cors
from .routes import cbrt

app = FastAPI(
    title="CBRT Broker API",
    description="Broker service for CBRT SSO and data operations",
    version="1.0.0"
)

# Add CORS middleware
add_cors(app)

@app.get("/api/health", response_class=JSONResponse)
def health():
  """Health check endpoint - returns service status"""
  return {
    "ok": True,
    "service": "broker",
    "env": os.getenv("ENV", "staging"),
    "version": os.getenv("VERSION", "v1"),
    "time": datetime.now(timezone.utc).isoformat(),
    "auth_project": os.getenv("AUTH_PROJECT", "barge2rail-auth")
  }

# Include CBRT routes
app.include_router(cbrt.router)

# Optional: Add a root endpoint for debugging
@app.get("/", response_class=JSONResponse)
def root():
  """Root endpoint - returns API info"""
  return {
    "service": "CBRT Broker API",
    "health": "/api/health",
    "docs": "/docs",
    "openapi": "/openapi.json"
  }