"""Servicios de notificación (correo, etc.)."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import requests

from app.data import SERVICE_BY_ID, PRO_BY_ID
from app.models import Reservation
from app.utils.date import TZ

logger = logging.getLogger("pelubot.notifications")

MAILERSEND_TOKEN = os.getenv("MAILERSEND_API_TOKEN") or os.getenv("MAILSENDER_TOKEN")
MAILERSEND_FROM_EMAIL = os.getenv("MAILERSEND_FROM_EMAIL") or os.getenv("MAILSENDER_FROM_EMAIL")
MAILERSEND_FROM_NAME = os.getenv("MAILERSEND_FROM_NAME") or os.getenv("MAILSENDER_FROM_NAME", "Pelubot")
MAILERSEND_TIMEOUT = float(os.getenv("MAILERSEND_TIMEOUT", "10"))
MAILERSEND_API_URL = "https://api.mailersend.com/v1/email"


def _is_configured() -> bool:
    return bool(MAILERSEND_TOKEN and MAILERSEND_FROM_EMAIL)


def send_reservation_email(reservation: Reservation, manage_url: Optional[str]) -> None:
    """Envía un correo con el enlace de gestión de reserva.

    Sin configuración o sin email del cliente, registra en logs y finaliza.
    """
    if not reservation.customer_email:
        logger.info("Reserva %s sin email; omitiendo notificación", reservation.id)
        return

    service = SERVICE_BY_ID.get(reservation.service_id)
    professional = PRO_BY_ID.get(reservation.professional_id)
    service_name = service.name if service else reservation.service_id
    professional_name = professional.name if professional else reservation.professional_id

    manage_link = manage_url or ""

    subject = f"Tu cita de {service_name}"
    text_body = (
        f"Hola {reservation.customer_name},\n\n"
        f"Tienes una cita de {service_name} con {professional_name} el {reservation.start.astimezone(TZ):%d/%m/%Y a las %H:%M}.\n"
        "Si necesitas cambiarla o cancelarla, utiliza este enlace:\n"
        f"{manage_link}\n\n"
        "Gracias por confiar en nosotros."
    )

    if not _is_configured():
        logger.info(
            "MailerSend no configurado. Mensaje a %s: %s",
            reservation.customer_email,
            text_body,
        )
        return

    payload = {
        "from": {"email": MAILERSEND_FROM_EMAIL, "name": MAILERSEND_FROM_NAME},
        "to": [{"email": reservation.customer_email, "name": reservation.customer_name}],
        "subject": subject,
        "text": text_body,
    }

    headers = {
        "Authorization": f"Bearer {MAILERSEND_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            MAILERSEND_API_URL,
            headers=headers,
            json=payload,
            timeout=MAILERSEND_TIMEOUT,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"MailerSend error {response.status_code}: {response.text}"
            )
        logger.info(
            "Email enviado a %s para la reserva %s", reservation.customer_email, reservation.id
        )
    except Exception as exc:
        logger.warning(
            "No se pudo enviar email para reserva %s: %s | payload=%s",
            reservation.id,
            exc,
            json.dumps(payload, ensure_ascii=False),
        )
