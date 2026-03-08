import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.webhook import Webhook
from app.models.user import User
from app.schemas.schemas import WebhookCreate, WebhookUpdate, WebhookResponse
from app.services.auth_service import get_current_user
from typing import List

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Webhook).order_by(Webhook.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=WebhookResponse)
async def create_webhook(
    data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = secrets.token_urlsafe(16)
    webhook = Webhook(
        **data.model_dump(),
        webhook_token=token,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    webhook = await db.get(Webhook, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(webhook, key, value)

    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    webhook = await db.get(Webhook, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(webhook)
    await db.commit()
    return {"message": "Webhook deleted"}
