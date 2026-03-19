from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.friendship import Friendship, FaceEmbedding
from app.models.user import User

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/search")
def search_users(
    q: str = Query(..., min_length=2, description="Search by username or email"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for users by username or email."""
    users = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            or_(
                User.username.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
            ),
        )
        .limit(limit)
        .all()
    )
    
    results = []
    for user in users:
        friendship = (
            db.query(Friendship)
            .filter(
                or_(
                    (Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user.id),
                    (Friendship.requester_id == user.id) & (Friendship.addressee_id == current_user.id),
                )
            )
            .first()
        )
        
        status = None
        if friendship:
            if friendship.requester_id == current_user.id:
                status = f"{friendship.status}_sent"
            else:
                status = f"{friendship.status}_received"
        
        # Check if user has a face embedding by querying directly
        has_embedding = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).first() is not None
        
        results.append({
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "tier": user.tier,
            "friendship_status": status,
            "has_selfie": has_embedding, # "has_selfie": user.face_embedding is not None,
        })
    
    return results


@router.post("/request/{user_id}")
def send_friend_request(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a friend request."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = (
        db.query(Friendship)
        .filter(
            or_(
                (Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user_id),
                (Friendship.requester_id == user_id) & (Friendship.addressee_id == current_user.id),
            )
        )
        .first()
    )
    
    if existing:
        if existing.status == "accepted":
            return {"message": "Already friends", "status": "accepted"}
        elif existing.status == "pending":
            return {"message": "Friend request already sent", "status": "pending"}
        elif existing.status == "blocked":
            raise HTTPException(status_code=403, detail="Cannot send request")
    
    friendship = Friendship(
        requester_id=current_user.id,
        addressee_id=user_id,
        status="pending",
    )
    db.add(friendship)
    db.commit()
    
    return {"message": f"Friend request sent to {target.username}", "status": "pending"}


@router.get("/requests")
def list_friend_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List pending friend requests you've received."""
    requests = (
        db.query(Friendship)
        .options(joinedload(Friendship.requester))
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .all()
    )
    
    return [
        {
            "id": str(req.id),
            "from_user_id": str(req.requester_id),
            "from_username": req.requester.username,
            "from_email": req.requester.email,
            "created_at": req.created_at.isoformat(),
        }
        for req in requests
    ]


@router.post("/requests/{friendship_id}/accept")
def accept_friend_request(
    friendship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a friend request."""
    friendship = (
        db.query(Friendship)
        .options(joinedload(Friendship.requester))
        .filter(Friendship.id == friendship_id)
        .first()
    )
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your friend request")
    
    if friendship.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    friendship.status = "accepted"
    db.commit()
    
    return {"message": f"You are now friends with {friendship.requester.username}", "status": "accepted"}


@router.post("/requests/{friendship_id}/decline")
def decline_friend_request(
    friendship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Decline a friend request."""
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your friend request")
    
    if friendship.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    friendship.status = "declined"
    db.commit()
    
    return {"message": "Friend request declined", "status": "declined"}


@router.get("/")
def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all accepted friends."""
    friendships = (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
        )
        .all()
    )
    
    friends = []
    for f in friendships:
        friend = f.addressee if f.requester_id == current_user.id else f.requester
        has_embedding = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == friend.id).first() is not None
        
        friends.append({
            "id": str(friend.id),
            "username": friend.username,
            "email": friend.email,
            "tier": friend.tier,
            "has_selfie": has_embedding,
            "friendship_id": str(f.id),
            "friends_since": f.created_at.isoformat(),
        })
    
    return friends


@router.get("/mutual/{event_id}")
def mutual_friends_in_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find which of your friends are in a specific event."""
    from app.models.event_member import EventMember
    
    my_friends = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
        )
        .all()
    )
    
    friend_ids = []
    for f in my_friends:
        friend_id = f.addressee_id if f.requester_id == current_user.id else f.requester_id
        friend_ids.append(friend_id)
    
    if not friend_ids:
        return []
    
    members = (
        db.query(EventMember)
        .filter(
            EventMember.event_id == event_id,
            EventMember.user_id.in_(friend_ids),
        )
        .all()
    )
    
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        result.append({
            "id": str(user.id),
            "username": user.username,
            "upload_count": member.upload_count,
            "has_access": member.has_access,
        })
    
    return result


@router.delete("/{friendship_id}")
def unfriend(
    friendship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a friend."""
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    if friendship.requester_id != current_user.id and friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your friendship")
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Friendship removed"}
