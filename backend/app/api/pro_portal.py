"""Endpoints de autenticación y sesión para el portal de estilistas."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_
from sqlmodel import Session, select

from app.core.auth import (
    clear_stylist_session_cookie,
    create_stylist_session_token,
    get_current_stylist,
    set_stylist_session_cookie,
)
from app.db import get_session
from app.models import ActionResult, StylistAuthOut, StylistDB, StylistLoginIn, StylistPublic
from app.utils.security import needs_rehash, verify_password, hash_password

router = APIRouter(prefix="/pros", tags=["pros"])


def _to_public(stylist: StylistDB) -> StylistPublic:
    return StylistPublic(
        id=stylist.id,
        name=stylist.name,
        display_name=stylist.display_name,
        services=stylist.services or [],
        email=stylist.email,
        phone=stylist.phone,
        calendar_id=stylist.calendar_id,
        use_gcal_busy=bool(stylist.use_gcal_busy),
    )


@router.post("/login", response_model=StylistAuthOut)
def stylist_login(
    payload: StylistLoginIn,
    response: Response,
    session: Session = Depends(get_session),
) -> StylistAuthOut:
    identifier = payload.identifier.strip()
    identifier_lower = identifier.lower()
    stmt = select(StylistDB).where(
        or_(
            StylistDB.id == identifier,
            StylistDB.id == identifier_lower,
            StylistDB.email == identifier,
            StylistDB.email == identifier_lower,
        )
    )
    stylist = session.exec(stmt).first()
    if not stylist or not stylist.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not verify_password(payload.password, stylist.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if needs_rehash(stylist.password_hash):
        stylist.password_hash = hash_password(payload.password)

    stylist.last_login_at = datetime.now(timezone.utc)
    session.add(stylist)
    session.commit()
    session.refresh(stylist)

    token, expires_at = create_stylist_session_token(stylist.id)
    set_stylist_session_cookie(response, token, expires_at)

    return StylistAuthOut(
        stylist=_to_public(stylist),
        session_expires_at=expires_at,
    )


@router.post("/logout", response_model=ActionResult)
def stylist_logout(response: Response) -> ActionResult:
    clear_stylist_session_cookie(response)
    return ActionResult(ok=True, message="Sesión cerrada")


@router.get("/me", response_model=StylistAuthOut)
def stylist_me(
    response: Response,
    stylist: StylistDB = Depends(get_current_stylist),
) -> StylistAuthOut:
    # Renovamos el token para extender la sesión de forma silenciosa
    token, expires_at = create_stylist_session_token(stylist.id)
    set_stylist_session_cookie(response, token, expires_at)
    return StylistAuthOut(stylist=_to_public(stylist), session_expires_at=expires_at)
