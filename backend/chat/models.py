import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

def uid(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def user_id(): return uid("u")
def conversation_id(): return uid("c")
def message_id(): return uid("m")
def attachment_id(): return uid("att")

class User(AbstractUser):
    id = models.CharField(primary_key=True, max_length=32, default=user_id, editable=False)
    display_name = models.CharField(max_length=80)
    avatar_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    presence = models.CharField(max_length=10, default="offline")
    last_seen = models.DateTimeField(null=True, blank=True)
    blocked_users = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="blocked_by")

class UserSettings(models.Model):
    user = models.OneToOneField(User, primary_key=True, on_delete=models.CASCADE, related_name="settings")
    theme = models.CharField(max_length=10, default="system")
    browser_notifications = models.BooleanField(default=False)
    sound_enabled = models.BooleanField(default=True)
    enter_to_send = models.BooleanField(default=True)
    show_read_receipts = models.BooleanField(default=True)
    show_presence = models.BooleanField(default=True)

class Conversation(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=conversation_id, editable=False)
    kind = models.CharField(max_length=8, choices=[("dm", "Direct"), ("group", "Group")])
    name = models.CharField(max_length=120, blank=True)
    avatar_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    members = models.ManyToManyField(User, through="Membership", related_name="conversations")

class Membership(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    is_admin = models.BooleanField(default=False)
    pinned = models.BooleanField(default=False)
    muted = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    last_read_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["conversation", "user"], name="unique_membership")]

class Message(models.Model):
    id = models.CharField(primary_key=True, max_length=40, default=message_id, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="messages")
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    reply_to = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    deleted = models.BooleanField(default=False)
    mentions = models.ManyToManyField(User, blank=True, related_name="mentions")

class Attachment(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=attachment_id, editable=False)
    message = models.ForeignKey(Message, null=True, blank=True, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name="uploads")
    file = models.FileField(upload_to="attachments/%Y/%m/")
    kind = models.CharField(max_length=10)
    name = models.CharField(max_length=255)
    size_bytes = models.PositiveBigIntegerField(default=0)
    mime = models.CharField(max_length=150, blank=True)

class Reaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reaction_rows")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=32)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["message", "user", "emoji"], name="unique_reaction")]
