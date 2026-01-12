# 🎁 VIRTUAL GIFTS COMPLETION PLAN

## Executive Summary
This plan completes the Virtual Gifts feature by implementing 6 remaining tasks: seed data, gift images, push notifications, sound effects, receiver bonus, and profile statistics.

---

## TASK 1: SEED DATA FOR GIFT CATALOG

### 1.1 Create seed_gifts.py module
**File:** `backend/seed_gifts.py`
**Action:** CREATE new file
**Dependencies:** None

**Content structure:**
```python
# Lines 1-10: Imports
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.monetization import GiftCategory, VirtualGift

# Lines 12-40: GIFT_CATEGORIES constant
GIFT_CATEGORIES = [
    {"name": "Romantic", "description": "Express your love", "icon": "❤️", "sort_order": 1},
    {"name": "Celebration", "description": "Party time!", "icon": "🎉", "sort_order": 2},
    {"name": "Luxury", "description": "Premium gifts", "icon": "💎", "sort_order": 3},
    {"name": "Fun", "description": "Just for fun", "icon": "🎈", "sort_order": 4},
]

# Lines 42-90: VIRTUAL_GIFTS constant
VIRTUAL_GIFTS = [
    {"name": "Red Rose", "description": "A beautiful red rose", "image_url": "/static/gifts/rose.png", "price": 5, "category": "Romantic", "sort_order": 1},
    {"name": "Heart Balloon", "description": "Love is in the air", "image_url": "/static/gifts/heart_balloon.png", "price": 10, "category": "Romantic", "sort_order": 2},
    {"name": "Teddy Bear", "description": "Cuddly teddy bear", "image_url": "/static/gifts/teddy.png", "price": 25, "category": "Romantic", "sort_order": 3},
    {"name": "Diamond Ring", "description": "Sparkling diamond ring", "image_url": "/static/gifts/diamond_ring.png", "price": 100, "category": "Luxury", "is_premium": True, "sort_order": 1},
    {"name": "Champagne", "description": "Celebrate together", "image_url": "/static/gifts/champagne.png", "price": 50, "category": "Celebration", "sort_order": 1},
    {"name": "Chocolate Box", "description": "Sweet treats", "image_url": "/static/gifts/chocolate.png", "price": 15, "category": "Fun", "sort_order": 1},
    {"name": "Golden Star", "description": "You're a star!", "image_url": "/static/gifts/star.png", "price": 20, "category": "Fun", "sort_order": 2},
    {"name": "Romantic Dinner", "description": "Candlelit dinner for two", "image_url": "/static/gifts/dinner.png", "price": 75, "category": "Luxury", "is_premium": True, "sort_order": 2},
]

# Lines 92-140: seed_gift_categories function
async def seed_gift_categories(db: AsyncSession) -> dict[str, UUID]:
    """
    Seed gift categories. Returns mapping of name -> id.
    Idempotent: skips existing categories.
    """
    category_map = {}
    
    for cat_data in GIFT_CATEGORIES:
        # Check if exists
        result = await db.execute(
            select(GiftCategory).where(GiftCategory.name == cat_data["name"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            category_map[cat_data["name"]] = existing.id
            continue
        
        # Create new
        category = GiftCategory(
            name=cat_data["name"],
            description=cat_data["description"],
            icon=cat_data["icon"],
            sort_order=cat_data["sort_order"],
            is_active=True
        )
        db.add(category)
        await db.flush()
        category_map[cat_data["name"]] = category.id
    
    await db.commit()
    return category_map

# Lines 142-200: seed_virtual_gifts function
async def seed_virtual_gifts(db: AsyncSession, category_map: dict[str, UUID]) -> int:
    """
    Seed virtual gifts. Returns count of created gifts.
    Idempotent: skips existing gifts.
    """
    created_count = 0
    
    for gift_data in VIRTUAL_GIFTS:
        # Check if exists
        result = await db.execute(
            select(VirtualGift).where(VirtualGift.name == gift_data["name"])
        )
        if result.scalar_one_or_none():
            continue
        
        # Get category ID
        category_name = gift_data.get("category")
        category_id = category_map.get(category_name) if category_name else None
        
        # Create new
        gift = VirtualGift(
            name=gift_data["name"],
            description=gift_data.get("description"),
            image_url=gift_data["image_url"],
            price=gift_data["price"],
            currency="XTR",
            category_id=category_id,
            is_premium=gift_data.get("is_premium", False),
            is_animated=gift_data.get("is_animated", False),
            is_limited=False,
            is_active=True,
            sort_order=gift_data.get("sort_order", 0)
        )
        db.add(gift)
        created_count += 1
    
    await db.commit()
    return created_count

# Lines 202-220: main seed_gifts function
async def seed_gifts(db: AsyncSession) -> dict:
    """
    Main entry point: seeds categories and gifts.
    Called from main.py startup.
    """
    try:
        print("Seeding gift categories...")
        category_map = await seed_gift_categories(db)
        print(f"  -> {len(category_map)} categories ready")
        
        print("Seeding virtual gifts...")
        count = await seed_virtual_gifts(db, category_map)
        print(f"  -> {count} new gifts created")
        
        return {"categories": len(category_map), "gifts_created": count}
    except Exception as e:
        print(f"Gift seeding failed: {e}")
        await db.rollback()
        return {"error": str(e)}
```

