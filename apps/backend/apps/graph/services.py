"""Neo4j graph database integration service."""

import logging
from typing import Optional, Any, Dict, List
from django.conf import settings
from neo4j import GraphDatabase, Driver
from apps.common.services import BaseService

logger = logging.getLogger("apps.graph")


class GraphService(BaseService[Any]):
    """Service handling connections and graph interactions with Neo4j database."""

    _driver: Optional[Driver] = None

    def __init__(self) -> None:
        """Initialize Neo4j connection parameters."""
        super().__init__()
        self.uri = settings.NEO4J_URI
        self.username = settings.NEO4J_USERNAME
        self.password = settings.NEO4J_PASSWORD

    def get_driver(self) -> Driver:
        """Retrieve or create the thread-safe Neo4j driver instance."""
        if self._driver is None:
            try:
                self._driver = GraphDatabase.driver(
                    self.uri, auth=(self.username, self.password)
                )
                self.log_info("Successfully initialized Neo4j driver connection pool.")
            except Exception as exc:
                self.log_error("Failed to connect to Neo4j database: %s", str(exc))
                raise
        return self._driver

    def check_connection(self) -> bool:
        """Verify that Neo4j is online and credentials are valid."""
        try:
            driver = self.get_driver()
            driver.verify_connectivity()
            return True
        except Exception as exc:
            self.log_error("Neo4j database connection check failed: %s", str(exc))
            return False

    def close(self) -> None:
        """Close driver session connection pools cleanly."""
        if self._driver is not None:
            self._driver.close()
            self._driver = None
            self.log_info("Closed Neo4j driver connection pool.")

    def sync_decision_to_graph(self, decision: Any) -> None:
        """Atomically merge the decision node, adjacent entities, and relationships in Neo4j."""
        driver = self.get_driver()
        
        main_query = """
        // 1. Merge Repository
        MERGE (r:Repository {id: $repo_id})
        ON CREATE SET r.name = $repo_name, r.updated_at = timestamp()
        ON MATCH SET r.name = $repo_name, r.updated_at = timestamp()

        // 2. Merge Decision
        MERGE (d:Decision {id: $decision_id})
        SET d.title = $title,
            d.status = $status,
            d.rationale = $rationale,
            d.updated_at = timestamp()

        MERGE (d)-[:BELONGS_TO]->(r)

        // 3. Optional Developer
        WITH r, d
        UNWIND case when $developer_name <> "" then [$developer_name] else [] end as dev_name
        MERGE (dev:Developer {name: dev_name})
        MERGE (d)-[:AUTHORED_BY]->(dev)

        // 4. Optional Module
        WITH r, d
        UNWIND case when $module_name <> "" then [$module_name] else [] end as mod_name
        MERGE (mod:Module {name: mod_name})
        MERGE (mod)-[:BELONGS_TO]->(r)
        MERGE (d)-[:AFFECTS]->(mod)

        // 5. Optional ADR
        WITH r, d
        UNWIND case when $adr_source <> "" then [$adr_source] else [] end as adr_src
        MERGE (adr:ADR {source: adr_src})
        MERGE (adr)-[:BELONGS_TO]->(r)
        MERGE (d)-[:DOCUMENTED_IN]->(adr)

        // 6. Optional Commit
        WITH r, d
        UNWIND case when $commit_hash <> "" then [$commit_hash] else [] end as c_hash
        MERGE (c:Commit {hash: c_hash})
        MERGE (c)-[:BELONGS_TO]->(r)
        MERGE (d)-[:INTRODUCED_IN]->(c)

        // 7. Optional PR
        WITH r, d
        UNWIND case when $pr_number <> "" then [$pr_number] else [] end as pr_num
        MERGE (pr:PR {number: pr_num})
        MERGE (pr)-[:BELONGS_TO]->(r)
        MERGE (d)-[:LINKED_TO]->(pr)

        // 8. Optional Incident
        WITH r, d
        UNWIND case when $incident_key <> "" then [$incident_key] else [] end as inc_key
        MERGE (inc:Incident {key: inc_key})
        MERGE (inc)-[:BELONGS_TO]->(r)
        MERGE (d)-[:MITIGATES]->(inc)

        // 9. Optional Superseded Decision
        WITH r, d
        UNWIND case when $superseded_by_id is not null then [$superseded_by_id] else [] end as old_dec_id
        MERGE (old:Decision {id: old_dec_id})
        MERGE (old)-[:SUPERSEDED_BY]->(d)
        """

        repo = decision.repository
        params = {
            "repo_id": str(repo.id),
            "repo_name": repo.name,
            "decision_id": str(decision.id),
            "title": decision.title,
            "status": decision.status,
            "rationale": decision.rationale or "",
            "developer_name": decision.developer_name or "",
            "module_name": decision.module_name or "",
            "adr_source": decision.adr_source or "",
            "commit_hash": decision.commit_hash or "",
            "pr_number": decision.pr_number or "",
            "incident_key": decision.incident_key or "",
            "superseded_by_id": str(decision.superseded_by.id) if decision.superseded_by else None,
        }

        try:
            with driver.session() as session:
                session.run(main_query, **params)

                # Sync constraints
                for constraint in decision.constraints.all():
                    session.run(
                        """
                        MATCH (d:Decision {id: $decision_id})
                        MERGE (c:Constraint {text: $text})
                        MERGE (d)-[:CONSTRAINED_BY]->(c)
                        """,
                        decision_id=str(decision.id),
                        text=constraint.constraint_text,
                    )

                # Sync alternatives
                for alternative in decision.alternatives.all():
                    session.run(
                        """
                        MATCH (d:Decision {id: $decision_id})
                        MERGE (a:Alternative {text: $text})
                        MERGE (d)-[:HAS_ALTERNATIVE]->(a)
                        """,
                        decision_id=str(decision.id),
                        text=alternative.alternative_text,
                    )
            self.log_info("Successfully synchronized decision %s to Neo4j graph.", str(decision.id))
        except Exception as exc:
            self.log_error("Failed to sync decision %s to Neo4j graph: %s", str(decision.id), str(exc))

    def get_full_graph(self, workspace_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """Query and build a React Flow nodes & edges snapshot representation for the workspace."""
        driver = self.get_driver()
        nodes: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []

        query = """
        MATCH (r:Repository) WHERE r.id IN $repo_ids
        MATCH (n) WHERE (n)-[:BELONGS_TO|AFFECTS|AUTHORED_BY|CONSTRAINED_BY|HAS_ALTERNATIVE|SUPERSEDED_BY|MITIGATES|DOCUMENTED_IN|INTRODUCED_IN|LINKED_TO*0..3]-(r)
        OPTIONAL MATCH (n)-[rel]->(m) WHERE (m)-[:BELONGS_TO|AFFECTS|AUTHORED_BY|CONSTRAINED_BY|HAS_ALTERNATIVE|SUPERSEDED_BY|MITIGATES|DOCUMENTED_IN|INTRODUCED_IN|LINKED_TO*0..3]-(r)
        RETURN n, rel, m
        """

        # Resolve repo IDs in workspace from Django ORM repository metadata context
        from apps.repositories.models import Repository
        repo_ids = [str(r.id) for r in Repository.objects.filter(workspace_id=workspace_id)]

        if not repo_ids:
            return {"nodes": [], "edges": []}

        try:
            with driver.session() as session:
                result = session.run(query, repo_ids=repo_ids)

                for record in result:
                    n_node = record.get("n")
                    m_node = record.get("m")
                    rel = record.get("rel")

                    # Add node n
                    if n_node:
                        labels = list(n_node.labels)
                        label_type = labels[0] if labels else "Unknown"
                        
                        # Determine unique ID and display label
                        if label_type == "Decision":
                            node_id = f"Decision:{n_node.get('id')}"
                            node_label = n_node.get("title")
                        elif label_type == "Repository":
                            node_id = f"Repository:{n_node.get('id')}"
                            node_label = n_node.get("name")
                        elif label_type == "Developer":
                            node_id = f"Developer:{n_node.get('name')}"
                            node_label = n_node.get("name")
                        elif label_type == "Module":
                            node_id = f"Module:{n_node.get('name')}"
                            node_label = n_node.get("name")
                        elif label_type == "Constraint":
                            node_id = f"Constraint:{hash(n_node.get('text'))}"
                            node_label = n_node.get("text")
                        elif label_type == "Alternative":
                            node_id = f"Alternative:{hash(n_node.get('text'))}"
                            node_label = n_node.get("text")
                        elif label_type == "ADR":
                            node_id = f"ADR:{n_node.get('source')}"
                            node_label = n_node.get("source")
                        elif label_type == "Commit":
                            node_id = f"Commit:{n_node.get('hash')}"
                            node_label = n_node.get("hash")[:7]
                        elif label_type == "PR":
                            node_id = f"PR:{n_node.get('number')}"
                            node_label = f"PR #{n_node.get('number')}"
                        elif label_type == "Incident":
                            node_id = f"Incident:{n_node.get('key')}"
                            node_label = n_node.get("key")
                        else:
                            node_id = str(n_node.element_id)
                            node_label = "Node"

                        if node_id not in nodes:
                            nodes[node_id] = {
                                "id": node_id,
                                "type": label_type,
                                "data": {"label": node_label, **dict(n_node.items())},
                            }

                    # Add node m
                    if m_node:
                        labels = list(m_node.labels)
                        label_type = labels[0] if labels else "Unknown"
                        
                        if label_type == "Decision":
                            target_id = f"Decision:{m_node.get('id')}"
                            node_label = m_node.get("title")
                        elif label_type == "Repository":
                            target_id = f"Repository:{m_node.get('id')}"
                            node_label = m_node.get("name")
                        elif label_type == "Developer":
                            target_id = f"Developer:{m_node.get('name')}"
                            node_label = m_node.get("name")
                        elif label_type == "Module":
                            target_id = f"Module:{m_node.get('name')}"
                            node_label = m_node.get("name")
                        elif label_type == "Constraint":
                            target_id = f"Constraint:{hash(m_node.get('text'))}"
                            node_label = m_node.get("text")
                        elif label_type == "Alternative":
                            target_id = f"Alternative:{hash(m_node.get('text'))}"
                            node_label = m_node.get("text")
                        elif label_type == "ADR":
                            target_id = f"ADR:{m_node.get('source')}"
                            node_label = m_node.get("source")
                        elif label_type == "Commit":
                            target_id = f"Commit:{m_node.get('hash')}"
                            node_label = m_node.get("hash")[:7]
                        elif label_type == "PR":
                            target_id = f"PR:{m_node.get('number')}"
                            node_label = f"PR #{m_node.get('number')}"
                        elif label_type == "Incident":
                            target_id = f"Incident:{m_node.get('key')}"
                            node_label = m_node.get("key")
                        else:
                            target_id = str(m_node.element_id)
                            node_label = "Node"

                        if target_id not in nodes:
                            nodes[target_id] = {
                                "id": target_id,
                                "type": label_type,
                                "data": {"label": node_label, **dict(m_node.items())},
                            }

                    # Add edge rel
                    if rel and n_node and m_node:
                        # Map source/target to resolved React Flow IDs
                        source_id = node_id
                        target_id = target_id
                        edge_id = f"edge-{source_id}-{target_id}-{rel.type}"
                        
                        edge_exists = any(e["id"] == edge_id for e in edges)
                        if not edge_exists:
                            edges.append({
                                "id": edge_id,
                                "source": source_id,
                                "target": target_id,
                                "label": rel.type,
                            })

            return {"nodes": list(nodes.values()), "edges": edges}
        except Exception as exc:
            self.log_error("Failed to query full React Flow graph representation: %s", str(exc))
            return {"nodes": [], "edges": []}

