from functools import wraps
from flask import request, abort
from jose import jwt
import requests
import os

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
API_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

def get_token_auth_header():
    auth = request.headers.get("Authorization", None)
    if not auth:
        abort(401)
    parts = auth.split()
    if parts[0].lower() != "bearer" or len(parts) != 2:
        abort(401)
    return parts[1]

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_auth_header()
        jwks = requests.get(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json").json()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {k: key[k] for k in ["kty","kid","use","n","e"]}
        if not rsa_key:
            abort(401)
        try:
            payload = jwt.decode(token, rsa_key, algorithms=ALGORITHMS, audience=API_AUDIENCE, issuer=f"https://{AUTH0_DOMAIN}/")
        except Exception as e:
            abort(401, str(e))
        return f(payload, *args, **kwargs)
    return decorated
