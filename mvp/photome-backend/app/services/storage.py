import io
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()


def _internal_client():
    """For server-side operations (upload, download). Uses internal Docker hostname."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def _public_client():
    """
    For generating presigned URLs. Uses the public-facing URL so the
    browser can actually reach it (localhost:9000, not minio:9000).
    Reads S3_PUBLIC_URL env var; falls back to replacing 'minio' with 'localhost'.
    """
    public_url = settings.S3_PUBLIC_URL or settings.S3_ENDPOINT_URL.replace(
        "minio", "localhost"
    )
    return boto3.client(
        "s3",
        endpoint_url=public_url,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket_exists() -> None:
    client = _internal_client()
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET)
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchBucket"):
            client.create_bucket(Bucket=settings.S3_BUCKET)
        else:
            raise


def upload_file(file_obj: BinaryIO, s3_key: str, content_type: str = "image/jpeg") -> str:
    client = _internal_client()
    client.upload_fileobj(
        file_obj, settings.S3_BUCKET, s3_key,
        ExtraArgs={"ContentType": content_type},
    )
    return s3_key


def download_file(s3_key: str) -> bytes:
    client = _internal_client()
    buf = io.BytesIO()
    client.download_fileobj(settings.S3_BUCKET, s3_key, buf)
    return buf.getvalue()


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL signed against the PUBLIC endpoint (localhost:9000).
    This is what gets returned to the browser — it must match what the browser hits.
    """
    if not s3_key:
        return ""
    try:
        return _public_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    except ClientError:
        return ""


def delete_file(s3_key: str) -> None:
    try:
        _internal_client().delete_object(Bucket=settings.S3_BUCKET, Key=s3_key)
    except ClientError:
        pass


def build_s3_key(event_id: str, photo_id: str, suffix: str = "") -> str:
    return f"events/{event_id}/photos/{photo_id}{suffix}"


def build_selfie_key(user_id: str) -> str:
    return f"users/{user_id}/selfie.jpg"
