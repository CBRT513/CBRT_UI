import os, time
from fastapi import Header, HTTPException, Depends
from google.auth.transport.requests import Request
from google.oauth2 import id_token as google_id_token
import firebase_admin
from firebase_admin import firestore, initialize_app

AUTH_PROJECT = os.getenv("AUTH_PROJECT","barge2rail-auth")
ROLE_ORDER = {"viewer":0, "loader":1, "supervisor":2, "admin":3}

if not firebase_admin._apps:
  initialize_app()  # ADC on Cloud Run

_db = firestore.client()  # Auth project's Firestore (/users)

def verify_id_token(authorization: str = Header(default="")) -> dict:
  if not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail="Missing bearer token")
  token = authorization.split(" ", 1)[1]
  try:
    claims = google_id_token.verify_firebase_token(token, Request(), audience=AUTH_PROJECT)
    if not str(claims.get("iss","")).startswith("https://securetoken.google.com/"): raise ValueError("bad issuer")
    if claims.get("aud") != AUTH_PROJECT: raise ValueError("bad audience")
    if int(claims.get("exp",0)) < int(time.time()) - 5: raise ValueError("expired")
    return claims
  except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

def get_user_role(uid: str) -> str:
  doc = _db.collection("users").document(uid).get()
  if not doc.exists: raise HTTPException(status_code=403, detail="User not provisioned")
  data = doc.to_dict() or {}
  if data.get("status") != "active": raise HTTPException(status_code=403, detail="User disabled")
  role = (data.get("role") or "viewer").lower()
  if role not in ROLE_ORDER: raise HTTPException(status_code=403, detail="Unknown role")
  return role

def require_role(min_role: str):
  if min_role not in ROLE_ORDER: raise RuntimeError(f"Unknown role: {min_role}")
  def _dep(claims: dict = Depends(verify_id_token)):
    uid = claims.get("user_id") or claims.get("uid")
    if not uid: raise HTTPException(status_code=401, detail="No uid")
    role = get_user_role(uid)
    if ROLE_ORDER[role] < ROLE_ORDER[min_role]:
      raise HTTPException(status_code=403, detail=f"Role '{role}' insufficient for '{min_role}'")
    return {"uid": uid, "email": claims.get("email"), "role": role}
  return _dep