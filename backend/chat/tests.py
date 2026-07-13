from rest_framework.test import APITestCase
from django.core import mail
from urllib.parse import urlparse, parse_qs
from .models import User

class ChatApiTests(APITestCase):
    def register(self, username, email):
        response = self.client.post("/api/auth/register/", {
            "displayName": username.title(), "username": username, "email": email,
            "password": "StrongPass!2026",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_chat_lifecycle(self):
        ada = self.register("ada", "ada@example.com")
        self.client.credentials()
        me = self.register("grace", "grace@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {me['token']}")

        response = self.client.post("/api/conversations/", {
            "kind": "dm", "memberIds": [ada["user"]["id"]],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        conversation_id = response.data["id"]

        response = self.client.post(f"/api/conversations/{conversation_id}/messages/", {
            "body": "Hello Ada", "clientId": "tmp_1", "attachmentIds": [],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        message_id = response.data["id"]

        response = self.client.post(f"/api/messages/{message_id}/react/", {"emoji": "👍"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["reactions"][0]["userIds"], [me["user"]["id"]])

        response = self.client.get(f"/api/conversations/{conversation_id}/messages/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["items"][0]["body"], "Hello Ada")

        response = self.client.patch("/api/settings/", {"theme": "dark"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["theme"], "dark")

        response = self.client.post("/api/auth/password/reset-request/", {"email": "grace@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = mail.outbox[0].body.strip().splitlines()[-1]
        token = parse_qs(urlparse(link).query)["token"][0]
        response = self.client.post("/api/auth/password/reset-confirm/", {
            "token": token, "password": "NewStrongPass!2026",
        }, format="json")
        self.assertEqual(response.status_code, 204, response.data)
