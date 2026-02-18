compose := if command -v podman-compose >/dev/null 2>&1; then echo podman-compose; else echo docker-compose; fi

up:
    {{compose}} -f mvp/docker-compose.yaml up -d --build

down:
    {{compose}} -f mvp/docker-compose.yaml down

logs:
    {{compose}} -f mvp/docker-compose.yaml logs -f

restart:
    {{compose}} -f mvp/docker-compose.yaml down
    {{compose}} -f mvp/docker-compose.yaml up -d

