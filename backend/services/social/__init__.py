# Social services package

from backend.services.social.profile_views import (
    record_profile_view,
    get_who_viewed_me,
    get_view_count,
    get_view_stats
)

from backend.services.social.prompts import (
    get_available_prompts,
    get_prompt_by_id,
    get_user_prompts,
    save_prompt_answer,
    delete_prompt_answer,
    reorder_prompts,
    get_prompts_for_profile
)

from backend.services.social.stories import (
    create_story,
    get_stories_feed,
    view_story,
    react_to_story,
    get_story_viewers,
    delete_story,
    cleanup_expired_stories,
    get_my_stories
)

from backend.services.social.spotlight import (
    get_spotlight_profiles,
    join_spotlight,
    record_spotlight_click,
    get_spotlight_stats,
    add_to_spotlight_by_admin,
    add_to_spotlight_by_algorithm,
    cleanup_expired_spotlight
)

from backend.services.social.compatibility import (
    calculate_compatibility,
    invalidate_compatibility_cache
)

from backend.services.social.preferences import (
    get_matching_preferences,
    update_matching_preferences,
    set_dealbreaker,
    reset_preferences,
    get_preference_suggestions,
    PREFERENCE_SCHEMA
)

from backend.services.social.events import (
    get_events,
    get_event_details,
    register_for_event,
    cancel_registration,
    get_my_events,
    create_event
)

__all__ = [
    # Profile Views
    "record_profile_view",
    "get_who_viewed_me",
    "get_view_count",
    "get_view_stats",
    # Prompts
    "get_available_prompts",
    "get_prompt_by_id",
    "get_user_prompts",
    "save_prompt_answer",
    "delete_prompt_answer",
    "reorder_prompts",
    "get_prompts_for_profile",
    # Stories
    "create_story",
    "get_stories_feed",
    "view_story",
    "react_to_story",
    "get_story_viewers",
    "delete_story",
    "cleanup_expired_stories",
    "get_my_stories",
    # Spotlight
    "get_spotlight_profiles",
    "join_spotlight",
    "record_spotlight_click",
    "get_spotlight_stats",
    "add_to_spotlight_by_admin",
    "add_to_spotlight_by_algorithm",
    "cleanup_expired_spotlight",
    # Compatibility
    "calculate_compatibility",
    "invalidate_compatibility_cache",
    # Preferences
    "get_matching_preferences",
    "update_matching_preferences",
    "set_dealbreaker",
    "reset_preferences",
    "get_preference_suggestions",
    "PREFERENCE_SCHEMA",
    # Events
    "get_events",
    "get_event_details",
    "register_for_event",
    "cancel_registration",
    "get_my_events",
    "create_event",
]
