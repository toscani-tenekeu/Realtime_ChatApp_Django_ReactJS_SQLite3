from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .events import notify
from .models import Attachment, Conversation, Membership, Message, Reaction, User, UserSettings
from .presenters import attachment_data, conversation_data, message_data, user_data

def error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": message}, status=code)

def member_conversation(user, pk):
    return Conversation.objects.prefetch_related("memberships", "messages__attachments", "messages__reaction_rows", "messages__mentions").filter(pk=pk, memberships__user=user).first()

@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        "name": "Realtime ChatApp API",
        "status": "ok",
        "health": request.build_absolute_uri("/api/health/"),
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    required = ["displayName", "username", "email", "password"]
    if any(not data.get(key) for key in required): return error("All fields are required.")
    if User.objects.filter(Q(username__iexact=data["username"]) | Q(email__iexact=data["email"])).exists():
        return error("Username or email is already in use.")
    try: validate_password(data["password"])
    except Exception as exc: return error(" ".join(exc.messages))
    user = User.objects.create_user(username=data["username"], email=data["email"], password=data["password"],
                                    display_name=data["displayName"], presence="online")
    UserSettings.objects.create(user=user)
    token = Token.objects.create(user=user)
    return Response({"user": user_data(user), "token": token.key}, status=201)

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    identifier = request.data.get("identifier", "")
    found = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).first()
    user = authenticate(username=found.username if found else identifier, password=request.data.get("password", ""))
    if not user: return error("Incorrect email or password.", status.HTTP_401_UNAUTHORIZED)
    user.presence = "online"; user.save(update_fields=["presence"])
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"user": user_data(user), "token": token.key})

@api_view(["POST"])
def logout(request):
    request.auth.delete(); request.user.presence = "offline"; request.user.last_seen = timezone.now()
    request.user.save(update_fields=["presence", "last_seen"])
    return Response(status=204)

@api_view(["GET", "PATCH", "DELETE"])
def me(request):
    user = request.user
    if request.method == "GET": return Response(user_data(user))
    if request.method == "DELETE":
        if not user.check_password(request.data.get("password", "")): return error("Password is incorrect.")
        user.delete(); return Response(status=204)
    fields = {"displayName": "display_name", "username": "username", "bio": "bio", "avatarUrl": "avatar_url"}
    for source, target in fields.items():
        if source in request.data: setattr(user, target, request.data[source])
    try: user.full_clean(exclude=["password"]); user.save()
    except Exception as exc: return error(str(exc))
    return Response(user_data(user))

@api_view(["POST"])
def change_password(request):
    user = request.user
    if not user.check_password(request.data.get("current", "")): return error("Current password is incorrect.")
    try: validate_password(request.data.get("next", ""), user)
    except Exception as exc: return error(" ".join(exc.messages))
    user.set_password(request.data["next"]); user.save(); return Response(status=204)

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_request(request):
    user = User.objects.filter(email__iexact=request.data.get("email", "")).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?token={uid}:{token}"
        send_mail("Reset your Pulse password", f"Use this link to reset your password:\n\n{link}",
                  settings.DEFAULT_FROM_EMAIL, [user.email])
    return Response({"detail": "If that account exists, reset instructions have been prepared."})

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_confirm(request):
    try:
        uid, token = request.data.get("token", "").split(":", 1)
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (ValueError, User.DoesNotExist):
        return error("The reset link is invalid or expired.")
    if not default_token_generator.check_token(user, token): return error("The reset link is invalid or expired.")
    try: validate_password(request.data.get("password", ""), user)
    except Exception as exc: return error(" ".join(exc.messages))
    user.set_password(request.data["password"]); user.save(update_fields=["password"])
    Token.objects.filter(user=user).delete()
    return Response(status=204)

def settings_data(item):
    return {"theme": item.theme, "browserNotifications": item.browser_notifications,
            "soundEnabled": item.sound_enabled, "enterToSend": item.enter_to_send,
            "showReadReceipts": item.show_read_receipts, "showPresence": item.show_presence}

@api_view(["GET", "PATCH"])
def settings_view(request):
    item, _ = UserSettings.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        fields = {"theme":"theme", "browserNotifications":"browser_notifications", "soundEnabled":"sound_enabled",
                  "enterToSend":"enter_to_send", "showReadReceipts":"show_read_receipts", "showPresence":"show_presence"}
        for source, target in fields.items():
            if source in request.data: setattr(item, target, request.data[source])
        item.save()
    return Response(settings_data(item))

@api_view(["GET"])
def blocked(request): return Response([user_data(u) for u in request.user.blocked_users.all()])

@api_view(["POST", "DELETE"])
def blocked_user(request, pk):
    other = User.objects.filter(pk=pk).first()
    if not other: return error("User not found.", 404)
    (request.user.blocked_users.add if request.method == "POST" else request.user.blocked_users.remove)(other)
    return Response(status=204)

