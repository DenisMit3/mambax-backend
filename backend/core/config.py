# Re-export settings from the main config module
# This file exists for backwards compatibility with older imports
from backend.config.settings import settings

__all__ = ["settings"]
