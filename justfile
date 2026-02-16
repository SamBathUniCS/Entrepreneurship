up:
    podman-compose -f mvp/docker-compose.yaml up -d

down:
    podman-compose -f mvp/docker-compose.yaml down

logs:
    podman-compose -f mvp/docker-compose.yaml logs -f

restart:
    podman-compose -f mvp/docker-compose.yaml down
    podman-compose -f mvp/docker-compose.yaml up -d

