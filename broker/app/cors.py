import os
from fastapi.middleware.cors import CORSMiddleware

def add_cors(app):
  # Comprehensive list of allowed origins
  allowed = os.getenv(
    "ALLOWED_ORIGINS",
    ",".join([
      "http://localhost:5173",      # Local development
      "http://localhost:5174",      # Alternate local port
      "http://127.0.0.1:5173",      # Local IP
      "https://cbrt-app-ui-dev.web.app",       # Dev environment
      "https://cbrt-ui-staging.web.app",       # Staging environment
      "https://maintenance.barge2rail.com",    # Maintenance domain
      "https://cbrt.barge2rail.com"            # Production domain
    ])
  ).split(",")
  
  # Regex for Firebase preview channels (e.g., cbrt-app-ui-dev--pr-123.web.app)
  regex = os.getenv(
    "ALLOWED_ORIGIN_REGEX", 
    r"^https:\/\/(cbrt-app-ui-dev|cbrt-ui-staging)(--[\w-]+)?\.web\.app$"
  )
  
  app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed if o.strip()],
    allow_origin_regex=regex,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
      "authorization",
      "content-type",
      "accept",
      "origin",
      "x-requested-with"
    ],
    allow_credentials=False,
    max_age=86400,  # 24 hours
  )