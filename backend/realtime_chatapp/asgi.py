import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "realtime_chatapp.settings")

# Initialize Django before importing middleware that references ORM models.
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.middleware import TokenAuthMiddleware
from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware(AuthMiddlewareStack(URLRouter(websocket_urlpatterns))),
})
