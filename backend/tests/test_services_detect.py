"""Tests de heurísticas y catálogo relacionados con servicios."""

import pytest

from app.services.logic import _detect_service_from_summary


@pytest.mark.parametrize(
    ("summary", "expected"),
    [
        ("Corte + Barba Premium", "corte_barba"),
        ("Corte jubilado José", "corte_jubilado"),
        ("Arreglo de barba urgente", "arreglo_barba"),
        ("Corte caballero clásico", "corte_cabello"),
        ("Servicio sin keywords", "corte_cabello"),  # fallback
    ],
)
def test_detect_service_from_summary(summary: str, expected: str):
    assert _detect_service_from_summary(summary, "corte_cabello") == expected

