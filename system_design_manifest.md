# SYSTEM DESIGN MANIFEST: "GRAVITY-DATING" (High-Load Platform)

## 1. Architectural Vision & Scale
**Target Scale:** 10M+ MAU, 100k+ concurrent WebSocket connections.
**Pattern:** Event-Driven Microservices Architecture.
**Communication:** Synchronous (gRPC/Protobuf) for critical paths, Asynchronous (Kafka/NATS) for eventual consistency.
**Core Principle:** "Offline First" for mobile, "Consistency" for payments, "Availability" for matching (CAP Theorem tuning).

## 2. Domain-Driven Design (DDD) Context Map

### Core Domains
1.  **Identity & Access Management (IAM):** AuthO flows, device fingerprinting, RBAC.
2.  **UserProfile Domain:** Profile data, media content, verification status.
3.  **Discovery Domain:** Geospatial indexing (H3/S2 libraries), Filtering engine.
4.  **Interaction Domain:** Swipes processing (CQRS pattern), Matching logic.
5.  **Messaging Domain:** Real-time chat, ephemeral media, signaling for WebRTC.

### Supporting Domains
1.  **Monetization:** Subscription states, virtual currency ledger, payment gateways.
2.  **Trust & Safety:** ML-based content moderation, fraud detection, shadow-banning system.
3.  **Notifications:** Push, Email, SMS routing optimization.

## 3. Technology Stack (Polyglot Persistence)

### Backend Services
-   **High-Performance Core (Gateway, Matcher, Chat):** Golang (Echo/Fiber) or Rust (Actix).
-   **Business Logic & API:** Python (FastAPI) or Node.js (NestJS) for rapid iteration.
-   **ML & Recommendations:** Python (PyTorch/TensorFlow serving).
-   **Protocol:** gRPC (internal), GraphQL (Gateway -> Client), WebSockets (Real-time).

### Data Layer
-   **Primary (Transactional):** PostgreSQL 16+ (Partitioning by User ID/Region).
-   **High-Velocity Writes (Chat/Likes):** ScyllaDB or Cassandra (Wide-column store).
-   **Geospatial & Cache:** Redis Stack (RedisJSON + RediSearch + Geo).
-   **Vector Search (AI Matching):** Milvus or Weaviate (for embedding-based recommendations).
-   **Object Storage:** MinIO (Self-hosted) -> S3 Glacier (Cold storage).

### Infrastructure (Cloud-Native)
-   **Orchestration:** Kubernetes (K8s) via Helm Charts.
-   **Service Mesh:** Istio (Traffic management, mTLS).
-   **Event Bus:** Apache Kafka (Durable logs) or NATS JetStream.
-   **Observability:** OpenTelemetry (Otel), Jaeger (Tracing), Prometheus, Grafana.

## 4. Key Functional Requirements & Implementation Strategy

### A. The "Swipe" Engine (High Throughput)
*Pattern: CQRS (Command Query Responsibility Segregation)*
-   **Write Side:** User swipes -> API Gateway -> Kafka Topic `user.swipes`.
-   **Processor:** Go Consumer aggregates swipes. If `Mutal Like` detected -> Trigger `MatchCreated` event.
-   **Read Side:** Redis Cache stores "Daily Swipes" count and "Who Liked Me" lists for rapid UI rendering.

### B. Geo-Location & Discovery
-   **Strategy:** Use Uber's H3 Hexagonal Hierarchical Spatial Index.
-   **Implementation:** Profiles are indexed in Redis Geo using H3 indices.
-   **Query:** "Get users in H3 cells neighbor to user X" (O(1) complexity) instead of expensive PostGIS radial queries for every request.

### C. Recommendation System (Hybrid)
1.  **Rule-Based:** Hard filters (Distance < 50km, Age 20-25).
2.  **Collaborative Filtering:** Matrix Factorization based on swipe history.
3.  **Visual Similarity (AI):** CNN extracts vector embeddings from user photos. Users are recommended visually similar profiles to those they liked previously.

### D. Real-Time Chat (WebSocket Optimization)
-   **Architecture:** Stateless WebSocket Gateways connected via Redis Pub/Sub or NATS.
-   **Protocol:** Binary format (Protobuf) over WS to minimize bandwidth.
-   **Media:** Upload -> BlurHash generation -> Async Upload to S3 -> URL delivery.

## 5. Security & Anti-Fraud
-   **Liveness Detection:** 3D Face verification using mobile SDKs to prevent catfishing.
-   **Device Fingerprinting:** Block banned users by hardware ID/advertising ID.
-   **End-to-End Encryption:** Signal Protocol implementation for private chats (optional but recommended).

## 6. DevOps & Automation Guidelines for Agent
-   **IaC:** Use Terraform/OpenTofu for all infrastructure provisioning.
-   **CI/CD:** GitHub Actions with semantic versioning.
-   **Code Standards:**
    -   Strict strict types (mypy/TypeScript/Go interfaces).
    -   100% Swagger/OpenAPI 3.0 documentation auto-generation.
    -   Pre-commit hooks for linting (Ruff/GolangCI-Lint).

## 7. Roadmap for AI Agent (Execution Order)

**Step 1: The Backbone**
-   Define Protobuf schemas for all microservices contracts.
-   Setup K8s cluster structure and Terraform scripts.

**Step 2: The Data Core**
-   Design PostgreSQL Schema (Users) and ScyllaDB Schema (Events/Messages).
-   Implement Authentication Service (OIDC/JWT).

**Step 3: The Engine**
-   Build the `Geo-Service` (Go + Redis) for location updates.
-   Build the `Interaction-Service` (Kafka Consumers) for matching.

**Step 4: The Interface**
-   Generate Client SDKs from OpenAPI specs.
-   Build UI shells (Flutter).
