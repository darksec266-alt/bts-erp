# Production Architecture — Nginx Edge & Reverse Proxy Layer

## 1. Final Architecture Decision

The recommended production architecture for the Brother's Technology System / Unified Business Management Platform is:

> **Nginx + Docker + Next.js + Express Modular Monolith + PostgreSQL + Redis + BullMQ + S3-compatible Storage**

The application architecture remains:

- Domain-Driven Design (DDD)
- Modular Monolith
- Clean / Hexagonal Architecture
- Internal Domain Events
- REST API
- PostgreSQL + Prisma
- Redis + BullMQ
- Next.js PWA
- Docker-based deployment

**Nginx is added as the Edge / Reverse Proxy / TLS layer.**

Nginx does not replace application authentication, authorization, business rules, or domain architecture.

---

## 2. High-Level Architecture

```text
                         INTERNET
                            │
                            ▼
                    ┌────────────────┐
                    │     NGINX      │
                    │ Edge / Reverse │
                    │ Proxy / TLS    │
                    └───────┬────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌────────────────┐     ┌────────────────┐
        │    Next.js     │     │   Express.js   │
        │   Web / PWA    │     │   API Server   │
        │     :3000      │     │     :4000      │
        └────────────────┘     └───────┬────────┘
                                       │
              ┌────────────────────────┼─────────────────────┐
              │                        │                     │
              ▼                        ▼                     ▼
       ┌──────────────┐        ┌──────────────┐      ┌──────────────┐
       │ PostgreSQL   │        │    Redis     │      │ S3 Storage   │
       │  Database    │        │ Cache / Queue│      │ Documents    │
       └──────────────┘        └──────┬───────┘      └──────────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │   BullMQ     │
                               │   Workers    │
                               └──────────────┘
```

---

## 3. Why Nginx

Nginx creates a clear boundary between the public Internet and application containers.

Without Nginx:

```text
Internet
   │
   ├── Next.js :3000
   └── Express :4000
```

With Nginx:

```text
Internet
   │
   ▼
 Nginx
   │
   ├── Next.js
   └── Express
```

This keeps infrastructure concerns outside the application code and makes production routing, TLS, logging, and edge protection easier to manage.

---

## 4. Nginx Responsibilities

Nginx should primarily handle:

1. Reverse proxying
2. TLS/HTTPS termination
3. HTTP connection management
4. Request size limits
5. Basic rate limiting
6. Security headers
7. Static asset delivery where appropriate
8. Host/path-based routing
9. Compression where appropriate
10. WebSocket upgrade proxying
11. Access/error logging
12. Upstream failure handling
13. Hiding internal application ports

---

## 5. What Nginx Should NOT Handle

Nginx should not contain business logic.

Do not put these responsibilities into Nginx:

- Business authorization
- RBAC decisions
- Tenant-level authorization
- Inventory validation
- Accounting rules
- Financial calculations
- Approval workflow logic
- Service-order business rules
- SKU lifecycle rules
- Domain events
- Accounting posting
- Complex application authentication

These belong to the Express application and its domain/application layers.

---

## 6. Recommended Domain Routing

Preferred production structure:

```text
https://app.example.com
https://api.example.com
```

Frontend:

```text
app.example.com
       │
       ▼
     Nginx
       │
       ▼
   Next.js :3000
```

API:

```text
api.example.com
       │
       ▼
     Nginx
       │
       ▼
   Express :4000
```

This gives a clean frontend/API boundary for the SaaS/business-management platform.

---

## 7. Alternative Same-Domain Routing

Another valid design is:

```text
https://example.com/
https://example.com/api/
```

Routing:

```text
example.com/
       │
       ▼
   Next.js

example.com/api/
       │
       ▼
   Express
```

This is simpler for smaller deployments.

For this project, however, the preferred production setup is:

```text
app.example.com
api.example.com
```

---

## 8. TLS / HTTPS

Nginx should terminate HTTPS.

```text
Client
  │
  │ HTTPS
  ▼
Nginx
  │
  │ internal HTTP
  ▼
Application containers
```

Recommended:

