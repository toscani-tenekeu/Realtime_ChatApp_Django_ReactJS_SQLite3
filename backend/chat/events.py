from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def notify(conversation, event="changed"):
    layer = get_channel_layer()
    for user_id in conversation.memberships.values_list("user_id", flat=True):
        async_to_sync(layer.group_send)(f"user_{user_id}", {"type": "chat.event", "event": event,
                                                                  "conversationId": conversation.id})