@api_view(["GET"])
def users(request):
    q = request.query_params.get("q", "").strip()
    qs = User.objects.exclude(pk=request.user.pk)
    if q: qs = qs.filter(Q(username__icontains=q) | Q(display_name__icontains=q))
    return Response([user_data(u) for u in qs[:30]])

@api_view(["GET"])
def user_detail(request, pk):
    user = User.objects.filter(pk=pk).first()
    return Response(user_data(user)) if user else error("User not found.", 404)

@api_view(["GET", "POST"])
def conversations(request):
    if request.method == "GET":
        qs = Conversation.objects.filter(memberships__user=request.user).prefetch_related(
            "memberships", "messages__attachments", "messages__reaction_rows", "messages__mentions")
        items = [conversation_data(c, request.user, request) for c in qs]
        items.sort(key=lambda c: (not c["pinned"], -(timezone.datetime.fromisoformat(c["lastMessage"]["createdAt"].replace("Z", "+00:00")).timestamp() if c["lastMessage"] else 0)))
        return Response(items)
    data = request.data; kind = data.get("kind")
    ids = list(dict.fromkeys([request.user.id, *data.get("memberIds", [])]))
    if kind not in ("dm", "group") or (kind == "dm" and len(ids) != 2): return error("Invalid conversation members.")
    members = list(User.objects.filter(id__in=ids))
    if len(members) != len(ids): return error("One or more users were not found.")
    if kind == "dm":
        existing = Conversation.objects.filter(kind="dm", memberships__user=request.user)
        for item in existing:
            if set(item.members.values_list("id", flat=True)) == set(ids):
                item = member_conversation(request.user, item.id)
                return Response(conversation_data(item, request.user, request))
    with transaction.atomic():
        item = Conversation.objects.create(kind=kind, name=data.get("name", ""), avatar_url=data.get("avatarUrl", ""))
        for user in members: Membership.objects.create(conversation=item, user=user, is_admin=kind == "group" and user == request.user)
    item = member_conversation(request.user, item.id); notify(item, "conversation.created")
    return Response(conversation_data(item, request.user, request), status=201)

@api_view(["GET", "PATCH", "DELETE"])
def conversation_detail(request, pk):
    item = member_conversation(request.user, pk)
    if not item: return error("Conversation not found.", 404)
    membership = next(m for m in item.memberships.all() if m.user_id == request.user.id)
    if request.method == "DELETE":
        if item.kind == "group" and not membership.is_admin: return error("Only an admin can delete this group.", 403)
        item.delete(); return Response(status=204)
    if request.method == "PATCH":
        if any(k in request.data for k in ("name", "description", "avatarUrl")):
            if item.kind != "group" or not membership.is_admin: return error("Only group admins can edit details.", 403)
            for source, target in {"name":"name", "description":"description", "avatarUrl":"avatar_url"}.items():
                if source in request.data: setattr(item, target, request.data[source])
            item.save()
        for source, target in {"pinned":"pinned", "muted":"muted", "archived":"archived"}.items():
            if source in request.data: setattr(membership, target, request.data[source])
        membership.save(); notify(item)
    return Response(conversation_data(item, request.user, request))

@api_view(["GET", "POST"])
def messages(request, pk):
    conversation = member_conversation(request.user, pk)
    if not conversation: return error("Conversation not found.", 404)
    if request.method == "GET":
        limit = min(int(request.query_params.get("limit", 30)), 100)
        qs = Message.objects.filter(conversation=conversation).prefetch_related("attachments", "reaction_rows", "mentions").order_by("-created_at")
        before = request.query_params.get("before")
        if before:
            cursor = Message.objects.filter(pk=before, conversation=conversation).first()
            if cursor: qs = qs.filter(created_at__lt=cursor.created_at)
        rows = list(qs[:limit + 1]); has_more = len(rows) > limit; rows = list(reversed(rows[:limit]))
        return Response({"items": [message_data(m, request) for m in rows], "hasMore": has_more,
                         "nextCursor": rows[0].id if rows else None})
    data = request.data
    if not data.get("body", "").strip() and not data.get("attachmentIds"): return error("Message cannot be empty.")
    reply = Message.objects.filter(pk=data.get("replyToId"), conversation=conversation).first() if data.get("replyToId") else None
    message = Message.objects.create(conversation=conversation, author=request.user, body=data.get("body", "").strip(), reply_to=reply)
    Attachment.objects.filter(id__in=data.get("attachmentIds", []), uploaded_by=request.user, message__isnull=True).update(message=message)
    message = Message.objects.prefetch_related("attachments", "reaction_rows", "mentions").get(pk=message.pk)
    notify(conversation, "message.created")
    return Response(message_data(message, request), status=201)

