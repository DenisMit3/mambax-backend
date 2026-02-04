"""
Sentry Error Tracking Integration

Enterprise-grade error monitoring and performance tracking.

Features:
- Automatic exception capture
- Performance tracing
- User context enrichment
- Environment-aware configuration
- Sensitive data filtering
- Release tracking
"""

import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps

logger = logging.getLogger(__name__)

_sentry_initialized = False


def init_sentry(
    dsn: Optional[str] = None,
    environment: str = "production",
    release: Optional[str] = None,
    traces_sample_rate: float = 0.1,
    profiles_sample_rate: float = 0.1,
    enable_tracing: bool = True
) -> bool:
    """
    Initialize Sentry SDK with production-ready configuration.
    
    Args:
        dsn: Sentry DSN (Data Source Name). If None, reads from SENTRY_DSN env var.
        environment: Environment name (production, staging, development)
        release: Release/version identifier
        traces_sample_rate: Percentage of transactions to trace (0.0 to 1.0)
        profiles_sample_rate: Percentage of transactions to profile (0.0 to 1.0)
        enable_tracing: Whether to enable performance tracing
    
    Returns:
        True if Sentry was initialized successfully
    """
    global _sentry_initialized
    
    if _sentry_initialized:
        return True
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        import os
        
        # Get DSN from parameter or environment
        sentry_dsn = dsn or os.getenv('SENTRY_DSN')
        
        if not sentry_dsn:
            logger.info("Sentry DSN not configured. Error tracking disabled.")
            return False
        
        # Get release version
        app_release = release or os.getenv('APP_VERSION') or os.getenv('GIT_COMMIT_SHA')
        
        # Configure integrations
        integrations = [
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            AsyncioIntegration(),
            LoggingIntegration(
                level=logging.WARNING,  # Capture warnings and above
                event_level=logging.ERROR  # Send events for errors and above
            ),
        ]
        
        # Add Redis integration if available
        try:
            integrations.append(RedisIntegration())
        except Exception:
            pass
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            release=app_release,
            integrations=integrations,
            
            # Performance Monitoring
            traces_sample_rate=traces_sample_rate if enable_tracing else 0.0,
            profiles_sample_rate=profiles_sample_rate if enable_tracing else 0.0,
            
            # Enable send_default_pii for user context (be careful with GDPR)
            send_default_pii=False,
            
            # Attach full stack traces
            attach_stacktrace=True,
            
            # Filter sensitive data
            before_send=_before_send_filter,
            before_send_transaction=_before_send_transaction_filter,
            
            # Error sampling (capture all errors in production)
            sample_rate=1.0,
            
            # Maximum breadcrumbs to store
            max_breadcrumbs=50,
            
            # Enable debug mode only in development
            debug=environment == "development",
            
            # Ignore certain exceptions
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
            
            # Include local variables in stack traces
            include_local_variables=True,
            
            # Request body size limit
            request_bodies="medium",  # 'small', 'medium', 'always', 'never'
        )
        
        _sentry_initialized = True
        logger.info(f"Sentry initialized: environment={environment}, release={app_release}")
        return True
        
    except ImportError:
        logger.warning("sentry-sdk not installed. Run: pip install sentry-sdk[fastapi]")
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _before_send_filter(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter and sanitize events before sending to Sentry.
    Remove sensitive data like passwords, tokens, etc.
    """
    # List of sensitive keys to redact
    sensitive_keys = {
        'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
        'authorization', 'auth', 'cookie', 'session', 'credit_card',
        'card_number', 'cvv', 'ssn', 'private_key'
    }
    
    def redact_dict(d: Dict) -> Dict:
        """Recursively redact sensitive values"""
        if not isinstance(d, dict):
            return d
        
        result = {}
        for key, value in d.items():
            key_lower = key.lower()
            
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                result[key] = '[REDACTED]'
            elif isinstance(value, dict):
                result[key] = redact_dict(value)
            elif isinstance(value, list):
                result[key] = [redact_dict(v) if isinstance(v, dict) else v for v in value]
            else:
                result[key] = value
        
        return result
    
    # Redact request data
    if 'request' in event:
        if 'data' in event['request']:
            event['request']['data'] = redact_dict(event['request'].get('data', {}))
        if 'headers' in event['request']:
            event['request']['headers'] = redact_dict(event['request'].get('headers', {}))
    
    # Redact extra data
    if 'extra' in event:
        event['extra'] = redact_dict(event['extra'])
    
    return event


def _before_send_transaction_filter(
    event: Dict[str, Any],
    hint: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Filter transactions before sending.
    Can be used to drop noisy or unwanted transactions.
    """
    # Drop health check transactions
    transaction_name = event.get('transaction', '')
    
    noisy_endpoints = [
        '/health',
        '/healthz',
        '/ready',
        '/metrics',
        '/favicon.ico',
        '/robots.txt',
    ]
    
    for endpoint in noisy_endpoints:
        if transaction_name.endswith(endpoint):
            return None
    
    return event


def set_user_context(
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None
) -> None:
    """
    Set user context for error tracking.
    Call this after user authentication.
    """
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        
        user_data = {}
        if user_id:
            user_data['id'] = user_id
        if email:
            user_data['email'] = email
        if username:
            user_data['username'] = username
        if ip_address:
            user_data['ip_address'] = ip_address
        if extra:
            user_data.update(extra)
        
        if user_data:
            sentry_sdk.set_user(user_data)
            
    except Exception as e:
        logger.debug(f"Failed to set Sentry user context: {e}")


def clear_user_context() -> None:
    """Clear user context (call on logout)"""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        sentry_sdk.set_user(None)
    except Exception:
        pass


def add_breadcrumb(
    message: str,
    category: str = "custom",
    level: str = "info",
    data: Optional[Dict[str, Any]] = None
) -> None:
    """
    Add a breadcrumb for debugging.
    Breadcrumbs are included with error events.
    """
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        
        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data
        )
    except Exception:
        pass


