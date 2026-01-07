# Project Libraries & Tech Stack Definition

Based on the architectural requirements defined in `design_specification.md`, here is the approved list of libraries and technologies to be used.

## 1. Backend Infrastructure
### Primary Core: Go (Golang)
*Used for: High-load API Gateway, Matching Engine, WebSocket Chat, User Presence.*
*   **Web Framework**: `Echo` or `Chi` (Lightweight, high performance).
*   **gRPC**: `google.golang.org/grpc` (Inter-service communication).
*   **WebSockets**: `Melody` or `Gorilla WebSocket`.
*   **Database Access**: `pgx` (High-performance PostgreSQL driver) or `sqlc` (Type-safe SQL).
*   **Validation**: `go-playground/validator`.

### AI & Logic Layer: Python
*Used for: Recommendation Algorithms, Content Moderation, Complex Business Logic.*
*   **Framework**: `FastAPI` (Async, modern).
*   **AI/ML**: `LangChain`, `PyTorch` (for local models), `scikit-learn`.
*   **Tasks**: `Celery` + `Redis` (Background jobs).
*   **Database Access**: `SQLAlchemy` (Async session).
*   **Vector Search Client**: `qdrant-client` or `pymilvus`.

## 2. Frontend (Web)
*   **Core**: `Next.js 14` (App Router) + `TypeScript`.
*   **State Management**: `Zustand` (Global state) + `TanStack Query` (Server state/caching).
*   **Styling**: `Vanilla CSS` (CSS Modules/Variables) - *Strict adherence to design system*.
*   **UI Primitives**: `Radix UI` (Headless accessible components).
*   **Animations**: `Framer Motion` (Complex interactions) + CSS Transitions.
*   **Forms**: `React Hook Form` + `Zod` (Schema validation).
*   **Media**: `Sharp` (Image optimization), `FFmpeg.wasm` (Client-side video preview).

## 3. Mobile (Flutter)
*   **Framework**: `Flutter` (Dart).
*   **State Management**: `Bloc` or `Riverpod`.
*   **Networking**: `Dio` (HTTP client with interceptors).
*   **Local Storage**: `Hive` (Fast NoSQL DB).
*   **WebRTC**: `flutter_webrtc` (Video calls).

## 4. Data & Storage
*   **Relational DB**: `PostgreSQL 16` (Partitioning, JSONB support).
*   **NoSQL / Cache**: `Redis Stack` (Caching + simple vector search option).
*   **Time-Series**: `ScyllaDB` (Chat history storage - optimized for writes).
*   **Search**: `Elasticsearch` or `Meilisearch` (User profile search).
*   **Object Storage**: `MinIO` (S3 compatible - for dev) / `AWS S3` (Prod).

## 5. DevOps & Tools
*   **Containerization**: `Docker` + `Docker Compose`.
*   **CI/CD**: `GitHub Actions` or `GitLab CI`.
*   **Monitoring**: `Prometheus` + `Grafana`.
*   **Logging**: `ELK Stack` (Elastic, Logstash, Kibana) or `Loki`.
*   **Reverse Proxy**: `Nginx` or `Traefik`.
