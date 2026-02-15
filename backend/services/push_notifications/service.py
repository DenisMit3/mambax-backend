"""
Push Notification Service - FCM integration, batch sending, retry logic
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class PushProvider(str, Enum):
    FCM = "fcm"
    APNS = "apns"
    WEB_PUSH = "web_push"


class NotificationPriority(str, Enum):
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class PushNotificationResult:
    """Result of a push notification send attempt"""
    def __init__(
        self,
        success: bool,
        message_id: Optional[str] = None,
        error: Optional[str] = None,
        provider: Optional[str] = None
    ):
        self.success = success
        self.message_id = message_id
        self.error = error
        self.provider = provider
        self.timestamp = datetime.utcnow()


class PushNotificationService:
    """
    Professional Push Notification Service with FCM integration.
    
    Features:
    - Firebase Cloud Messaging integration
    - Batch sending (up to 500 per batch per FCM limits)
    - Automatic retry with exponential backoff
    - Delivery tracking
    - Topic-based messaging
    - Conditional targeting
    """
    
    def __init__(self):
        self._firebase_app = None
        self._initialized = False
        self._max_batch_size = 500  # FCM limit
        self._max_retries = 3
        self._base_delay = 1.0  # seconds
        
    async def initialize(self) -> bool:
        """Initialize Firebase Admin SDK"""
        if self._initialized:
            return True
            
        try:
            import firebase_admin
            from firebase_admin import credentials
            from backend.config.settings import settings
            
            creds_path = settings.FIREBASE_CREDENTIALS
            if not creds_path:
                logger.warning("Firebase credentials not configured. Push notifications disabled.")
                return False
            
            try:
                cred = credentials.Certificate(creds_path)
            except (FileNotFoundError, ValueError):
                try:
                    cred_dict = json.loads(creds_path)
                    cred = credentials.Certificate(cred_dict)
                except json.JSONDecodeError:
                    logger.error("Invalid Firebase credentials format")
                    return False
            
            self._firebase_app = firebase_admin.initialize_app(cred)
            self._initialized = True
            logger.info("Firebase Admin SDK initialized successfully")
            return True
            
        except ImportError:
            logger.warning("firebase-admin package not installed. Run: pip install firebase-admin")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            return False
    
    async def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None,
        priority: NotificationPriority = NotificationPriority.HIGH,
        ttl: int = 86400
    ) -> PushNotificationResult:
        """Send push notification to a single device token"""
        
        if not await self.initialize():
            return PushNotificationResult(
                success=False,
                error="Push notifications not configured"
            )
        
        try:
            from firebase_admin import messaging
            
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            android_config = messaging.AndroidConfig(
                priority=priority.value,
                ttl=ttl,
                notification=messaging.AndroidNotification(
                    icon="notification_icon",
                    color="#FF6B6B",
                    sound="default",
                    click_action="OPEN_APP"
                )
            )
            
            apns_config = messaging.APNSConfig(
                headers={
                    "apns-priority": "10" if priority == NotificationPriority.HIGH else "5"
                },
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(
                            title=title,
                            body=body
                        ),
                        sound="default",
                        badge=1
                    )
                )
            )
            
            webpush_config = messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/icons/notification-icon.png",
                    image=image_url
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link="/"
                )
            )
            
            message = messaging.Message(
                notification=notification,
                data=data or {},
                token=token,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config
            )
            
            for attempt in range(self._max_retries):
                try:
                    response = messaging.send(message)
                    return PushNotificationResult(
                        success=True,
                        message_id=response,
                        provider=PushProvider.FCM.value
                    )
                except messaging.UnregisteredError:
                    return PushNotificationResult(
                        success=False,
                        error="Token unregistered",
                        provider=PushProvider.FCM.value
                    )
                except messaging.QuotaExceededError:
                    delay = self._base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                except Exception as e:
                    if attempt == self._max_retries - 1:
                        raise
                    delay = self._base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                    
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            return PushNotificationResult(
                success=False,
                error=str(e),
                provider=PushProvider.FCM.value
            )
        
        return PushNotificationResult(
            success=False,
            error="Max retries exceeded"
        )
    
    async def send_to_tokens_batch(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send push notification to multiple tokens in batches.
        FCM supports up to 500 tokens per multicast.
        """
        
        if not await self.initialize():
            return {
                "success": False,
                "error": "Push notifications not configured",
                "sent": 0,
                "failed": len(tokens)
            }
        
        if not tokens:
            return {"success": True, "sent": 0, "failed": 0}
        
        try:
            from firebase_admin import messaging
            
            total_success = 0
            total_failure = 0
            failed_tokens = []
            
            for i in range(0, len(tokens), self._max_batch_size):
                batch_tokens = tokens[i:i + self._max_batch_size]
                
                notification = messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url
                )
                
                message = messaging.MulticastMessage(
                    notification=notification,
                    data=data or {},
                    tokens=batch_tokens
                )
                
                response = messaging.send_each_for_multicast(message)
                
                total_success += response.success_count
                total_failure += response.failure_count
                
                for idx, send_response in enumerate(response.responses):
                    if not send_response.success:
                        failed_tokens.append({
                            "token": batch_tokens[idx],
                            "error": str(send_response.exception)
                        })
                
                if i + self._max_batch_size < len(tokens):
                    await asyncio.sleep(0.1)
            
            return {
                "success": True,
                "sent": total_success,
                "failed": total_failure,
                "total": len(tokens),
                "failed_tokens": failed_tokens[:100]
            }
            
        except Exception as e:
            logger.error(f"Batch push notification failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "sent": 0,
                "failed": len(tokens)
            }
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None
    ) -> PushNotificationResult:
        """Send push notification to all subscribers of a topic"""
        
        if not await self.initialize():
            return PushNotificationResult(
                success=False,
                error="Push notifications not configured"
            )
        
        try:
            from firebase_admin import messaging
            
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            message = messaging.Message(
                notification=notification,
                data=data or {},
                topic=topic
            )
            
            response = messaging.send(message)
            
            return PushNotificationResult(
                success=True,
                message_id=response,
                provider=PushProvider.FCM.value
            )
            
        except Exception as e:
            logger.error(f"Topic push failed: {e}")
            return PushNotificationResult(
                success=False,
                error=str(e),
                provider=PushProvider.FCM.value
            )
    
    async def subscribe_to_topic(self, tokens: List[str], topic: str) -> bool:
        """Subscribe device tokens to a topic"""
        
        if not await self.initialize():
            return False
            
        try:
            from firebase_admin import messaging
            
            response = messaging.subscribe_to_topic(tokens, topic)
            logger.info(f"Subscribed {response.success_count} tokens to topic '{topic}'")
            return response.success_count > 0
            
        except Exception as e:
            logger.error(f"Topic subscription failed: {e}")
            return False
    
    async def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> bool:
        """Unsubscribe device tokens from a topic"""
        
        if not await self.initialize():
            return False
            
        try:
            from firebase_admin import messaging
            
            response = messaging.unsubscribe_from_topic(tokens, topic)
            logger.info(f"Unsubscribed {response.success_count} tokens from topic '{topic}'")
            return response.success_count > 0
            
        except Exception as e:
            logger.error(f"Topic unsubscription failed: {e}")
            return False
