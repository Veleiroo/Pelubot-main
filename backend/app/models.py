"""
Modelos principales de datos para la API de reservas.
Incluye servicios, profesionales, reservas y estructuras de consulta.
"""
from pydantic import BaseModel, Field, field_validator, EmailStr, model_validator
from typing import List, Optional, Literal
from datetime import datetime, date, timezone
from sqlmodel import SQLModel, Field as SQLField
from sqlalchemy.types import DateTime
from sqlalchemy import Index, UniqueConstraint, CheckConstraint, event, Column, String, JSON
from app.utils.date import validate_target_dt, TZ

# Tipos de estado de reserva
ReservationStatus = Literal["confirmada", "asistida", "no_asistida", "cancelada"]

class Service(BaseModel):
    """Servicio ofrecido (ej.: corte, coloración)."""
    id: str
    name: str
    duration_min: int
    price_eur: float

class Professional(BaseModel):
    """Profesional (ej.: estilista, barbero)."""
    id: str
    name: str
    services: List[str]


class StylistBase(SQLModel):
    """Base SQLModel para estilistas con metadatos de autenticación."""

    id: str = SQLField(primary_key=True, description="Identificador slug único del estilista")
    name: str = SQLField(index=True, description="Nombre interno del estilista")
    display_name: Optional[str] = SQLField(default=None, description="Nombre público mostrado en la UI")
    email: Optional[str] = SQLField(
        default=None,
        sa_column=Column(String, unique=True, nullable=True),
        description="Email de contacto / login",
    )
    phone: Optional[str] = SQLField(default=None, description="Teléfono de contacto")
    password_hash: str = SQLField(description="Hash Argon2id de la contraseña")
    is_active: bool = SQLField(default=True, index=True, description="Marca estilista activo")
    services: List[str] = SQLField(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
        description="Lista de IDs de servicios que presta",
    )
    calendar_id: Optional[str] = SQLField(default=None, description="Calendario asociado (GCAL u otro)")
    use_gcal_busy: bool = SQLField(default=False, description="Si debe consultarse Busy de Google Calendar")
    created_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    updated_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    last_login_at: Optional[datetime] = SQLField(
        default=None,
        sa_type=DateTime(timezone=True),
        nullable=True,
    )
    mfa_secret: Optional[str] = SQLField(default=None, description="Secreto TOTP cifrado")
    notes: Optional[str] = SQLField(default=None, description="Notas internas")


class StylistDB(StylistBase, table=True):
    __tablename__ = "stylistdb"
    __table_args__ = (
        UniqueConstraint("email", name="uq_stylist_email"),
        Index("ix_stylist_active", "is_active"),
        {"extend_existing": True},
    )


class StylistPublic(BaseModel):
    """Representación pública segura del estilista."""

    id: str
    name: str
    services: List[str]
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    calendar_id: Optional[str] = None
    use_gcal_busy: bool = False


class StylistLoginIn(BaseModel):
    """Payload de inicio de sesión para estilistas (ID o email + contraseña)."""

    identifier: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=4, max_length=160)

    @field_validator("identifier")
    @classmethod
    def _normalize_identifier(cls, v: str) -> str:
        return v.strip()


class StylistAuthOut(BaseModel):
    """Respuesta del login con datos de sesión."""

    stylist: StylistPublic
    session_expires_at: datetime


