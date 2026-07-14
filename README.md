# Realtime ChatApp

Realtime ChatApp is a full-stack real-time messaging application with a React frontend and a Django backend. It combines Fluent UI, Django REST Framework, Channels, and SQLite3 to provide a focused workspace for direct messages and group conversations.

The project includes token authentication, WebSocket delivery, reactions, replies, forwarding, deterministic demo data, Playwright E2E coverage, README screenshots, and GitHub Actions CI.

Repository: [toscani-tenekeu/Realtime_ChatApp_Django_ReactJS_SQLite3](https://github.com/toscani-tenekeu/Realtime_ChatApp_Django_ReactJS_SQLite3)

## Screenshots

![Landing page](docs/screenshots/landing-page.png)

![Chat workspace](docs/screenshots/chat-workspace.png)

![New conversation dialog](docs/screenshots/new-conversation.png)

## Project presentation

Download the editable project overview deck: [Realtime_ChatApp_Django_ReactJS_SQLite3_Project_Overview.pptx](outputs/Realtime_ChatApp_Django_ReactJS_SQLite3_Project_Overview.pptx).

## Stack

- React 19 + Vite + Fluent UI
- Django + Django REST Framework + Channels
- SQLite for local development
- Playwright for E2E coverage
- GitHub Actions for CI

## Core features

- Email or username sign-in with token-based auth
- Direct messages and group conversations
- Replies, reactions, forwarding, typing events, and read state
- One-to-one audio and video calls with WebRTC (ring, accept/decline, mute, camera toggle, and hang up)
- Voice messages recorded in the browser and sent as playable audio attachments
- Profile, password reset, blocked users, and user settings
- Deterministic demo seed for local demos and E2E runs

## Quick start

```powershell
python -m pip install -r backend/requirements.txt
npm install
npx playwright install chromium
python backend/seed_demo.py --reset
python backend/manage.py runserver 127.0.0.1:8000 --noreload
```

In a second terminal:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. The backend API is available at `http://127.0.0.1:8000/api/` and WebSockets at `ws://127.0.0.1:8000/ws/chat/`.

Set `VITE_API_URL` when the backend is hosted elsewhere. Local backend CORS now accepts both `4173` and `4174`, so the app works in normal development and Playwright E2E mode.

## Audio and video calls

Open a direct-message conversation and use the phone or camera buttons in the header. Calls use the existing authenticated Django Channels WebSocket for signaling and WebRTC for the media stream. The first version intentionally supports one-to-one calls; group-call routing is left for a future SFU-based module.

Browsers require microphone/camera permission and a secure origin (`localhost` is allowed during development). On the same LAN, host ICE candidates are often enough. For users behind NAT or when running through ngrok, configure a STUN/TURN list with `VITE_RTC_ICE_SERVERS`, for example:

```powershell
$env:VITE_RTC_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"}]'
```

The current SQLite database and in-memory Channels layer are suitable for local or single-process demos. A production deployment should use Redis for the channel layer and a TURN service for reliable media connectivity across restrictive networks.

The composer also includes a microphone button for voice messages. Grant microphone permission, stop the recording, and send it like any other attachment. Audio is stored by Django and rendered with native browser playback controls.

For LAN testing of microphone, camera, and voice recording, use an HTTPS origin. Generate a short-lived certificate with a trusted local certificate tool (or the OpenSSL certificate used by this workspace), then run Uvicorn and Vite with the certificate paths:

```powershell
$env:VITE_API_URL="https://192.168.1.168:8000/api"
$env:VITE_HTTPS_CERT="$pwd\dev-certs\lan-cert.pem"
$env:VITE_HTTPS_KEY="$pwd\dev-certs\lan-key.pem"
python -m uvicorn realtime_chatapp.asgi:application --host 0.0.0.0 --port 8000 --ssl-keyfile "$pwd\dev-certs\lan-key.pem" --ssl-certfile "$pwd\dev-certs\lan-cert.pem"
```

Open `https://192.168.1.168:4173/` and accept the local certificate warning for the frontend and backend once. Plain HTTP works for chat, but Firefox only exposes microphone/camera APIs on HTTPS or `localhost`.

### One-command LAN launcher

From the repository root, run:

```powershell
python launch_host.py --seed
```

The launcher applies migrations, optionally seeds demo data, starts the HTTPS Django/Uvicorn backend and HTTPS Vite frontend on `0.0.0.0`, detects your LAN IP, prints the URLs and PIDs, and writes service logs to `logs/host-*.log`. It automatically selects a Python installation that has Django/Uvicorn, even when Git Bash's `python` points to another version. Stop the recorded services or matching project processes on ports 8000/4173 with:

```powershell
python launch_host.py --stop
```

If another device on the LAN cannot connect, allow the two application ports through Windows Firewall from an Administrator terminal:

```powershell
python launch_host.py --firewall
```

Only TCP ports `4173` (frontend) and `8000` (backend) are opened. The remote device must use the LAN HTTPS URL, accept the local certificate, and be connected to the same non-isolated network.

## Production-like local run

This runs a production frontend build and the Django ASGI server without Vite HMR. It is useful for LAN/ngrok smoke tests; SQLite and the in-memory Channels layer are still intended for single-process demos, not a multi-instance deployment.

Terminal 1 (backend):

```powershell
$env:DJANGO_DEBUG="0"
$env:DJANGO_SECRET_KEY="replace-with-a-long-random-secret"
$env:DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,192.168.1.168"
$env:FRONTEND_URLS="http://127.0.0.1:4173,http://192.168.1.168:4173"
cd backend
python manage.py migrate --noinput
python manage.py collectstatic --noinput
daphne -b 0.0.0.0 -p 8000 realtime_chatapp.asgi:application
```

Terminal 2 (frontend):

```powershell
$env:VITE_API_URL="http://192.168.1.168:8000/api"
npm run start:prod
```

## Demo accounts

Run `python backend/seed_demo.py --reset` to recreate all demo data. The script is idempotent and also runs automatically before the E2E suite.

| User         | Email             | Username | Password         |
| ------------ | ----------------- | -------- | ---------------- |
| Toscani (admin) | `admin@example.com` | `toscani` | `admin123` |
| Ada Lovelace | `ada@example.com`   | `ada`    | `user1234` |
| Linus Wren   | `linus@example.com` | `linus`  | `user1234` |
| Mia Okafor   | `mia@example.com`   | `mia`    | `user1234` |
| Renji Sato   | `renji@example.com` | `renji`  | `user1234` |
| Priya Menon  | `priya@example.com` | `priya`  | `user1234` |
| Kai Berg     | `kai@example.com`   | `kai`    | `user1234` |

The Toscani account is the local Django administrator (`is_staff` and `is_superuser`) and can access `http://127.0.0.1:8000/admin/`. Toscani uses `admin123`; all other demo users use the shared `user1234` password.

## Test commands

```powershell
python backend/manage.py test chat -v 2
python backend/manage.py check
npm run lint
npm run build
npm run e2e
npm run e2e:screenshots
```

`npm run e2e` starts its own backend on `8001` and frontend on `4174`. `npm run e2e:screenshots` regenerates the images embedded above into `docs/screenshots/`.

## GitHub CI

The repository now includes [`.github/workflows/ci.yml`](.github/workflows/ci.yml), which runs lint, build, Django tests, and Playwright E2E on every push and pull request.

## License

This repository is distributed under the MIT license. See [LICENSE](LICENSE).
