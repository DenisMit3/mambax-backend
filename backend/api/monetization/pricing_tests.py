"""
Pricing A/B Tests CRUD (admin).
"""

from backend.api.monetization._common import *


class PricingTestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    variants: list
    target_segment: str = "all"
    traffic_split: list = []
    start_date: datetime
    end_date: datetime

class PricingTestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    variants: Optional[list] = None
    target_segment: Optional[str] = None
    traffic_split: Optional[list] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    winner_variant: Optional[str] = None


@router.get("/pricing-tests")
async def get_pricing_tests(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all pricing A/B tests"""
    stmt = select(PricingTest).order_by(PricingTest.created_at.desc())
    if status:
        stmt = stmt.where(PricingTest.status == status)
    result = await db.execute(stmt)
    tests = result.scalars().all()

    return {
        "tests": [
            {
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "variants": t.variants,
                "target_segment": t.target_segment,
                "traffic_split": t.traffic_split,
                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "status": t.status,
                "results": t.results,
                "winner_variant": t.winner_variant,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tests
        ],
        "total": len(tests),
    }


@router.post("/pricing-tests")
async def create_pricing_test(
    data: PricingTestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new pricing A/B test"""
    test = PricingTest(
        name=data.name,
        description=data.description,
        variants=data.variants,
        target_segment=data.target_segment,
        traffic_split=data.traffic_split or [50] * len(data.variants),
        start_date=data.start_date,
        end_date=data.end_date,
        status="draft",
        created_by=current_user.id,
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return {"status": "success", "id": str(test.id)}


@router.patch("/pricing-tests/{test_id}")
async def update_pricing_test(
    test_id: uuid.UUID,
    data: PricingTestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a pricing A/B test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(test, key):
            setattr(test, key, value)

    await db.commit()
    await db.refresh(test)
    return {"status": "success", "id": str(test.id)}


@router.delete("/pricing-tests/{test_id}")
async def delete_pricing_test(
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a pricing A/B test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    await db.delete(test)
    await db.commit()
    return {"status": "success"}


@router.get("/pricing-tests/{test_id}/results")
async def get_pricing_test_results(
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get results for a specific pricing test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    variant_results = []
    for i, variant in enumerate(test.variants or []):
        variant_name = variant.get("name", f"Variant {i}")
        stmt = select(
            func.count(RevenueTransaction.id),
            func.sum(RevenueTransaction.amount),
        ).where(
            and_(
                RevenueTransaction.custom_metadata["pricing_test_id"].as_string() == str(test_id),
                RevenueTransaction.custom_metadata["variant"].as_string() == variant_name,
                RevenueTransaction.status == "completed",
            )
        )
        try:
            res = (await db.execute(stmt)).one_or_none()
            conversions = res[0] or 0 if res else 0
            revenue = float(res[1] or 0) if res else 0
        except Exception:
            conversions = 0
            revenue = 0

        variant_results.append({
            "variant": variant_name,
            "price": variant.get("price", 0),
            "conversions": conversions,
            "revenue": round(revenue, 2),
        })

    return {
        "test_id": str(test.id),
        "name": test.name,
        "status": test.status,
        "variants": variant_results,
        "winner_variant": test.winner_variant,
    }