@api_view(["PATCH", "DELETE"])
def message_detail(request, pk):
    message = Message.objects.select_related("conversation").filter(pk=pk, author=request.user).first()
    if not message: return error("Message not found.", 404)
    if request.method == "DELETE":
        message.deleted=True; message.body=""; message.attachments.all().delete(); message.save(); notify(message.conversation, "message.deleted")
        return Response(status=204)
    message.body=request.data.get("body", "").strip(); message.edited_at=timezone.now(); message.save(); notify(message.conversation, "message.updated")
    return Response(message_data(Message.objects.prefetch_related("attachments", "reaction_rows", "mentions").get(pk=pk), request))

@api_view(["POST"])
def react(request, pk):
    message = Message.objects.select_related("conversation").filter(pk=pk, conversation__memberships__user=request.user).first()
    if not message: return error("Message not found.", 404)
    emoji=request.data.get("emoji", "")
    row, created=Reaction.objects.get_or_create(message=message, user=request.user, emoji=emoji)
    if not created: row.delete()
    notify(message.conversation, "message.reaction")
    message = Message.objects.prefetch_related("attachments", "reaction_rows", "mentions").get(pk=pk)
    return Response(message_data(message, request))

@api_view(["POST"])
def read(request, pk):
    membership=Membership.objects.filter(conversation_id=pk, user=request.user).first()
    if not membership: return error("Conversation not found.", 404)
    membership.last_read_at=timezone.now(); membership.save(update_fields=["last_read_at"]); return Response(status=204)

@api_view(["POST"])
def typing(request, pk):
    conversation=member_conversation(request.user, pk)
    if not conversation: return error("Conversation not found.", 404)
    notify(conversation, "typing"); return Response(status=204)

@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload(request):
    file=request.FILES.get("file")
    if not file: return error("Choose a file.")
    item=Attachment.objects.create(file=file, uploaded_by=request.user, kind="image" if file.content_type.startswith("image/") else "document",
                                   name=file.name, size_bytes=file.size, mime=file.content_type)
    return Response(attachment_data(item, request), status=201)

@api_view(["GET"])
def search(request):
    q=request.query_params.get("q", "").strip()
    if not q: return Response([])
    qs=Message.objects.filter(conversation__memberships__user=request.user, body__icontains=q, deleted=False).prefetch_related("attachments", "reaction_rows", "mentions").order_by("-created_at")[:40]
    return Response([{"conversationId": m.conversation_id, "message": message_data(m, request)} for m in qs])

@api_view(["POST"])
def forward(request, pk):
    source=Message.objects.filter(pk=pk, conversation__memberships__user=request.user).first()
    if not source: return error("Message not found.", 404)
    for cid in request.data.get("conversationIds", []):
        conversation=member_conversation(request.user, cid)
        if conversation:
            Message.objects.create(conversation=conversation, author=request.user, body=source.body)
            notify(conversation, "message.created")
    return Response(status=204)

def require_admin(user, conversation):
    return Membership.objects.filter(user=user, conversation=conversation, is_admin=True).exists()

@api_view(["POST"])
def members(request, pk):
    conversation=member_conversation(request.user, pk)
    if not conversation or not require_admin(request.user, conversation): return error("Admin permission required.", 403)
    for user in User.objects.filter(id__in=request.data.get("memberIds", [])): Membership.objects.get_or_create(conversation=conversation, user=user)
    conversation=member_conversation(request.user, pk); notify(conversation); return Response(conversation_data(conversation, request.user, request))

@api_view(["DELETE"])
def member_detail(request, pk, user_id):
    conversation=member_conversation(request.user, pk)
    if not conversation or not require_admin(request.user, conversation): return error("Admin permission required.", 403)
    Membership.objects.filter(conversation=conversation, user_id=user_id).delete(); notify(conversation)
    return Response(conversation_data(member_conversation(request.user, pk), request.user, request))

@api_view(["POST", "DELETE"])
def admin_detail(request, pk, user_id):
    conversation=member_conversation(request.user, pk)
    if not conversation or not require_admin(request.user, conversation): return error("Admin permission required.", 403)
    membership=Membership.objects.filter(conversation=conversation, user_id=user_id).first()
    if not membership: return error("Member not found.", 404)
    membership.is_admin=request.method == "POST"; membership.save(); notify(conversation)
    return Response(conversation_data(member_conversation(request.user, pk), request.user, request))

@api_view(["POST"])
def leave(request, pk):
    Membership.objects.filter(conversation_id=pk, user=request.user).delete(); return Response(status=204)

@api_view(["GET"])
def shared_attachments(request, pk):
    conversation=member_conversation(request.user, pk)
    if not conversation: return error("Conversation not found.", 404)
    return Response([attachment_data(a, request) for a in Attachment.objects.filter(message__conversation=conversation, message__deleted=False)])
