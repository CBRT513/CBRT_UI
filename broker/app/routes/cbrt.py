from fastapi import APIRouter, Depends, Query
from ..auth import require_role, verify_id_token, get_user_role

router = APIRouter(prefix="/cbrt", tags=["cbrt"])

@router.get("/me")
def get_current_user(claims: dict = Depends(verify_id_token)):
  """Get current user info including role"""
  uid = claims.get("user_id") or claims.get("uid")
  if not uid:
    return {"error": "No uid in token"}
  
  try:
    role = get_user_role(uid)
    return {
      "uid": uid,
      "email": claims.get("email"),
      "role": role
    }
  except Exception as e:
    # User might not exist in /users collection yet
    return {
      "uid": uid,
      "email": claims.get("email"),
      "role": "viewer"  # Default role if not provisioned
    }

@router.get("/releases")
def list_releases(status: list[str] = Query(default=[]), user = Depends(require_role("viewer"))):
  # TODO: wire to data project; for now empty list is fine for UI wiring
  return {"ok": True, "items": [], "status": status}

@router.post("/releases/{rid}/stage")
def stage_release(rid: str, user = Depends(require_role("loader"))):
  return {"ok": True, "rid": rid, "action": "stage"}

@router.post("/releases/{rid}/verify")
def verify_release(rid: str, user = Depends(require_role("supervisor"))):
  return {"ok": True, "rid": rid, "action": "verify"}

@router.post("/releases/{rid}/reject")
def reject_release(rid: str, user = Depends(require_role("supervisor"))):
  return {"ok": True, "rid": rid, "action": "reject"}

@router.post("/releases/{rid}/load")
def load_release(rid: str, user = Depends(require_role("loader"))):
  return {"ok": True, "rid": rid, "action": "load"}

@router.get("/audit")
def audit(releaseId: str, user = Depends(require_role("viewer"))):
  return {"ok": True, "items": []}