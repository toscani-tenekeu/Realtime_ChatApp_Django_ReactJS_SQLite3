from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("auth/register/", views.register), path("auth/login/", views.login), path("auth/logout/", views.logout),
    path("auth/me/", views.me), path("auth/password/change/", views.change_password),
    path("auth/password/reset-request/", views.reset_request), path("auth/password/reset-confirm/", views.reset_confirm),
    path("settings/", views.settings_view), path("blocked/", views.blocked), path("blocked/<str:pk>/", views.blocked_user),
    path("users/", views.users), path("users/<str:pk>/", views.user_detail),
    path("conversations/", views.conversations), path("conversations/<str:pk>/", views.conversation_detail),
    path("conversations/<str:pk>/messages/", views.messages), path("conversations/<str:pk>/read/", views.read),
    path("conversations/<str:pk>/typing/", views.typing), path("conversations/<str:pk>/members/", views.members),
    path("conversations/<str:pk>/members/<str:user_id>/", views.member_detail),
    path("conversations/<str:pk>/admins/<str:user_id>/", views.admin_detail), path("conversations/<str:pk>/leave/", views.leave),
    path("conversations/<str:pk>/attachments/", views.shared_attachments),
    path("messages/<str:pk>/", views.message_detail), path("messages/<str:pk>/react/", views.react),
    path("messages/<str:pk>/forward/", views.forward), path("attachments/", views.upload), path("search/messages/", views.search),
]
