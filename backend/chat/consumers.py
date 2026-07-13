from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Conversation

class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group = f"user_{user.id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    @database_sync_to_async
    def call_target(self, conversation_id, target_user_id):
        """Return a valid target id only when both users share the conversation."""
        conversation = Conversation.objects.filter(
            pk=conversation_id,
            memberships__user_id=self.scope["user"].id,
        ).first()
        if not conversation or not conversation.memberships.filter(user_id=target_user_id).exists():
            return None
        return str(target_user_id)

    async def receive_json(self, content, **kwargs):
        if content.get("type") != "call.signal":
            return
        call_id = str(content.get("callId", ""))
        conversation_id = str(content.get("conversationId", ""))
        target_user_id = content.get("toUserId")
        signal_type = content.get("signalType")
        kind = content.get("kind", "video")
        if not call_id or not conversation_id or not target_user_id or signal_type not in {
            "ring", "offer", "answer", "ice-candidate", "accept", "reject", "hangup", "busy"
        } or kind not in {"audio", "video"}:
            return
        target = await self.call_target(conversation_id, target_user_id)
        if target is None:
            return
        await self.channel_layer.group_send(
            f"user_{target}",
            {
                "type": "call.event",
                "event": "call.signal",
                "callId": call_id,
                "conversationId": conversation_id,
                "fromUserId": str(self.scope["user"].id),
                "toUserId": target,
                "signalType": signal_type,
                "kind": kind,
                "payload": content.get("payload"),
            },
        )
    async def chat_event(self, event):
        await self.send_json({"event": event["event"], "conversationId": event.get("conversationId")})

    async def call_event(self, event):
        await self.send_json(
            {
                "event": event["event"],
                "callId": event["callId"],
                "conversationId": event["conversationId"],
                "fromUserId": event["fromUserId"],
                "toUserId": event["toUserId"],
                "signalType": event["signalType"],
                "kind": event.get("kind", "video"),
                "payload": event.get("payload"),
            }
        )
