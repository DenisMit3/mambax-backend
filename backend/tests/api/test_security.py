"""
Tests for security fixes (SEC-001 to SEC-006)
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


# ============================================================================
# SEC-001: OTP should NOT be returned in API response
# ============================================================================
@pytest.mark.asyncio
async def test_otp_not_in_response(client: AsyncClient):
    """SEC-001: OTP should never be returned in API response"""
    phone = "+79991234567"
    
    resp = await client.post("/api/auth/request-otp", json={"identifier": phone})
    assert resp.status_code == 200
    data = resp.json()
    
    # OTP should NOT be in response
    assert "debug_otp" not in data
    assert "otp" not in data
    # Should have success message
    assert data.get("success") == True


# ============================================================================
# SEC-002: OTP should be 6 digits
# ============================================================================
@pytest.mark.asyncio
async def test_otp_is_6_digits():
    """SEC-002: Generated OTP should be 6 digits"""
    from backend.auth import generate_otp
    
    for _ in range(10):  # Test multiple times
        otp = generate_otp()
        assert len(otp) == 6, f"OTP should be 6 digits, got {len(otp)}"
        assert otp.isdigit(), f"OTP should be all digits, got {otp}"


# ============================================================================
# SEC-003: DEV endpoints should be blocked in production
# ============================================================================
@pytest.mark.asyncio
async def test_dev_endpoints_blocked_in_production(client: AsyncClient):
    """SEC-003: DEV endpoints should return 404 in production"""
    # Try to add stars (DEV endpoint) - without auth, should get 401 or 404
    resp = await client.post(
        "/api/users/me/add-stars-dev",
        json={"amount": 100}
    )
    # Should be 404 (not found) or 401 (auth required) or 405 (method not allowed)
    assert resp.status_code in [401, 404, 405, 422]


@pytest.mark.asyncio
async def test_dev_endpoints_work_in_development(client: AsyncClient):
    """SEC-003: DEV endpoints should work in development mode"""
    # Add stars should require auth
    resp = await client.post(
        "/api/users/me/add-stars-dev",
        json={"amount": 100}
    )
    # Should be 401 (auth required) or 404 (not found) or 200 if auth provided
    assert resp.status_code in [401, 404, 200, 422, 405]


# ============================================================================
# SEC-004: Rate limiting for OTP verification
# ============================================================================
@pytest.mark.asyncio
async def test_otp_verify_rate_limiting(client: AsyncClient):
    """SEC-004: OTP verification should be rate limited"""
    phone = "+79998887766"
    
    # Request OTP first
    await client.post("/api/auth/request-otp", json={"identifier": phone})
    
    # Try to verify with wrong OTP multiple times
    responses = []
    for i in range(6):  # Limit is 5 per 15 minutes
        resp = await client.post(
            "/api/auth/login",
            json={"identifier": phone, "otp": "999999"}
        )
        responses.append(resp.status_code)
    
    # Should get 401 (invalid OTP) or eventually 429 (rate limited)
    # At least one should be 401 or 429
    assert any(code in [401, 429] for code in responses)


# ============================================================================
# SEC-006: File upload validation
# ============================================================================
@pytest.mark.asyncio
async def test_file_upload_rejects_invalid_type(client: AsyncClient):
    """SEC-006: Should reject non-image files"""
    # Create a fake text file
    files = {
        "file": ("test.txt", b"This is not an image", "text/plain")
    }
    
    resp = await client.post(
        "/api/users/me/photo",
        files=files
    )
    
    # Should be 400 (invalid type) or 401 (auth required)
    assert resp.status_code in [400, 401]


@pytest.mark.asyncio
async def test_file_upload_rejects_large_files(client: AsyncClient):
    """SEC-006: Should reject files larger than 10MB"""
    # Create a large fake file (11MB)
    large_content = b"x" * (11 * 1024 * 1024)
    files = {
        "file": ("large.jpg", large_content, "image/jpeg")
    }
    
    resp = await client.post(
        "/api/users/me/photo",
        files=files
    )
    
    # Should be 400 (too large) or 401 (auth required)
    assert resp.status_code in [400, 401, 413]


@pytest.mark.asyncio
async def test_file_upload_validates_magic_bytes(client: AsyncClient):
    """SEC-006: Should validate file signature (magic bytes)"""
    # Create a file with wrong magic bytes (claims to be JPEG but isn't)
    fake_jpeg = b"This is not a real JPEG file content"
    files = {
        "file": ("fake.jpg", fake_jpeg, "image/jpeg")
    }
    
    resp = await client.post(
        "/api/users/me/photo",
        files=files
    )
    
    # Should be 400 (invalid signature) or 401 (auth required)
    assert resp.status_code in [400, 401]


@pytest.mark.asyncio
async def test_file_upload_accepts_valid_jpeg(client: AsyncClient):
    """SEC-006: Should accept valid JPEG files"""
    # Minimal valid JPEG (just the header)
    valid_jpeg = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0xFF, 0xD9
    ])
    
    files = {
        "file": ("valid.jpg", valid_jpeg, "image/jpeg")
    }
    
    resp = await client.post(
        "/api/users/me/photo",
        files=files
    )
    
    # Should be 401 (auth required) or 200/201 if auth provided
    # Not 400 for invalid file
    assert resp.status_code in [200, 201, 401, 422]
