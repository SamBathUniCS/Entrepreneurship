from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.photo import Photo, PhotoTag
from app.models.user import User
from app.schemas.event import EventCreate, EventJoinResponse, EventPublic, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])
settings = get_settings()


def _event_to_public(event: Event, db: Session) -> EventPublic:
    member_count = db.query(func.count(EventMember.id)).filter(EventMember.event_id == event.id).scalar() or 0
    photo_count  = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id, Photo.is_deleted == False).scalar() or 0
    data = EventPublic.model_validate(event)
    data.member_count = member_count
    data.photo_count  = photo_count
    return data


@router.post("/", response_model=EventPublic, status_code=201)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new event.
    If the user is Basic tier, they are automatically upgraded to Pro first.
    """
    # Auto-upgrade Basic → Pro so testers don't have to think about this
    if current_user.tier == "basic":
        current_user.tier = "pro"
        db.flush()

    if current_user.tier not in ("pro", "business"):
        raise HTTPException(status_code=403, detail="Pro or Business tier required to create events")

    max_attendees = 500 if current_user.tier == "business" else 50

    exclusivity_ends = None
    if payload.event_date:
        exclusivity_ends = payload.event_date + timedelta(hours=48)

    event = Event(
        title=payload.title,
        description=payload.description,
        creator_id=current_user.id,
        event_date=payload.event_date,
        exclusivity_ends_at=exclusivity_ends,
        visibility=payload.visibility,
        upload_threshold=payload.upload_threshold,
        photo_expiry_days=payload.photo_expiry_days,
        max_attendees=max_attendees,
    )
    db.add(event)
    db.flush()

    # Creator auto-joins as a member with immediate access
    membership = EventMember(
        event_id=event.id,
        user_id=current_user.id,
        has_access=True,
    )
    db.add(membership)
    db.commit()
    db.refresh(event)
    return _event_to_public(event, db)


@router.get("/", response_model=list[EventPublic])
def list_events(
    status: str | None = Query(None),
    q:      str | None = Query(None),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List events the current user is a member of."""
    query = (
        db.query(Event)
        .join(EventMember, EventMember.event_id == Event.id)
        .filter(EventMember.user_id == current_user.id)
    )
    if status:
        query = query.filter(Event.status == status)
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%"))
    events = query.order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
    return [_event_to_public(e, db) for e in events]


@router.get("/discover", response_model=list[EventPublic])
def discover_events(
    q:     str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _:  User = Depends(get_current_user),
):
    """Search public active events by title."""
    events = (
        db.query(Event)
        .filter(
            Event.visibility == "public",
            Event.status == "active",
            Event.title.ilike(f"%{q}%"),
        )
        .limit(limit)
        .all()
    )
    return [_event_to_public(e, db) for e in events]


@router.get("/{event_id}", response_model=EventPublic)
def get_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.visibility == "private":
        membership = db.query(EventMember).filter(
            EventMember.event_id == event_id,
            EventMember.user_id == current_user.id,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this event")
    return _event_to_public(event, db)


@router.post("/{event_id}/join", response_model=EventJoinResponse)
def join_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "active":
        raise HTTPException(status_code=400, detail="Event is not active")

    member_count = db.query(func.count(EventMember.id)).filter(EventMember.event_id == event_id).scalar()
    if member_count >= event.max_attendees:
        raise HTTPException(status_code=400, detail="Event has reached maximum attendees")

    existing = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this event")

    immediate_access = current_user.tier in ("pro", "business")
    membership = EventMember(
        event_id=event.id,
        user_id=current_user.id,
        has_access=immediate_access,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    photos_featuring = (
        db.query(func.count(PhotoTag.id))
        .filter(PhotoTag.user_id == current_user.id)
        .join(PhotoTag.photo)
        .filter_by(event_id=event_id)
        .scalar()
    ) or 0

    msg = "Joined with full access (Pro)" if immediate_access else f"Upload {event.upload_threshold} photos to unlock gallery access"
    return EventJoinResponse(
        event=_event_to_public(event, db),
        membership_id=membership.id,
        has_access=membership.has_access,
        upload_count=membership.upload_count,
        photos_featuring_you=photos_featuring,
        message=msg,
    )


@router.patch("/{event_id}", response_model=EventPublic)
def update_event(
    event_id: UUID,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can edit it")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return _event_to_public(event, db)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this event")
    event.status = "archived"
    db.commit()


@router.get("/{event_id}/members")
def list_members(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this event")
    members = (
        db.query(EventMember, User)
        .join(User, User.id == EventMember.user_id)
        .filter(EventMember.event_id == event_id)
        .order_by(EventMember.upload_count.desc())
        .all()
    )
    return [
        {
            "user_id":        str(m.user_id),
            "username":       u.username,
            "full_name":      u.full_name,
            "upload_count":   m.upload_count,
            "has_access":     m.has_access,
            "is_photographer":m.is_photographer,
            "joined_at":      m.joined_at.isoformat(),
        }
        for m, u in members
    ]