### 1.2 Integrate seed into main.py startup
**File:** `backend/main.py`
**Action:** MODIFY
**Location:** Function `seed_db()`, approximately line 265-270

**Before:**
```python
    print("Seeding logic complete.")
```

**After:**
```python
    # Seed virtual gifts catalog
    try:
        from backend.seed_gifts import seed_gifts
        await seed_gifts(db)
    except Exception as e:
        print(f"Gift seeding error: {e}")
    
    print("Seeding logic complete.")
```

### 1.3 Add manual seed endpoint
**File:** `backend/main.py`
**Action:** MODIFY
**Location:** After existing `/init` endpoint, approximately line 510

**Add:**
```python
@app.get("/seed-gifts")
async def seed_gifts_endpoint():
    """Manually seed gift catalog"""
    try:
        from backend.seed_gifts import seed_gifts
        async with database.async_session() as session:
            result = await seed_gifts(session)
        return {"status": "success", **result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

### Verification:
- [ ] File `backend/seed_gifts.py` exists
- [ ] `seed_gifts()` called in `seed_db()` function
- [ ] GET `/seed-gifts` endpoint returns `{"status": "success", ...}`
- [ ] Database has 4 categories and 8 gifts after startup

---

## TASK 2: GENERATE REALISTIC GIFT IMAGES

### 2.1 Generate rose.png
**Tool:** `generate_image`
**Prompt:** "A beautiful single red rose with green stem, 3D rendered icon style, soft shadows, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/rose.png`

### 2.2 Generate heart_balloon.png
**Tool:** `generate_image`
**Prompt:** "A shiny red heart-shaped balloon with a curly string, 3D rendered icon style, glossy surface, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/heart_balloon.png`

### 2.3 Generate teddy.png
**Tool:** `generate_image`
**Prompt:** "A cute brown teddy bear holding a red heart, 3D rendered icon style, soft fur texture, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/teddy.png`

### 2.4 Generate diamond_ring.png
**Tool:** `generate_image`
**Prompt:** "A sparkling diamond engagement ring, gold band with brilliant cut diamond, 3D rendered icon style, light reflections, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/diamond_ring.png`

### 2.5 Generate champagne.png
**Tool:** `generate_image`
**Prompt:** "A champagne bottle with popping cork and spraying bubbles, 3D rendered icon style, celebration theme, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/champagne.png`

### 2.6 Generate chocolate.png
**Tool:** `generate_image`
**Prompt:** "A heart-shaped box of chocolates with lid slightly open showing assorted chocolates inside, 3D rendered icon style, red box with gold ribbon, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/chocolate.png`

### 2.7 Generate star.png
**Tool:** `generate_image`
**Prompt:** "A golden five-pointed star with sparkles and glow effect, 3D rendered icon style, shiny metallic surface, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/star.png`

### 2.8 Generate dinner.png
**Tool:** `generate_image`
**Prompt:** "A romantic dinner table setting with two candles, wine glasses, and a rose, 3D rendered icon style, warm lighting, transparent background, centered, 256x256 pixels"
**Save to:** `backend/static/gifts/dinner.png`

### Verification:
- [ ] Each file size > 1KB (not placeholder)
- [ ] Images render correctly in browser at `/static/gifts/rose.png`
- [ ] Gift catalog UI shows real images

---

## TASK 3: PUSH NOTIFICATIONS FOR OFFLINE USERS

### 3.1 Analyze existing push infrastructure
**File:** `backend/services/notification.py`
**Status:** ✅ `send_push_notification()` exists (lines 26-99)
**Function signature:**
```python
async def send_push_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    url: str = "/",
    icon: str = "/icon-192x192.png",
    tag: str = None
)
```

### 3.2 Add push notification to send_gift endpoint
**File:** `backend/api/monetization.py`
**Action:** MODIFY
**Location:** In `send_gift()` function, after WebSocket send (approximately line 720)

**Find this code:**
```python
    await manager.send_personal_message(notification, str(request.receiver_id))
```

