set shell := ["bash", "-o", "pipefail", "-c"]

engine := shell('''
if command -v podman >/dev/null 2>&1; then
  echo podman
elif command -v docker >/dev/null 2>&1; then
  echo docker
else
  echo "No container engine found" >&2
  exit 1
fi
''')

up:
    {{engine}}-compose -f mvp/docker-compose.yaml up -d

down:
    {{engine}}-compose -f mvp/docker-compose.yaml down

logs:
    {{engine}}-compose -f mvp/docker-compose.yaml logs -f

restart:
    {{engine}}-compose -f mvp/docker-compose.yaml down
    {{engine}}-compose -f mvp/docker-compose.yaml up -d

logs-frontend:
    {{engine}}-compose -f mvp/docker-compose.yaml logs -f frontend

run-frontend:
    {{engine}} build -t mvp_frontend "mvp/photome-frontend"
    {{engine}} run --rm -it -p 8081:8081 -p 19000:19000 -p 19001:19001 -p 19002:19002 mvp_frontend

run-backend:
    {{engine}} build -t mvp_backend "mvp/photome-backend"
    {{engine}} run --rm -it -p 8000:8000 mvp_backend
