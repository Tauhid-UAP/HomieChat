from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path('join_chat_view/<str:room_code>/', consumers.ChatConsumer.as_asgi()),
]
