"""Cache management and invalidation routines for Phase 12."""

import logging
from django.core.cache import cache

logger = logging.getLogger("apps.common.caching")


class CacheInvalidator:
    """Helper class coordinating caching namespace keys eviction on writes."""

    @staticmethod
    def invalidate_workspace_cache(workspace_id: str) -> None:
        """Clear visual graph nodes and dashboard analytics aggregates cached in Redis."""
        logger.info("Evicting workspace caching namespace entries for %s", workspace_id)
        
        # Invalidate visual graph key
        graph_key = f"workspace_graph_{workspace_id}"
        cache.delete(graph_key)
        
        # Invalidate dashboard summary key
        analytics_key = f"workspace_analytics_summary_{workspace_id}"
        cache.delete(analytics_key)
        
        logger.info(
            "Cache namespace evicted successfully for workspace %s.", workspace_id
        )
