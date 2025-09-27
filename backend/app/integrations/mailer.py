import os
import requests


def _get_token() -> str:
    token = os.getenv("MAILERSEND_API_TOKEN") or os.getenv("MAILSENDER_TOKEN")
    if not token:
        raise ValueError("MailerSend token not set. Define MAILERSEND_API_TOKEN or MAILSENDER_TOKEN")
    return token


def send_test_email(to_email: str, subject: str, text: str) -> dict:
    """Send a test email using MailerSend API."""
    api_token = _get_token()
    from_email = os.getenv("MAILERSEND_FROM_EMAIL") or os.getenv("MAILSENDER_FROM_EMAIL") or "noreply@pelubot.test"
    from_name = os.getenv("MAILERSEND_FROM_NAME") or os.getenv("MAILSENDER_FROM_NAME") or "Pelubot"
    url = "https://api.mailersend.com/v1/email"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    data = {
        "from": {"email": from_email, "name": from_name},
        "to": [{"email": to_email}],
        "subject": subject,
        "text": text
    }
    response = requests.post(url, json=data, headers=headers, timeout=float(os.getenv("MAILERSEND_TIMEOUT", "10")))
    try:
        body = response.json()
    except ValueError:
        body = response.text
    return {"status_code": response.status_code, "response": body}
