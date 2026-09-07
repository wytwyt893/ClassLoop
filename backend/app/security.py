from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets


def hash_password(password: str) -> str:
    if len(password) < 6:
        raise ValueError("Password must contain at least 6 characters")
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=32,
    )
    return "scrypt$" + base64.urlsafe_b64encode(salt + digest).decode("ascii")


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, payload = encoded.split("$", 1)
        if scheme != "scrypt":
            return False
        raw = base64.urlsafe_b64decode(payload.encode("ascii"))
        salt, expected = raw[:16], raw[16:]
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=2**14,
            r=8,
            p=1,
            dklen=32,
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
