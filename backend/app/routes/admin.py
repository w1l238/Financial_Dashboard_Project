from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_admin_user, get_password_hash, verify_password
from app.models.user_preferences import User
from app.schemas.user_preferences import UserResponse, UserUpdateAdmin

router = APIRouter(prefix="/api/admin", tags=["Administrator Management"])


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    response: Response,
    skip: int = Query(0, ge=0, description="Number of users to skip (for pagination)"),
    limit: int = Query(
        10, ge=1, le=100, description="Maximum number of users to return"
    ),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    Returns a paginated list of all registered users in the system.
    The total user count is returned in the X-Total-Count response header.
    Only accessible to administrators.
    """
    total = db.query(User).count()
    # Expose total count so the frontend can compute total pages without a separate request
    response.headers["X-Total-Count"] = str(total)
    return db.query(User).offset(skip).limit(limit).all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: UserUpdateAdmin,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    Allows an administrator to modify any profile field for a specific user.
    Special restrictions apply when an administrator modifies their own account:
    1. Username modification is forbidden.
    2. Password updates require providing the current password for verification.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)

    # --- Self-Modification Security Constraints ---
    if admin.id == user.id:
        # Block username self-modification
        if "username" in update_data and update_data["username"] != admin.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators are not permitted to change their own usernames via the management portal.",
            )

        # Require current password for self-password update
        if "password" in update_data:
            current_password = update_data.pop("current_password", None)
            if not current_password or not verify_password(
                current_password, admin.hashed_password
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Verification failed: Incorrect current password provided for self-modification.",
                )

            new_password = update_data.pop("password")
            if new_password:
                user.hashed_password = get_password_hash(new_password)
    else:
        # Standard administrative password reset (no old password required)
        if "password" in update_data:
            new_password = update_data.pop("password")
            if new_password:
                user.hashed_password = get_password_hash(new_password)
            # Remove current_password if accidentally provided for someone else
            update_data.pop("current_password", None)

    # Apply remaining updates
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    Permanently removes a user from the system.
    Administrators cannot delete themselves to prevent system lockout.
    """
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own accounts.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return None