- TLS 1.2+
- TLS 1.3 where supported
- Automatic certificate renewal
- HTTP → HTTPS redirect
- HSTS after HTTPS is verified
- Secure cookies
- No production authentication over plain HTTP

Let's Encrypt can be used for certificates.

---

## 9. Internal Network

Application ports should not normally be exposed directly to the public Internet.

Example:

```text
Public:
80   → Nginx
443  → Nginx

Internal:
3000 → Next.js
4000 → Express
5432 → PostgreSQL
6379 → Redis
```

Docker internal networking:

```text
                  Public Network
                        │
                      Nginx
                        │
                  Docker Network
          ┌─────────────┼──────────────┐
          │             │              │
       Next.js       Express       Other services
          │             │
          └─────────────┤
                        │
                  PostgreSQL
                        │
                      Redis
```

Only Nginx should normally publish public HTTP/HTTPS ports.

---

## 10. Docker Architecture

Recommended services:

```text
docker-compose.yml

services:

  nginx
  web
  api
  worker
  postgres
  redis
```

Optional:

```text
  minio
  monitoring
  log aggregation
```

For production object storage, an external S3-compatible provider may be preferable to hosting storage on the same server.

---

## 11. Container Structure

```text
┌───────────────────────────────────────────┐
│                 NGINX                     │
│              ports 80 / 443              │
└───────────────────┬───────────────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
┌───────────────┐        ┌───────────────┐
│      web      │        │      api      │
│    Next.js    │        │   Express.js  │
│     :3000     │        │     :4000     │
└───────────────┘        └───────┬───────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
             PostgreSQL       Redis          S3
                  │              │
                  │              ▼
                  │          BullMQ
                  │              │
                  │              ▼
                  │           Worker
                  │
                  └────────────────────────────
```

---

## 12. Request Flow

### Frontend request

```text
Browser
   │
   │ GET /
   ▼
Nginx
   │
   │ proxy_pass
   ▼
Next.js
   │
   ▼
Response
```

### API request

```text
Browser
   │
   │ POST /api/v1/inventory/items
   ▼
Nginx
   │
   ▼
Express
   │
   ├── Authentication
   ├── Tenant resolution
   ├── RBAC
   ├── Validation
   ├── Use Case
   ├── Domain Logic
   ├── Transaction
   └── Database
```

---

## 13. WebSocket / Realtime

The platform may use Socket.IO or SSE.

Nginx must proxy long-lived connections correctly.

```text
Browser
   │
   ▼
Nginx
   │
   ▼
Express / Socket.IO
   │
   ▼
Realtime events
```

Possible realtime features:

- Notifications
- Approval status
- Service-order status
- Technician status
- Inventory updates
- Dashboard refresh
- Background job status

---

## 14. Rate Limiting

Nginx can provide first-layer rate limiting.

Suggested policy:

```text
Public API:
    moderate request rate

Authentication endpoints:
    strict rate limit

File upload:
    request-size limit

Private API:
    application-level authorization
```

Nginx rate limiting is only infrastructure-level protection.

The application must still enforce:

```text
Nginx
  ↓
Rate limiting
  ↓
Express
  ↓
Authentication
  ↓
RBAC
  ↓
Tenant scope
  ↓
Business authorization
```

---

## 15. Request Body / Upload Limits

The platform may upload:

- invoices
- bank transaction proof
- service documents
- employee documents
- customer documents
- product images
- attachments

Nginx should enforce a controlled maximum request size.

Conceptual example:

```nginx
client_max_body_size 25M;
```

The exact limit should follow business requirements.

Application-level validation must still check:

- MIME type
- Extension
- File signature
- File size
- Malicious content
- Storage path
- Authorization

---

## 16. Security Headers

Nginx can add baseline HTTP security headers such as:

```text
Strict-Transport-Security
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Content-Security-Policy
Permissions-Policy
```

CSP should be designed for the actual Next.js application rather than copied blindly.

---

## 17. Authentication

Preferred flow:

```text
Browser
   │
   ▼
Nginx
   │
   ▼
Express
   │
   ├── Access token validation
   ├── Refresh token rotation
   ├── User lookup
   ├── Tenant lookup
   └── Authorization
```

