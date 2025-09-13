import requests
from authlib.jose import jwt, JsonWebKey
from authlib.oauth2.rfc6750 import BearerTokenValidator

class Auth0JWTBearerTokenValidator(BearerTokenValidator):
    def __init__(self, domain: str, audience: str):
        super(Auth0JWTBearerTokenValidator, self).__init__()
        self.issuer = f"https://{domain}/"
        self.audience = audience
        self.jwks_url = f"https://{domain}/.well-known/jwks.json"
        self._key_cache = {}

    def fetch_jwks(self):
        """Fetches and caches the JSON Web Key Set from Auth0."""
        # Use a simple cache to avoid fetching keys on every request
        if not self._key_cache:
            jwks = requests.get(self.jwks_url).json()
            for key in jwks['keys']:
                self._key_cache[key['kid']] = key
        return self._key_cache

    def authenticate_token(self, token_string: str):
        """
        Validates the token against Auth0's public keys.
        This method is required by the parent BearerTokenValidator class.
        """
        try:
            # Get the unverified header to find the Key ID (kid)
            header = jwt.get_unverified_header(token_string)
            kid = header.get('kid')
            if not kid:
                return None # Token is malformed

            # Fetch the JWKS and find the correct public key
            jwks = self.fetch_jwks()
            public_key_data = jwks.get(kid)
            if not public_key_data:
                # If the key is not found, it might be outdated. Clear cache and retry once.
                self._key_cache = {}
                jwks = self.fetch_jwks()
                public_key_data = jwks.get(kid)
                if not public_key_data:
                    return None # Key still not found

            # Construct the key from the JWKS data
            public_key = JsonWebKey.import_key(public_key_data)

            # Define the claims options for validation
            claims_options = {
                "exp": {"essential": True},
                "aud": {"essential": True, "value": self.audience},
                "iss": {"essential": True, "value": self.issuer},
            }
            
            # Decode and validate the token's claims
            claims = jwt.decode(
                token_string,
                public_key,
                claims_options=claims_options,
            )
            claims.validate()
            return claims
        except Exception as e:
            print(f"Token validation error: {e}")
            return None
