from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
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


def _event_to_public(event: Event, db: Session, current_user: User | None = None) -> dict:
    """Convert event to dict with member/photo counts and membership status."""
    member_count = db.query(func.count(EventMember.id)).filter(EventMember.event_id == event.id).scalar() or 0
    photo_count  = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id, Photo.is_deleted == False).scalar() or 0
    
    is_member = False
    has_access = False
    if current_user:
        membership = db.query(EventMember).filter(
            EventMember.event_id == event.id,
            EventMember.user_id == current_user.id,
        ).first()
        if membership:
            is_member = True
            has_access = membership.has_access
    
    return {
        "id": str(event.id),
        "title": event.title,
        "description": event.description,
        "creator_id": str(event.creator_id),
        "visibility": event.visibility,
        "status": event.status,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "upload_threshold": event.upload_threshold,
        "photo_expiry_days": event.photo_expiry_days,
        "max_attendees": event.max_attendees,
        "created_at": event.created_at.isoformat(),
        "member_count": member_count,
        "photo_count": photo_count,
        "is_member": is_member,
        "has_access": has_access,
    }


@router.post("/", response_model=dict, status_code=201)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new event. Auto-upgrades Basic → Pro."""
    if current_user.tier == "basic":
        current_user.tier = "pro"
        db.flush()

    if current_user.tier not in ("pro", "business"):
        raise HTTPException(status_code=403, detail="Pro or Business tier required")

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

    # Creator auto-joins
    membership = EventMember(
        event_id=event.id,
        user_id=current_user.id,
        has_access=True,
    )
    db.add(membership)
    db.commit()
    db.refresh(event)
    return _event_to_public(event, db, current_user)


@router.get("/", response_model=list[dict])
def list_events(
    my_events: bool = Query(False, description="Show only events I've joined"),
    status: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List events:
    - my_events=false (default): ALL public events + private events you're in
    - my_events=true: Only events you've joined
    """
    if my_events:
        # Only show events the user is a member of
        query = (
            db.query(Event)
            .join(EventMember, EventMember.event_id == Event.id)
            .filter(EventMember.user_id == current_user.id)
        )
    else:
        # Show all public events + private events user is a member of
        query = db.query(Event).outerjoin(
            EventMember,
            (EventMember.event_id == Event.id) & (EventMember.user_id == current_user.id)
        ).filter(
            or_(
                Event.visibility == "public",
                EventMember.user_id == current_user.id,
            )
        )

    if status:
        query = query.filter(Event.status == status)
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%"))

    events = query.order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
    return [_event_to_public(e, db, current_user) for e in events]


@router.get("/{event_id}", response_model=dict)
def get_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Allow viewing public events, or private events you're a member of
    if event.visibility == "private":
        membership = db.query(EventMember).filter(
            EventMember.event_id == event_id,
            EventMember.user_id == current_user.id,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this private event")
    
    return _event_to_public(event, db, current_user)


@router.post("/{event_id}/join", response_model=EventJoinResponse)
def join_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a public event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.visibility == "private":
        raise HTTPException(status_code=403, detail="Cannot join private events without invitation")
    
    if event.status != "active":
        raise HTTPException(status_code=400, detail="Cannot join ended/archived event")
    
    # Check if already a member
    existing = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    if existing:
        return EventJoinResponse(message="Already a member", already_member=True)
    
    # Check max attendees
    current_members = db.query(func.count(EventMember.id)).filter(
        EventMember.event_id == event_id
    ).scalar() or 0
    if current_members >= event.max_attendees:
        raise HTTPException(status_code=400, detail="Event is full")
    
    # Join
    membership = EventMember(
        event_id=event_id,
        user_id=current_user.id,
        has_access=False,  # Need to upload photos to unlock
    )
    db.add(membership)
    db.commit()
    
    return EventJoinResponse(
        message=f"Joined event! Upload {event.upload_threshold} photos to unlock the gallery.",
        already_member=False,
    )


@router.patch("/{event_id}", response_model=dict)
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
        raise HTTPException(status_code=403, detail="Only the creator can update this event")
    
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return _event_to_public(event, db, current_user)


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
        raise HTTPException(status_code=403, detail="Only creator can delete")
    
    event.status = "archived"
    db.commit()
