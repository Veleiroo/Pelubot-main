"""Pruebas de métricas Prometheus."""


def test_metrics_counts_real_status_codes(app_client):
    # Petición exitosa
    res_ok = app_client.get("/health")
    assert res_ok.status_code == 200

    # Petición que falla por falta de autenticación
    res_fail = app_client.post("/reservations", json={})
    assert res_fail.status_code == 401

    metrics_resp = app_client.get("/metrics")
    text = metrics_resp.text

    assert 'pelubot_http_requests_total{method="GET",path="/health",status="200"}' in text
    assert 'pelubot_http_requests_total{method="POST",path="/reservations",status="401"}' in text