class StylistReservationOut(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    professional_id: str
    start: datetime
    end: datetime
    status: ReservationStatus = "confirmada"
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StylistReservationsOut(BaseModel):
    reservations: List[StylistReservationOut]


class StylistOverviewSummary(BaseModel):
    total: int
    confirmadas: int
    asistidas: int
    no_asistidas: int
    canceladas: int


class StylistOverviewAppointment(BaseModel):
    id: str
    start: datetime
    end: Optional[datetime] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    status: ReservationStatus = "confirmada"
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    notes: Optional[str] = None
    last_visit: Optional[date] = None


class StylistOverviewOut(BaseModel):
    date: date
    timezone: str
    summary: StylistOverviewSummary
    upcoming: Optional[StylistOverviewAppointment] = None
    appointments: List[StylistOverviewAppointment] = Field(default_factory=list)


class StylistRescheduleIn(BaseModel):
    new_date: Optional[str] = Field(default=None, json_schema_extra={"example": "2025-09-06"})
    new_time: Optional[str] = Field(default=None, json_schema_extra={"example": "18:30"})
    new_start: Optional[str] = Field(default=None, json_schema_extra={"example": "2025-09-06T18:30:00+02:00"})

    @model_validator(mode="after")
    def _ensure_any_field(self) -> "StylistRescheduleIn":
        if not any((self.new_start, self.new_date, self.new_time)):
            raise ValueError("Se requiere new_start o new_date/new_time para reprogramar.")
        return self


class StylistStatsSummary(BaseModel):
    total_revenue_eur: float
    revenue_change_pct: float
    avg_ticket_eur: float
    avg_ticket_change_pct: float
    repeat_rate_pct: float
    repeat_rate_change_pct: float
    new_clients: int
    new_clients_change_pct: float


class StylistStatsTrendPoint(BaseModel):
    period: str
    label: str
    revenue_eur: float
    appointments: int


class StylistStatsServicePerformance(BaseModel):
    service_id: str
    service_name: str
    total_appointments: int
    total_revenue_eur: float
    growth_pct: float


class StylistStatsRetentionBucket(BaseModel):
    id: str
    label: str
    count: int
    share_pct: float
    trend: Literal["up", "down", "steady"]
    description: Optional[str] = None


class StylistStatsInsight(BaseModel):
    id: str
    title: str
    description: str
    priority: Literal["high", "medium", "low"] = "medium"


class StylistStatsOut(BaseModel):
    generated_at: datetime
    summary: StylistStatsSummary
    revenue_series: List[StylistStatsTrendPoint]
    top_services: List[StylistStatsServicePerformance]
    retention: List[StylistStatsRetentionBucket]
    insights: List[StylistStatsInsight]

class Reservation(BaseModel):
    """Reserva realizada por un cliente."""
    id: str
    service_id: str
    professional_id: str
    start: datetime
    end: datetime
    status: ReservationStatus = "confirmada"
    google_event_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None

class SlotsQuery(BaseModel):
    """Consulta de huecos disponibles."""
    service_id: str
    date_str: str
    professional_id: Optional[str] = None
    use_gcal: Optional[bool] = None

class SlotsOut(BaseModel):
    """Respuesta con huecos disponibles."""
    service_id: str
    date: date
    professional_id: Optional[str]
    slots: List[str]

class DaysAvailabilityIn(BaseModel):
    """Rango de días con disponibilidad de slots.
    Provee el servicio, rango [start, end] y opcionalmente profesional.
    """
    service_id: str
    start: date
    end: date
    professional_id: Optional[str] = None
    use_gcal: Optional[bool] = None

class DaysAvailabilityOut(BaseModel):
    service_id: str
    start: date
    end: date
    professional_id: Optional[str] = None
    available_days: List[str]

class CancelReservationIn(BaseModel):
    """Solicitud de cancelación de reserva."""
    reservation_id: str = Field(..., json_schema_extra={"example": "res_1"})

class ActionResult(BaseModel):
    """Resultado genérico de acción."""
    ok: bool
    message: str


class ReservationCreateOut(ActionResult):
    reservation_id: str
    google_event_id: Optional[str] = None
    sync_status: Literal["queued", "synced", "skipped", "failed"] = "queued"
    sync_job_id: Optional[int] = None

class RescheduleIn(BaseModel):
    """Solicitud de reprogramación de reserva."""
    reservation_id: str = Field(..., json_schema_extra={"example": "res_1"})
    new_date: Optional[str] = Field(None, json_schema_extra={"example": "2025-09-06"})
    new_time: Optional[str] = Field(None, json_schema_extra={"example": "18:30"})
    new_start: Optional[str] = Field(None, json_schema_extra={"example": "2025-09-06T18:30:00+02:00"})
    professional_id: Optional[str] = Field(None, json_schema_extra={"example": "deinis"})

class RescheduleOut(BaseModel):
    """Respuesta de reprogramación."""
    ok: bool
    message: str
    reservation_id: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    google_sync_status: Optional[str] = None
    sync_job_id: Optional[int] = None

class ReservationIn(BaseModel):
    """Entrada para crear reserva (end es opcional; se calcula en backend)."""
    service_id: str
    professional_id: str
    start: datetime
    end: Optional[datetime] = None
    customer_name: str = Field(..., min_length=2, max_length=120)
    customer_email: Optional[EmailStr] = Field(default=None)
    customer_phone: str = Field(..., min_length=6, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("start")
    @classmethod
    def _validate_start(cls, v: datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=TZ)
        validate_target_dt(v)
        return v

    @field_validator("customer_name")
    @classmethod
    def _validate_customer_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 2:
            raise ValueError("customer_name debe tener al menos 2 caracteres útiles")
        return name

    @field_validator("customer_phone")
    @classmethod
    def _validate_customer_phone(cls, v: str) -> str:
        if v is None:
            raise ValueError("customer_phone es obligatorio")
        phone = v.strip()
        if not phone:
            raise ValueError("customer_phone es obligatorio")
        digits = [c for c in phone if c.isdigit()]
        if len(digits) < 6:
            raise ValueError("customer_phone debe contener al menos 6 dígitos")
        return phone

    @field_validator("notes")
    @classmethod
    def _normalize_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        note = v.strip()
        return note or None

class ReservationDB(SQLModel, table=True):
    __table_args__ = (
        Index('ix_res_prof_start_end', 'professional_id', 'start', 'end'),
        Index('ix_res_status', 'status'),
        UniqueConstraint('google_calendar_id', 'google_event_id', name='uq_gcal_event_per_calendar'),
        CheckConstraint('end > start', name='ck_end_after_start'),
        {"extend_existing": True},
    )
    id: str = SQLField(primary_key=True)
    service_id: str = SQLField(index=True)
    professional_id: str = SQLField(index=True)
    start: datetime = SQLField(sa_type=DateTime(timezone=True), index=True)
    end: datetime = SQLField(sa_type=DateTime(timezone=True))
    status: str = SQLField(default="confirmada", index=True, description="Estado: confirmada, asistida, no_asistida, cancelada")
    google_event_id: Optional[str] = SQLField(default=None, nullable=True, index=True)
    google_calendar_id: Optional[str] = SQLField(default=None, nullable=True, index=True)
    customer_name: Optional[str] = SQLField(default=None, nullable=True)
    customer_email: Optional[str] = SQLField(default=None, nullable=True)
    customer_phone: Optional[str] = SQLField(default=None, nullable=True)
    notes: Optional[str] = SQLField(default=None, nullable=True)
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc), sa_type=DateTime(timezone=True), nullable=False)
    updated_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc), sa_type=DateTime(timezone=True), nullable=False)

