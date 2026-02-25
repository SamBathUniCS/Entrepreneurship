set shell := ["bash", "-o", "pipefail", "-c"]

compose := shell('''
if command -v podman-compose >/dev/null 2>&1; then
  echo podman-compose
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  echo docker-compose
else
  echo "No compose command found" >&2
  exit 1
fi
''')

up:
    {{compose}} -f mvp/docker-compose.yaml up -d

down:
    {{compose}} -f mvp/docker-compose.yaml down

logs:
    {{compose}} -f mvp/docker-compose.yaml logs -f

restart:
    {{compose}} -f mvp/docker-compose.yaml down
    {{compose}} -f mvp/docker-compose.yaml up -d

logs-frontend:
    {{compose}} -f mvp/docker-compose.yaml logs -f frontend
