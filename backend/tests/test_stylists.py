from __future__ import annotations

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from app.models import StylistDB
from app.utils.security import hash_password, verify_password, needs_rehash


def test_hash_and_verify_password():
    hashed = hash_password("supersegura123")
    assert hashed != "supersegura123"
    assert verify_password("supersegura123", hashed)
    assert not verify_password("otrovalor", hashed)
    assert needs_rehash(hashed) is False


def test_create_stylist_db_record():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        stylist = StylistDB(
            id="test_pro",
            name="Test Pro",
            display_name="Test Pro",
            email="test@example.com",
            services=["corte_cabello"],
            password_hash=hash_password("otraClave123"),
            calendar_id="calendar@test",
            use_gcal_busy=True,
        )
        session.add(stylist)
        session.commit()

        stored = session.get(StylistDB, "test_pro")
        assert stored is not None
        assert stored.services == ["corte_cabello"]
        assert stored.use_gcal_busy is True
        assert verify_password("otraClave123", stored.password_hash)
