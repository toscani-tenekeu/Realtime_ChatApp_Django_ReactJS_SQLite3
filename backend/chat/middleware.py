from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser

@database_sync_to_async
def token_user(key):
    try:
        return Token.objects.select_related("user").get(key=key).user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware:
    def __init__(self, app): self.app = app
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        key = query.get("token", [""])[0]
        if key:
            scope["user"] = await token_user(key)
        return await self.app(scope, receive, send)