# Auto-actualiza updated_at en updates
@event.listens_for(ReservationDB, 'before_update', propagate=True)
def _set_updated_at(mapper, connection, target):  # type: ignore[override]
    try:
        target.updated_at = datetime.now(timezone.utc)
    except Exception:
        pass


@event.listens_for(StylistDB, 'before_update', propagate=True)
def _set_stylist_updated_at(mapper, connection, target):  # type: ignore[override]
    try:
        target.updated_at = datetime.now(timezone.utc)
    except Exception:
        pass


class CalendarSyncJobDB(SQLModel, table=True):
    """Trabajo encolado para sincronizar cambios con Google Calendar."""

    __tablename__ = "calendar_sync_jobs"
    id: Optional[int] = SQLField(default=None, primary_key=True)
    reservation_id: str = SQLField(index=True, nullable=False)
    action: str = SQLField(index=True, description="Acción a ejecutar: create/update/delete")
    status: str = SQLField(default="pending", index=True, description="pending, processing, completed, failed")
    payload: dict = SQLField(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
        description="Datos adicionales necesarios para procesar la acción",
    )
    attempts: int = SQLField(default=0, nullable=False)
    last_error: Optional[str] = SQLField(default=None, sa_column=Column(String, nullable=True))
    available_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        index=True,
    )
    created_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    updated_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    completed_at: Optional[datetime] = SQLField(
        default=None,
        sa_type=DateTime(timezone=True),
        nullable=True,
    )


@event.listens_for(CalendarSyncJobDB, 'before_update', propagate=True)
def _set_calendar_job_updated(mapper, connection, target):  # type: ignore[override]
    try:
        target.updated_at = datetime.now(timezone.utc)
    except Exception:
        pass
