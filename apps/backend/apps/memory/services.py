"""Cognée SDK integration configuration service."""

import os
import logging
from typing import Any, List, cast
from asgiref.sync import async_to_sync
from django.conf import settings
from apps.common.services import BaseService

logger = logging.getLogger("apps.memory")


class MemoryService(BaseService[Any]):
    """Service class encapsulating Cognée vector search and cognitive memory operations."""

    def __init__(self) -> None:
        """Initialize Cognée engine settings."""
        super().__init__()
        self.api_key = settings.COGNEE_API_KEY
        self.project_id = settings.COGNEE_PROJECT_ID
        self.volume_path = settings.COGNEE_VOLUME_PATH

    def initialize_cognee(self) -> bool:
        """Boot up Cognée SDK, creating storage directories if necessary."""
        try:
            # Set up the Cognée volume folders
            if not os.path.exists(self.volume_path):
                os.makedirs(self.volume_path, exist_ok=True)

            os.environ["COGNEE_VOLUME_PATH"] = self.volume_path

            if not self.api_key:
                self.logger.warning(
                    "Cognée API Key is missing. "
                    "Memory indexing will run in local-only mock mode."
                )
            else:
                os.environ["OPENAI_API_KEY"] = self.api_key
                self.log_info(
                    "Cognée API Key is loaded. "
                    "Cognée memory service is initialized."
                )
            return True
        except Exception as exc:
            self.log_error("Failed to initialize Cognée settings: %s", str(exc))
            return False

    def check_configuration(self) -> bool:
        """Verify settings are valid for Cognée operations."""
        return os.path.isdir(self.volume_path) or self.initialize_cognee()

    def remember_decision(self, data: str, dataset_name: str) -> Any:
        """Index raw decision text in Cognée database."""
        self.check_configuration()
        if not self.api_key:
            self.log_info("Mocked Cognée remember: data=%s, dataset=%s", data[:50], dataset_name)
            return None
        
        import cognee
        try:
            # Run async function synchronously
            return async_to_sync(cognee.remember)(data, dataset_name=dataset_name)
        except Exception as exc:
            self.log_error("Cognée remember failed: %s", str(exc))
            raise

    def recall_decisions(self, query_text: str, dataset_name: str) -> List[Any]:
        """Search memory for decision concepts using semantic retrieval."""
        self.check_configuration()
        if not self.api_key:
            self.log_info("Mocked Cognée recall query: %s", query_text)
            # Database keyword search fallback
            from apps.repositories.models import ArchitectureDecision
            decisions = ArchitectureDecision.objects.filter(
                title__icontains=query_text
            ).prefetch_related("constraints", "alternatives")
            
            results = []
            for dec in decisions:
                results.append({
                    "id": str(dec.id),
                    "title": dec.title,
                    "rationale": dec.rationale,
                    "status": dec.status,
                    "module": dec.module_name,
                    "source": dec.adr_source,
                })
            return results

        import cognee
        try:
            # Run async function recall
            return cast(List[Any], async_to_sync(cognee.recall)(query_text, datasets=[dataset_name]))
        except Exception as exc:
            self.log_error("Cognée recall failed: %s", str(exc))
            return []

    def forget_dataset(self, dataset_name: str) -> Any:
        """Clear memory indexing entries for a specific dataset scope."""
        self.check_configuration()
        if not self.api_key:
            self.log_info("Mocked Cognée forget dataset: %s", dataset_name)
            return {}
        
        import cognee
        try:
            return async_to_sync(cognee.forget)(dataset=dataset_name)
        except Exception as exc:
            self.log_error("Cognée forget failed: %s", str(exc))
            return {}

    def improve_dataset(self, dataset_name: str) -> Any:
        """Run self-improvement/cognify pipelines over the dataset."""
        self.check_configuration()
        if not self.api_key:
            self.log_info("Mocked Cognée improve dataset: %s", dataset_name)
            return None
        
        import cognee
        try:
            return async_to_sync(cognee.improve)(dataset=dataset_name)
        except Exception as exc:
            self.log_error("Cognée improve failed: %s", str(exc))
            return None

