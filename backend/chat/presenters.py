from django.db.models import Count, Q
from django.utils import timezone

def iso(value):
    return value.isoformat().replace("+00:00", "Z") if value else None

def user_data(user):
    return {
        "id": user.id, "username": user.username, "displayName": user.display_name,
        "email": user.email, "avatarUrl": user.avatar_url or None, "bio": user.bio or None,
        "presence": user.presence, "lastSeen": iso(user.last_seen),
    }

def attachment_data(item, request=None):
    url = item.file.url if item.file else ""
    if request and url:
        url = request.build_absolute_uri(url)
    return {"id": item.id, "kind": item.kind, "name": item.name, "url": url,
            "sizeBytes": item.size_bytes, "mime": item.mime}

def message_data(message, request=None):
    grouped = {}
    for row in message.reaction_rows.all():
        grouped.setdefault(row.emoji, []).append(row.user_id)
    return {
        "id": message.id, "conversationId": message.conversation_id,
        "authorId": message.author_id or "", "body": message.body,
        "createdAt": iso(message.created_at), "editedAt": iso(message.edited_at),
        "replyToId": message.reply_to_id,
        "attachments": [attachment_data(a, request) for a in message.attachments.all()],
        "reactions": [{"emoji": emoji, "userIds": ids} for emoji, ids in grouped.items()],
        "status": "read", "deleted": message.deleted,
        "mentions": list(message.mentions.values_list("id", flat=True)),
    }

def conversation_data(conversation, user, request=None):
    membership = next((m for m in conversation.memberships.all() if m.user_id == user.id), None)
    last = conversation.messages.order_by("-created_at").first()
    unread = 0
    if membership:
        unread = conversation.messages.filter(deleted=False).exclude(author=user).filter(
            created_at__gt=membership.last_read_at or conversation.created_at).count()
    return {
        "id": conversation.id, "kind": conversation.kind, "name": conversation.name or None,
        "avatarUrl": conversation.avatar_url or None, "description": conversation.description or None,
        "memberIds": [m.user_id for m in conversation.memberships.all()],
        "adminIds": [m.user_id for m in conversation.memberships.all() if m.is_admin],
        "createdAt": iso(conversation.created_at),
        "lastMessage": message_data(last, request) if last else None,
        "unreadCount": unread, "pinned": membership.pinned if membership else False,
        "muted": membership.muted if membership else False,
        "archived": membership.archived if membership else False, "typingUserIds": [],
    }

