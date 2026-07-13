from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import Conversation, Membership, Message, Reaction, User, UserSettings


DEMO_PASSWORD = "user1234"
OWNER_PASSWORD = "admin123"
USERS = [
    ("u_me", "toscani", "admin@example.com", "Toscani", "online", "Product designer. Coffee first."),
    ("u_ada", "ada", "ada@example.com", "Ada Lovelace", "online", "Notes on notes."),
    ("u_lin", "linus", "linus@example.com", "Linus Wren", "away", "Systems."),
    ("u_mia", "mia", "mia@example.com", "Mia Okafor", "offline", "Illustration & type."),
    ("u_ren", "renji", "renji@example.com", "Renji Sato", "online", "Weekend runner."),
    ("u_pri", "priya", "priya@example.com", "Priya Menon", "away", ""),
    ("u_kai", "kai", "kai@example.com", "Kai Berg", "offline", ""),
]

CONVERSATIONS = [
    ("c_ada", "dm", "", ["u_me", "u_ada"], []),
    (
        "c_design",
        "group",
        "Design Guild",
        ["u_me", "u_ada", "u_mia", "u_pri", "u_ren"],
        ["u_me", "u_ada"],
    ),
    ("c_lin", "dm", "", ["u_me", "u_lin"], []),
    ("c_run", "group", "Sunday Run Club", ["u_me", "u_ren", "u_kai", "u_pri"], ["u_ren"]),
    ("c_mia", "dm", "", ["u_me", "u_mia"], []),
]

MESSAGES = [
    ("m1", "c_ada", "u_ada", "Hey! Did you get a chance to look at the new onboarding flow?", 1440),
    ("m2", "c_ada", "u_me", "Yes - the empty state is much sharper now.", 1380),
    ("m3", "c_ada", "u_ada", "Great. I'll ship it to staging tonight.", 1320),
    ("m4", "c_ada", "u_ada", "Also: coffee tomorrow?", 12),
    ("m5", "c_ada", "u_ada", "The place on 4th, 9:30?", 10),
    ("m10", "c_design", "u_mia", "New icon set is up in Figma.", 240),
    ("m11", "c_design", "u_pri", "Loving the density change.", 235),
    ("m12", "c_design", "u_me", "Same. Approved from me.", 225),
    ("m13", "c_design", "u_ada", "Let's ship Friday.", 180),
    ("m20", "c_lin", "u_me", "Deploy blocked again?", 1560),
    ("m21", "c_lin", "u_lin", "Yeah - flaky test. Fix incoming.", 1500),
    ("m30", "c_run", "u_ren", "6am Sunday. Loop through the park.", 480),
    ("m31", "c_run", "u_kai", "In.", 450),
    ("m32", "c_run", "u_pri", "I'll bring water.", 420),
    ("m33", "c_run", "u_ren", "Route pinned above.", 360),
    ("m34", "c_run", "u_ren", "See everyone at the gate.", 60),
    ("m40", "c_mia", "u_mia", "Sent you the type specimen.", 720),
    ("m41", "c_mia", "u_me", "Thanks!", 660),
]


class Command(BaseCommand):
    help = "Create or refresh deterministic Realtime ChatApp demo users, conversations and messages."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete the existing demo records first.")

    def handle(self, *args, **options):
        demo_user_ids = [row[0] for row in USERS]
        demo_conversation_ids = [row[0] for row in CONVERSATIONS]
        if options["reset"]:
            Conversation.objects.filter(id__in=demo_conversation_ids).delete()
            User.objects.filter(id__in=demo_user_ids).delete()

        users = {}
        for user_id, username, email, display_name, presence, bio in USERS:
            user, _ = User.objects.update_or_create(
                id=user_id,
                defaults={
                    "username": username,
                    "email": email,
                    "display_name": display_name,
                    "first_name": "Toscani" if user_id == "u_me" else "",
                    "last_name": "TENEKEU" if user_id == "u_me" else "",
                    "presence": presence,
                    "bio": bio,
                    "last_seen": timezone.now() if presence == "offline" else None,
                    "is_active": True,
                    "is_staff": user_id == "u_me",
                    "is_superuser": user_id == "u_me",
                },
            )
            user.set_password(OWNER_PASSWORD if user_id == "u_me" else DEMO_PASSWORD)
            user.save(update_fields=["password"])
            UserSettings.objects.get_or_create(user=user)
            users[user_id] = user

        conversations = {}
        for conversation_id, kind, name, member_ids, admin_ids in CONVERSATIONS:
            conversation, _ = Conversation.objects.update_or_create(
                id=conversation_id,
                defaults={"kind": kind, "name": name},
            )
            Membership.objects.filter(conversation=conversation).exclude(user_id__in=member_ids).delete()
            for member_id in member_ids:
                Membership.objects.update_or_create(
                    conversation=conversation,
                    user=users[member_id],
                    defaults={
                        "is_admin": member_id in admin_ids,
                        "pinned": member_id == "u_me" and conversation_id in {"c_ada", "c_design"},
                        "muted": member_id == "u_me" and conversation_id == "c_lin",
                        "archived": False,
                        "last_read_at": timezone.now() - timedelta(minutes=30),
                    },
                )
            conversations[conversation_id] = conversation

        for message_id, conversation_id, author_id, body, minutes_ago in MESSAGES:
            message, created = Message.objects.update_or_create(
                id=message_id,
                defaults={
                    "conversation": conversations[conversation_id],
                    "author": users[author_id],
                    "body": body,
                    "deleted": False,
                },
            )
            if created:
                Message.objects.filter(pk=message.pk).update(
                    created_at=timezone.now() - timedelta(minutes=minutes_ago)
                )

        Reaction.objects.get_or_create(message_id="m13", user=users["u_me"], emoji="\U0001F44D")
        Reaction.objects.get_or_create(message_id="m13", user=users["u_mia"], emoji="\U0001F44D")
        Reaction.objects.get_or_create(message_id="m34", user=users["u_pri"], emoji="\U0001F525")

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo database ready: {len(USERS)} users, {len(CONVERSATIONS)} conversations, "
                f"{len(MESSAGES)} messages. Toscani password: {OWNER_PASSWORD}; "
                f"other demo users: {DEMO_PASSWORD}"
            )
        )
