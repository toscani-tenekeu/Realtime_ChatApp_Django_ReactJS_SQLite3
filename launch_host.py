"""Launch the Realtime ChatApp on the local network.

Run from the repository root:

    python launch_host.py

The script starts the Django ASGI backend and the Vite frontend with HTTPS,
binds both services to 0.0.0.0, writes their logs to ``logs/``, and prints all
URLs, process IDs, and demo credentials. Use ``python launch_host.py --stop``
to stop the processes started by this script.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import ssl
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
CERT_DIR = ROOT / "dev-certs"
LOG_DIR = ROOT / "logs"
PID_FILE = LOG_DIR / "host-pids.json"
FRONTEND_PORT = 4173
BACKEND_PORT = 8000


def local_ip() -> str:
    """Return the LAN address used for outbound connections."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def ensure_certificates() -> tuple[Path, Path]:
    cert = CERT_DIR / "lan-cert.pem"
    key = CERT_DIR / "lan-key.pem"
    if cert.exists() and key.exists():
        return cert, key
    raise SystemExit(
        "HTTPS certificates are missing. Expected:\n"
        f"  {cert}\n  {key}\n"
        "Generate them with the project's certificate instructions in README.md, "
        "then run this script again."
    )


def command_name() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def base_environment(ip: str, cert: Path, key: Path) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "DJANGO_DEBUG": "1",
            "DJANGO_SECRET_KEY": env.get("DJANGO_SECRET_KEY", "dev-only-change-me"),
            "DJANGO_ALLOWED_HOSTS": f"localhost,127.0.0.1,{ip}",
            "FRONTEND_URLS": f"https://localhost:{FRONTEND_PORT},https://127.0.0.1:{FRONTEND_PORT},https://{ip}:{FRONTEND_PORT}",
            "FRONTEND_URL": f"https://{ip}:{FRONTEND_PORT}",
            "VITE_API_URL": f"https://{ip}:{BACKEND_PORT}/api",
            "VITE_HTTPS_CERT": str(cert),
            "VITE_HTTPS_KEY": str(key),
            "VITE_RTC_ICE_SERVERS": env.get(
                "VITE_RTC_ICE_SERVERS", '[{"urls":"stun:stun.l.google.com:19302"}]'
            ),
            "PYTHONUNBUFFERED": "1",
        }
    )
    return env


def start_process(name: str, args: list[str], cwd: Path, env: dict[str, str]) -> subprocess.Popen:
    LOG_DIR.mkdir(exist_ok=True)
    stdout = (LOG_DIR / f"host-{name}.out.log").open("a", encoding="utf-8")
    stderr = (LOG_DIR / f"host-{name}.err.log").open("a", encoding="utf-8")
    kwargs: dict[str, object] = {
        "cwd": cwd,
        "env": env,
        "stdout": stdout,
        "stderr": stderr,
    }
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    else:
        kwargs["start_new_session"] = True
    process = subprocess.Popen(args, **kwargs)
    stdout.close()
    stderr.close()
    return process


def wait_for_url(url: str, *, seconds: float = 20) -> bool:
    context = ssl._create_unverified_context() if url.startswith("https://") else None
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            request = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(request, timeout=1.5, context=context) as response:
                if 200 <= response.status < 500:
                    return True
        except (OSError, urllib.error.URLError):
            time.sleep(0.4)
    return False


def stop_started() -> None:
    if not PID_FILE.exists():
        print("No launch_host.py PID file was found.")
        return
    try:
        pids = json.loads(PID_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        pids = {}
    for name, pid in pids.items():
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/PID", str(int(pid)), "/T", "/F"],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                os.kill(int(pid), signal.SIGTERM)
            print(f"Stopped {name} (PID {pid})")
        except (ProcessLookupError, ValueError):
            print(f"{name} (PID {pid}) was already stopped")
        except PermissionError:
            print(f"Could not stop {name} (PID {pid}); stop it manually")
    PID_FILE.unlink(missing_ok=True)


def prepare_database(env: dict[str, str], *, seed: bool) -> None:
    print("Applying Django migrations...")
    result = subprocess.run(
        [sys.executable, "manage.py", "migrate", "--noinput"],
        cwd=BACKEND,
        env=env,
        check=False,
    )
    if result.returncode:
        raise SystemExit("Django migrations failed. Check the backend dependencies and settings.")
    if seed:
        print("Seeding demo users and conversations...")
        result = subprocess.run(
            [sys.executable, "manage.py", "seed_demo"],
            cwd=BACKEND,
            env=env,
            check=False,
        )
        if result.returncode:
            raise SystemExit("Demo data seeding failed.")


def launch(*, seed: bool) -> None:
    ip = local_ip()
    cert, key = ensure_certificates()
    for port, name in ((BACKEND_PORT, "backend"), (FRONTEND_PORT, "frontend")):
        if port_open(port):
            raise SystemExit(
                f"Port {port} is already in use ({name}). Stop the existing service first "
                "or run `python launch_host.py --stop` if it was started by this script."
            )

    env = base_environment(ip, cert, key)
    prepare_database(env, seed=seed)
    python = sys.executable
    npm = command_name()
    backend = start_process(
        "backend",
        [
            python,
            "-m",
            "uvicorn",
            "realtime_chatapp.asgi:application",
            "--host",
            "0.0.0.0",
            "--port",
            str(BACKEND_PORT),
            "--ssl-keyfile",
            str(key),
            "--ssl-certfile",
            str(cert),
        ],
        BACKEND,
        env,
    )
    frontend = start_process(
        "frontend",
        [npm, "run", "dev", "--", "--host", "0.0.0.0", "--port", str(FRONTEND_PORT)],
        ROOT,
        env,
    )
    LOG_DIR.mkdir(exist_ok=True)
    PID_FILE.write_text(
        json.dumps({"backend": backend.pid, "frontend": frontend.pid}, indent=2),
        encoding="utf-8",
    )

    backend_ready = wait_for_url(f"https://{ip}:{BACKEND_PORT}/api/health/")
    frontend_ready = wait_for_url(f"https://{ip}:{FRONTEND_PORT}/")
    print("\nRealtime ChatApp host started")
    print(f"  Backend PID : {backend.pid} ({'ready' if backend_ready else 'starting'})")
    print(f"  Frontend PID: {frontend.pid} ({'ready' if frontend_ready else 'starting'})")
    print("\nURLs")
    print(f"  Frontend LAN: https://{ip}:{FRONTEND_PORT}/")
    print(f"  Frontend local: https://localhost:{FRONTEND_PORT}/")
    print(f"  API health: https://{ip}:{BACKEND_PORT}/api/health/")
    print(f"  WebSocket: wss://{ip}:{BACKEND_PORT}/ws/chat/?token=<token>")
    print("\nBefore using camera or microphone, open both HTTPS URLs once and accept the certificate warning.")
    print("\nDemo accounts")
    print("  Toscani: admin@example.com / admin123")
    print("  Other seeded users: <username>@example.com / user1234")
    print("\nLogs")
    print(f"  Backend: {LOG_DIR / 'host-backend.out.log'}")
    print(f"  Frontend: {LOG_DIR / 'host-frontend.out.log'}")
    print(f"\nStop later with: python {Path(__file__).name} --stop")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stop", action="store_true", help="stop the services started by this script")
    parser.add_argument("--seed", action="store_true", help="create or refresh the demo users and conversations")
    args = parser.parse_args()
    if args.stop:
        stop_started()
    else:
        launch(seed=args.seed)


if __name__ == "__main__":
    main()
