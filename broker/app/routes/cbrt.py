from fastapi import APIRouter, Depends, Query
from ..auth import require_role

router = APIRouter(prefix="/cbrt", tags=["cbrt"])

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