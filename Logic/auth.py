# Logic/auth.py

import os
import requests
from authlib.integrations.flask_oauth2 import ResourceProtector
from authlib.oauth2.rfc7523 import JWTBearerTokenValidator
from authlib.jose.jwk import JsonWebKey

class Auth0JWTBearerTokenValidator(JWTBearerTokenValidator):
    def __init__(self, domain, audience):
        issuer = f"https://{domain}/"
        jwks_url = f"{issuer}.well-known/jwks.json"
        
        try:
            jwks = requests.get(jwks_url).json()
            public_key = JsonWebKey.import_key_set(jwks)
        except Exception as e:
            print(f"Failed to load public key from {jwks_url}: {e}")
            public_key = None
            
        super(Auth0JWTBearerTokenValidator, self).__init__(public_key)
        self.claims_options = {
            "exp": {"essential": True},
            "aud": {"essential": True, "value": audience},
            "iss": {"essential": True, "value": issuer},
        }