def capture_exception(
    error: Exception,
    extra: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None
) -> Optional[str]:
    """
    Manually capture an exception.
    Returns the Sentry event ID.
    """
    if not _sentry_initialized:
        return None
    
    try:
        import sentry_sdk
        
        with sentry_sdk.push_scope() as scope:
            if extra:
                for key, value in extra.items():
                    scope.set_extra(key, value)
            if tags:
                for key, value in tags.items():
                    scope.set_tag(key, value)
            
            return sentry_sdk.capture_exception(error)
            
    except Exception as e:
        logger.debug(f"Failed to capture exception in Sentry: {e}")
        return None


def capture_message(
    message: str,
    level: str = "info",
    extra: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None
) -> Optional[str]:
    """
    Capture a message (not an exception).
    Useful for logging important events.
    """
    if not _sentry_initialized:
        return None
    
    try:
        import sentry_sdk
        
        with sentry_sdk.push_scope() as scope:
            if extra:
                for key, value in extra.items():
                    scope.set_extra(key, value)
            if tags:
                for key, value in tags.items():
                    scope.set_tag(key, value)
            
            return sentry_sdk.capture_message(message, level=level)
            
    except Exception:
        return None


def set_tag(key: str, value: str) -> None:
    """Set a global tag for all events"""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        sentry_sdk.set_tag(key, value)
    except Exception:
        pass


def set_context(name: str, data: Dict[str, Any]) -> None:
    """Set a context (structured data) for all events"""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        sentry_sdk.set_context(name, data)
    except Exception:
        pass


def sentry_traced(
    operation: str = "function",
    description: Optional[str] = None
) -> Callable:
    """
    Decorator to add Sentry tracing to a function.
    
    Usage:
        @sentry_traced(operation="db.query", description="Fetch users")
        async def get_users():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not _sentry_initialized:
                return await func(*args, **kwargs)
            
            try:
                import sentry_sdk
                
                with sentry_sdk.start_span(
                    op=operation,
                    description=description or func.__name__
                ):
                    return await func(*args, **kwargs)
            except Exception:
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not _sentry_initialized:
                return func(*args, **kwargs)
            
            try:
                import sentry_sdk
                
                with sentry_sdk.start_span(
                    op=operation,
                    description=description or func.__name__
                ):
                    return func(*args, **kwargs)
            except Exception:
                return func(*args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


import asyncio  # Import at module level for decorator


# ============================================
# FASTAPI MIDDLEWARE INTEGRATION
# ============================================

def get_sentry_middleware(app):
    """
    Get Sentry middleware for FastAPI.
    This is automatically added when using FastApiIntegration.
    
    Additional middleware for custom request context.
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    
    class SentryContextMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # Add request context
            set_context("request", {
                "url": str(request.url),
                "method": request.method,
                "headers": dict(request.headers),
                "client_ip": request.client.host if request.client else None
            })
            
            # Add breadcrumb
            add_breadcrumb(
                message=f"{request.method} {request.url.path}",
                category="http",
                level="info",
                data={"url": str(request.url)}
            )
            
            response = await call_next(request)
            return response
    
    return SentryContextMiddleware


def is_sentry_enabled() -> bool:
    """Check if Sentry is initialized and enabled"""
    return _sentry_initialized
