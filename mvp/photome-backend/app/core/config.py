from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PhotoMe"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Auth
    SECRET_KEY: str = "replace_this_with_a_real_secret_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Database
    DATABASE_URL: str = "postgresql://myuser:mypassword@postgres:5432/mydb"

    # MinIO / S3
    S3_ENDPOINT_URL: str = "http://minio:9000"      # internal Docker hostname
    S3_PUBLIC_URL: str = "http://localhost:9000"     # browser-accessible URL for presigned links
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "photome"
    S3_REGION: str = "us-east-1"

    # DeepFace
    DEEPFACE_URL: str = "http://deepface:5000"
    DEEPFACE_MODEL: str = "Facenet512"
    DEEPFACE_DETECTOR: str = "opencv"
    DEEPFACE_DISTANCE_THRESHOLD: float = 0.4

    # Upload
    UPLOAD_THRESHOLD: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