Nginx may block abusive traffic, but it should not become the source of truth for application identity.

---

## 18. Multi-Tenancy

Tenant isolation must be enforced by the backend.

```text
Request
   │
   ▼
Express
   │
   ▼
Authenticated User
   │
   ▼
Tenant Context
   │
   ▼
RBAC + Row-Level Scope
   │
   ▼
Prisma Query
```

Nginx should not decide which tenant can access database rows.

---

## 19. Database Security

PostgreSQL must never be publicly exposed.

Bad:

```text
Internet
   │
   ▼
:5432
```

Correct:

```text
Internet
   │
   ▼
Nginx
   │
   ▼
Express
   │
   ▼
PostgreSQL
```

PostgreSQL should only be reachable from trusted internal networks/services.

---

## 20. Redis Security

Redis should also not be publicly exposed.

Correct:

```text
Express
   │
   ▼
Redis
   │
   ▼
BullMQ Worker
```

No public Redis port should be required.

---

## 21. Background Worker

Long-running jobs should not block API requests.

```text
Express API
    │
    │ enqueue
    ▼
  Redis
    │
    ▼
 BullMQ
    │
    ▼
 Worker
```

Examples:

- PDF generation
- CSV/XLSX export
- Email
- SMS
- Notifications
- Large reports
- Document processing
- Scheduled tasks
- Reconciliation jobs

Nginx does not directly manage these jobs.

---

## 22. File Upload Architecture

Recommended:

```text
Client
   │
   ▼
Nginx
   │
   ▼
Express
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   └── Storage
           │
           ▼
      S3-compatible storage
```

For larger files, presigned upload URLs can be used:

```text
Client
   │
   ▼
Express
   │
   └── Generate presigned URL
             │
             ▼
           S3
```

---

## 23. Logging

Nginx should produce access/error logs.

Useful fields:

```text
timestamp
request_id
client IP
host
method
URI
status
request time
upstream response time
user agent
```

Application logs should additionally include:

```text
requestId
tenantId
userId
module
useCase
action
result
error
```

A shared correlation ID should ideally travel through:

```text
Client
  ↓
Nginx
  ↓
Express
  ↓
Worker
  ↓
External integrations
```

---

## 24. Health Checks

Recommended endpoints:

```text
GET /health
GET /health/live
GET /health/ready
```

Conceptually:

```text
Liveness:
    Is the process alive?

Readiness:
    Can the application serve requests?

Deep health:
    PostgreSQL?
    Redis?
    Required dependencies?
```

Nginx is not a replacement for application health checks.

---

## 25. Failure Handling

If Next.js fails:

```text
Nginx
  │
  └── Next.js unavailable
```

API may still operate.

If Express fails:

```text
Nginx
  │
  └── API unavailable
```

Frontend may still serve some pages depending on application behavior.

If PostgreSQL fails:

```text
Express
   │
   └── database unavailable
```

Application readiness should reflect this appropriately.

---

## 26. Deployment Architecture

Initial production server:

```text
Ubuntu Server
      │
      ├── Docker
      │
      └── Docker Compose
             │
             ├── Nginx
             ├── Next.js
             ├── Express
             ├── Worker
             ├── PostgreSQL
             └── Redis
```

For larger deployments:

```text
                    Load Balancer
                         │
              ┌──────────┴──────────┐
              │                     │
           Nginx 1               Nginx 2
              │                     │
        ┌─────┴─────┐         ┌─────┴─────┐
        │           │         │           │
       Web         API       Web         API
        │           │         │           │
        └───────────┴─────────┴───────────┘
                         │
                    PostgreSQL
                         │
                       Redis
```

Scale only when actual load requires it.

---

## 27. Development vs Production

Local development can remain simple:

```text
localhost:3000 → Next.js
localhost:4000 → Express
```

Production/staging:

```text
app.example.com
api.example.com
       │
       ▼
     Nginx
```

Recommended workflow:

- Keep development simple.
- Use Nginx in staging.
- Use Nginx in production.
- Test production-like routing before release.