**Add after (with proper indentation):**
```python
    # 9b. Send Push Notification if user is offline
    # Check if WebSocket message was delivered
    ws_online = manager.is_user_online(str(request.receiver_id))
    if not ws_online:
        from backend.services.notification import send_push_notification
        try:
            sender_display = "Someone" if request.is_anonymous else (sender.name or "A user")
            await send_push_notification(
                db=db,
                user_id=str(request.receiver_id),
                title=f"🎁 {sender_display} sent you a gift!",
                body=f"You received a {gift.name}",
                url="/gifts",
                tag=f"gift_{transaction.id}"
            )
        except Exception as push_err:
            print(f"Push notification failed: {push_err}")
```

### 3.3 Add is_user_online method to ConnectionManager
**File:** `backend/core/websocket.py`
**Action:** MODIFY
**Location:** In `ConnectionManager` class

**Add method:**
```python
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is currently connected via WebSocket"""
        return user_id in self.active_connections
```

### 3.4 Verify import path
**File:** `backend/api/monetization.py`
**Check:** Ensure `from backend.services.notification import send_push_notification` works

### Verification:
- [ ] `is_user_online()` method exists in ConnectionManager
- [ ] Push notification sent when receiver is offline
- [ ] Console shows "Push notification failed" only if VAPID not configured (expected in dev)
- [ ] No import errors

---

## TASK 4: SOUND EFFECT FOR GIFT REVEAL ANIMATION

### 4.1 Create sounds directory
**Path:** `frontend/public/sounds/`
**Action:** CREATE directory if not exists

### 4.2 Add placeholder audio file
**File:** `frontend/public/sounds/celebration.mp3`
**Option A:** Download free sound effect from freesound.org or similar
**Option B:** Create silent placeholder (base64 minimal MP3)
**Option C:** Use text-to-speech "Congratulations!" as placeholder

**For Option B (minimal silent MP3):**
Create file with minimal valid MP3 content (avoids 404 error)

### 4.3 Verify audio code in GiftRevealAnimation
**File:** `frontend/src/components/ui/GiftRevealAnimation.tsx`
**Location:** Lines 91-97
**Status:** ✅ Code already exists:
```tsx
try {
    audioRef.current = new Audio("/sounds/celebration.mp3");
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
} catch {}
```

### 4.4 Add error handling for missing audio
**File:** `frontend/src/components/ui/GiftRevealAnimation.tsx`
**Action:** VERIFY existing try-catch handles missing file gracefully

### Verification:
- [ ] File `frontend/public/sounds/celebration.mp3` exists
- [ ] No console errors when opening gift
- [ ] Audio plays (if valid sound file) or silently fails

---

## TASK 5: RECEIVER BONUS (10% OF GIFT VALUE)

### 5.1 Modify send_gift to add receiver bonus
**File:** `backend/api/monetization.py`
**Action:** MODIFY
**Location:** In `send_gift()` function, after deducting sender balance (approximately line 665)

**Find:**
```python
    # 4. Deduct balance atomically from sender
    sender.stars_balance = sender.stars_balance - gift.price
```

**Add after:**
```python
    # 4b. Credit receiver with 10% bonus
    receiver_bonus = int(gift.price * 0.1)  # 10% of gift price
    if receiver_bonus > 0:
        receiver.stars_balance = (receiver.stars_balance or 0) + receiver_bonus
```

### 5.2 Add bonus info to WebSocket notification
**File:** `backend/api/monetization.py`
**Action:** MODIFY
**Location:** In notification dict (approximately line 707-718)

**Find:**
```python
    notification = {
        "type": "gift_received",
        ...
        "timestamp": transaction.created_at.isoformat()
    }
```

**Add field:**
```python
        "bonus_received": receiver_bonus,  # Add this line
```

### 5.3 Update GiftNotification UI to show bonus
**File:** `frontend/src/components/ui/GiftNotification.tsx`
**Action:** MODIFY
**Location:** After line 75 (the paragraph showing sender/gift name)

**Find:**
```tsx
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>{data?.sender_name}</strong> sent you a {data?.gift_name}
                </p>
```

**Replace with:**
```tsx
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>{data?.sender_name}</strong> sent you a {data?.gift_name}
                    {data?.bonus_received && data.bonus_received > 0 && (
                        <span style={{ color: '#10b981', fontWeight: 600, marginLeft: '4px' }}>
                            +{data.bonus_received} ⭐
                        </span>
                    )}
                </p>
```

### 5.4 Update GiftNotificationProps interface
**File:** `frontend/src/components/ui/GiftNotification.tsx`
**Action:** MODIFY
**Location:** Interface definition (lines 7-15)

