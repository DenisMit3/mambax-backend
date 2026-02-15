"""
Subscription Plans CRUD (Telegram Stars)
"""

from backend.api.monetization._common import *


@router.get("/plans", response_model=dict)
async def get_subscription_plans(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all subscription plans from DB"""
    stmt = select(SubscriptionPlan)
    if not include_inactive:
        stmt = stmt.where(SubscriptionPlan.is_active == True)
    
    result = await db.execute(stmt)
    plans = result.scalars().all()
    
    return {"plans": plans}


@router.post("/plans", response_model=dict)
async def create_subscription_plan(
    plan: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new subscription plan"""
    db_plan = SubscriptionPlan(
        name=plan.name,
        tier=plan.tier,
        price=plan.price,
        currency=plan.currency,
        duration_days=plan.duration_days
    )
    
    # Map features
    if plan.features:
        for key, value in plan.features.items():
            if hasattr(db_plan, key):
                setattr(db_plan, key, value)
                
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    
    return {"status": "success", "plan": db_plan}


@router.patch("/plans/{plan_id}", response_model=dict)
async def update_subscription_plan(
    plan_id: uuid.UUID,
    plan_update: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an existing subscription plan"""
    db_plan = await db.get(SubscriptionPlan, plan_id)
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    update_data = plan_update.model_dump(exclude_unset=True)
    
    # Handle direct fields
    for key in ["name", "tier", "price", "currency", "duration_days", "is_active", "is_popular"]:
        if key in update_data:
            setattr(db_plan, key, update_data[key])
            
    # Handle features
    if "features" in update_data and update_data["features"]:
        for key, value in update_data["features"].items():
            if hasattr(db_plan, key):
                setattr(db_plan, key, value)
                
    await db.commit()
    await db.refresh(db_plan)
    
    return {"status": "success", "plan": db_plan}


@router.delete("/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a subscription plan (soft delete logic could be added instead)"""
    db_plan = await db.get(SubscriptionPlan, plan_id)
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await db.delete(db_plan)
    await db.commit()
    
    return {"status": "success", "message": "Plan deleted"}