---

## 28. Repository Structure

```text
/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── db/
│   ├── shared-types/
│   ├── ui/
│   ├── export-engine/
│   └── config/
│
├── infra/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── app.conf
│   │   │   └── api.conf
│   │   └── snippets/
│   │       ├── security-headers.conf
│   │       └── proxy-common.conf
│   │
│   ├── docker/
│   └── scripts/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── docs/
```

---

## 29. Nginx Configuration Philosophy

Nginx configuration should be:

- Version controlled
- Reviewed
- Environment aware
- Minimal
- Documented
- Tested before deployment

Never put application secrets directly into Nginx configuration.

---

## 30. Conceptual Nginx Configuration

Frontend:

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;

    location / {
        proxy_pass http://web:3000;
    }
}
```

API:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    location / {
        proxy_pass http://api:4000;
    }
}
```

This is conceptual only.

Production configuration must additionally address:

- TLS
- Security headers
- Timeouts
- WebSocket support
- Request limits
- Rate limiting
- Logging
- Upstream behavior
- Certificate management

---

## 31. Proxy Headers

Nginx should forward relevant original request information.

Typical headers:

```text
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
```

Express must be configured correctly for trusted proxy behavior.

Do not blindly trust forwarded headers from untrusted clients.

---

## 32. Timeout Strategy

Different endpoints need different timeout policies.

Normal API:

```text
short/medium timeout
```

Large report:

```text
prefer async job
```

File upload:

```text
controlled longer timeout
```

Realtime:

```text
long-lived connection
```

Do not solve slow business operations by increasing every Nginx timeout.

Instead:

```text
Slow operation
     ↓
BullMQ
     ↓
Worker
     ↓
Result
```

---

## 33. Static Assets

Next.js can handle application assets.

Nginx may optionally serve truly static files directly if profiling shows a benefit.

Do not introduce unnecessary complexity.

Recommended first approach:

```text
Nginx
  ↓
Next.js
```

A CDN/direct static delivery layer can be introduced later when justified.

---

## 34. Caching

Nginx can cache selected public/static resources.

Do not blindly cache authenticated API responses.

Never accidentally cache private tenant-specific information such as:

- Financial data
- Customer information
- Employee data
- Inventory records
- Account information
- Private reports

Caching strategy must be explicit.

---

## 35. Security Boundary

```text
                    UNTRUSTED
                       │
                       ▼
                ┌──────────────┐
                │    NGINX     │
                │ Edge Layer   │
                └──────┬───────┘
                       │
                  TRUST BOUNDARY
                       │
                       ▼
                ┌──────────────┐
                │   Express    │
                │ Application  │
                └──────┬───────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Domain / UseCase│
              └────────┬────────┘
                       │
                       ▼
                  PostgreSQL
```

---

## 36. Nginx Is Not the Business API Gateway

For this project, Nginx is best considered:

> **Edge Reverse Proxy**

It should not evolve into a complicated custom gateway containing business logic.

If the platform later becomes a large distributed system, a dedicated API gateway/service mesh can be evaluated.

At the current architecture stage, that complexity is unnecessary.

---

## 37. Why Not Microservices Immediately

The project should not become this from day one:

```text
Nginx
 │
 ├── Inventory Service
 ├── Sales Service
 ├── Finance Service
 ├── HR Service
 ├── Procurement Service
 ├── Service Service
 ├── Notification Service
 ├── Customer Service
 └── Reporting Service
```

That would introduce:

- Distributed transactions
- Network failures
- Service discovery
- Deployment complexity
- Observability complexity
- Duplicated infrastructure
- Difficult local development

Instead:

```text
Nginx
   │
   ▼
Express Modular Monolith
   │
   ├── Inventory
   ├── Sales
   ├── Procurement
   ├── Finance
   ├── HR
   ├── Service
   ├── Customer
   └── Reporting
```

This is the recommended initial architecture.

---

## 38. Future Scaling Path

Initial:

```text
Nginx
   ↓
Express Modular Monolith
```

Later:

```text
Nginx
   │
   ├── Main API
   ├── Reporting Service
   ├── Notification Service
   └── File/Media Service
```

Only extract a module when there is a real reason.

Possible triggers:

- Independent scaling requirement
- Independent deployment requirement
- High resource consumption
- Clear bounded context
- Operational isolation requirement
- Team ownership boundary
- External integration isolation

---

## 39. Recommended Production Stack

| Layer | Technology |
|---|---|
| Edge | **Nginx** |
| TLS | Let's Encrypt / managed certificate |
| Frontend | Next.js + TypeScript |
| Backend | Express.js + TypeScript |
| Architecture | Modular Monolith |
| Design | DDD + Clean / Hexagonal |
| API | REST |
| Internal communication | Domain Events |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Queue | BullMQ |
| Worker | Node.js / TypeScript |
| Realtime | Socket.IO / SSE |
| Storage | S3-compatible |
| Containers | Docker |
| Orchestration | Docker Compose initially |
| Authorization | RBAC + Row-Level Scope |
| Authentication | JWT + Refresh Rotation |
| Reverse Proxy | **Nginx** |
| Monitoring | Logs + Metrics + Health Checks |

---

## 40. Golden Rules

1. **Nginx is the public entry point.**
2. **Application ports remain private whenever possible.**
3. **Nginx handles edge concerns, not business logic.**
4. **Authentication belongs to the application.**
5. **Authorization belongs to the application/domain boundary.**
6. **Tenant isolation belongs to the backend/database access layer.**
7. **PostgreSQL must not be publicly exposed.**
8. **Redis must not be publicly exposed.**
9. **Long-running jobs belong in BullMQ workers.**
10. **Large file operations should consider direct S3 uploads.**
11. **Do not cache private tenant data accidentally.**
12. **Use request correlation IDs across Nginx/API/workers.**
13. **Keep Nginx configuration version controlled.**
14. **Use HTTPS everywhere in production.**
15. **Do not introduce microservices merely because Nginx exists.**
16. **Keep the modular monolith as the initial business core.**
17. **Extract services only when there is a measurable architectural reason.**

---

# 41. Final Architecture Summary

```text
                              INTERNET
                                  │
                                  ▼
                         ┌─────────────────┐
                         │      NGINX      │
                         │                 │
                         │ Reverse Proxy   │
                         │ TLS / HTTPS     │
                         │ Rate Limiting   │
                         │ Security Layer  │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             ┌──────────────┐            ┌──────────────┐
             │   Next.js    │            │   Express    │
             │   Web / PWA  │            │ Modular      │
             │              │            │ Monolith     │
             └──────────────┘            └──────┬───────┘
                                                │
                     ┌──────────────────────────┼────────────────────────┐
                     │                          │                        │
                     ▼                          ▼                        ▼
              ┌─────────────┐            ┌─────────────┐          ┌─────────────┐
              │ PostgreSQL  │            │    Redis    │          │ S3 Storage  │
              │   System    │            │ Cache/Queue │          │ Documents   │
              │   of Record │            └──────┬──────┘          └─────────────┘
              └─────────────┘                   │
                                                ▼
                                         ┌─────────────┐
                                         │   BullMQ    │
                                         │   Workers   │
                                         └─────────────┘
```

## Final Decision

**Architecture:** Domain-Driven Modular Monolith

**Backend:** Express.js + TypeScript

**Frontend:** Next.js + TypeScript + PWA

**Edge:** Nginx

**Reverse Proxy:** Nginx

**TLS:** Nginx + Let's Encrypt / managed certificate

**Database:** PostgreSQL + Prisma

**Cache/Queue:** Redis + BullMQ

**Background Processing:** Dedicated Worker

**Storage:** S3-compatible object storage

**Security:** JWT + RBAC + Row-Level Tenant Scoping

**Deployment:** Docker + Docker Compose initially

**Scaling:** Horizontal application scaling when required

**Future:** Selective microservice extraction only when justified

> **Nginx should be included in the architecture as the production Edge / Reverse Proxy / TLS layer. It complements the Modular Monolith architecture; it does not conflict with it.**