**Add field:**
```tsx
    bonus_received?: number;
```

### 5.5 Update GiftRevealAnimation to show bonus
**File:** `frontend/src/components/ui/GiftRevealAnimation.tsx`
**Action:** MODIFY interface and UI (if bonus > 0, show "+X ⭐ added to your balance!")

### Verification:
- [ ] Sender balance decreases by gift.price
- [ ] Receiver balance increases by floor(gift.price * 0.1)
- [ ] WebSocket notification includes bonus_received
- [ ] UI shows "+X ⭐" in notification
- [ ] Bonus is 0 for gifts priced < 10 XTR (floor(5 * 0.1) = 0)

---

## TASK 6: GIFT STATISTICS IN USER PROFILE

### 6.1 Add gifts_received field to public profile API response
**File:** `backend/api/users.py`
**Action:** MODIFY
**Location:** In `read_user()` function (the GET /users/{user_id} endpoint)

**Add after fetching user:**
```python
    # Count gifts received by this user
    from backend.models.monetization import GiftTransaction
    gifts_count_result = await db.execute(
        select(func.count(GiftTransaction.id)).where(
            GiftTransaction.receiver_id == user_id
        )
    )
    gifts_received_count = gifts_count_result.scalar() or 0
```

**Add to response:**
```python
    return UserResponse(
        ...
        # Add this field to response
    )
```

### 6.2 Add gifts_received to UserResponse schema (optional field)
**File:** `backend/schemas/user.py`
**Action:** MODIFY
**Location:** In `UserResponse` class

**Add field:**
```python
    gifts_received: Optional[int] = None
```

### 6.3 Display gifts count on other user's profile page
**File:** `frontend/src/app/users/[id]/page.tsx`
**Action:** MODIFY
**Location:** In the profile info section

**Add UI element:**
```tsx
{user.gifts_received > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ec4899' }}>
        <Gift size={16} />
        <span>{user.gifts_received} gifts received</span>
    </div>
)}
```

### 6.4 Import Gift icon if needed
**File:** `frontend/src/app/users/[id]/page.tsx`
**Check:** Ensure `Gift` is imported from `lucide-react`

### Verification:
- [ ] API returns `gifts_received` field in user profile
- [ ] Field is 0 for users with no gifts
- [ ] UI shows gifts count on profile page
- [ ] Count updates after receiving a gift

---

## EXECUTION ORDER

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Foundation (Parallel)                              │
│  ├── TASK 1: Seed Data (20 min)                              │
│  └── TASK 2: Gift Images (15 min)                            │
├─────────────────────────────────────────────────────────────┤
│  PHASE 2: Notifications (Sequential)                         │
│  ├── TASK 3.3: Add is_user_online (5 min)                    │
│  ├── TASK 3.2: Add push to send_gift (10 min)                │
│  └── TASK 4: Sound Effect (10 min)                           │
├─────────────────────────────────────────────────────────────┤
│  PHASE 3: Features (Sequential)                              │
│  ├── TASK 5.1-5.2: Receiver Bonus Backend (10 min)           │
│  ├── TASK 5.3-5.5: Receiver Bonus Frontend (10 min)          │
│  └── TASK 6: Profile Statistics (15 min)                     │
└─────────────────────────────────────────────────────────────┘

Total estimated time: ~95 minutes
```

---

## FILES SUMMARY

### Files to CREATE:
1. `backend/seed_gifts.py` - Seed data module

### Files to MODIFY:
1. `backend/main.py` - Add seed call and endpoint
2. `backend/api/monetization.py` - Push notifications + receiver bonus
3. `backend/core/websocket.py` - Add is_user_online method
4. `backend/api/users.py` - Add gifts_received to profile
5. `backend/schemas/user.py` - Add gifts_received field
6. `frontend/src/components/ui/GiftNotification.tsx` - Show bonus
7. `frontend/src/app/users/[id]/page.tsx` - Show gifts count

### Files to REPLACE (images):
1-8. `backend/static/gifts/*.png` - All 8 gift images

### Files to CREATE (audio):
1. `frontend/public/sounds/celebration.mp3`

---

## ROLLBACK PLAN

If any task fails:

1. **TASK 1 fails:** Delete `seed_gifts.py`, revert main.py changes
2. **TASK 2 fails:** Keep placeholder images (no breaking change)
3. **TASK 3 fails:** Comment out push call (gifts still work without push)
4. **TASK 4 fails:** Remove audio file (try-catch handles gracefully)
5. **TASK 5 fails:** Remove bonus logic (no receiver credit, but sender still charged)
6. **TASK 6 fails:** Remove gifts_received field (profile still works)

Each task is isolated and can be reverted independently.
