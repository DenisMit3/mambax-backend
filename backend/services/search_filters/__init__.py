"""
Search Filters Package
======================
Реэкспорт всех публичных символов для обратной совместимости.
"""

from backend.services.search_filters.schemas import (
    SearchFilters,
    FilterOption,
    GENDER_OPTIONS,
    SMOKING_OPTIONS,
    DRINKING_OPTIONS,
    EDUCATION_OPTIONS,
    LOOKING_FOR_OPTIONS,
    CHILDREN_OPTIONS,
    INTEREST_SUGGESTIONS,
)
from backend.services.search_filters.helpers import (
    haversine_distance,
    interests_match,
    profile_to_dict,
    get_all_filter_options,
)
from backend.services.search_filters.filters import (
    get_filtered_profiles,
)

__all__ = [
    "SearchFilters",
    "FilterOption",
    "GENDER_OPTIONS",
    "SMOKING_OPTIONS",
    "DRINKING_OPTIONS",
    "EDUCATION_OPTIONS",
    "LOOKING_FOR_OPTIONS",
    "CHILDREN_OPTIONS",
    "INTEREST_SUGGESTIONS",
    "haversine_distance",
    "interests_match",
    "profile_to_dict",
    "get_all_filter_options",
    "get_filtered_profiles",
]
