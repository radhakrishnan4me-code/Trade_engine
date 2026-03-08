from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.schemas import AccountCreate, AccountUpdate, AccountResponse
from app.services.auth_service import get_current_user
from app.services.openalgo_manager import openalgo_manager
from typing import List

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=List[AccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Account).order_by(Account.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=AccountResponse)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = Account(**data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    # Reset cached client if URL or key changed
    openalgo_manager.remove_client(account_id)

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    openalgo_manager.remove_client(account_id)
    await db.delete(account)
    await db.commit()
    return {"message": "Account deleted"}


@router.post("/{account_id}/test")
async def test_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await openalgo_manager.test_connection(account.openalgo_url, account.api_key)
    if result["success"]:
        account.status = "connected"
        await db.commit()
    else:
        account.status = "error"
        await db.commit()
    return result


@router.post("/{account_id}/test-ws")
async def test_ws_connection(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Test WebSocket connection to the OpenAlgo instance."""
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if not account.ws_url:
        return {"success": False, "error": "No WebSocket URL configured for this account"}

    result = await openalgo_manager.test_ws_connection(account.ws_url, account.api_key)
    return result

