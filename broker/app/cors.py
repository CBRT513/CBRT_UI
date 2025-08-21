import os
from fastapi.middleware.cors import CORSMiddleware

def add_cors(app):
  allowed = os.getenv("ALLOWED_ORIGINS","http://localhost:5173,https://cbrt-app-ui-dev.web.app,https://cbrt-ui-staging.web.app,https://maintenance.barge2rail.com,https://cbrt.barge2rail.com").split(",")
  regex = os.getenv("ALLOWED_ORIGIN_REGEX", r"^https:\/\/(cbrt-app-ui-dev|cbrt-ui-staging)(--[\w-]+)?\.web\.app$")
  app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed if o.strip()],
    allow_origin_regex=regex,
    allow_methods=["*"],
    allow_headers=["authorization","content-type"],
    allow_credentials=False,
    max_age=86400,
  )