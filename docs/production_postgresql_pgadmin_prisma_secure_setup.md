# Production Deployment & Secure Database Administration Guide

## PostgreSQL + pgAdmin + Prisma Studio + Docker + Nginx

## 1. Purpose

This guide explains how to deploy the application as a production-oriented, cloud/VPS-based system that can be operated continuously.

The recommended architecture is:

```text
Internet
   |
   v
Nginx (Public Entry Point)
Ports: 80 / 443
   |
   +-------------------------+
   |                         |
   v                         v
Next.js Web              Express API
                              |
                              v
                     Private Docker Network
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         PostgreSQL         Redis        BullMQ Worker
              |
              +-------------------------------+
                                              |
                              Admin-only access through SSH tunnel
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                      pgAdmin                 Prisma Studio
```

The key security principle is simple:

> Only the reverse proxy should accept normal public web traffic. PostgreSQL, Redis, pgAdmin and Prisma Studio must not be directly exposed to the public internet.

---

# 2. Components and Their Responsibilities

## Nginx

Nginx is the public edge layer.

Responsibilities:

- Receive HTTP/HTTPS traffic.
- Route requests to the frontend and API.
- Terminate TLS/SSL.
- Apply security headers.
- Apply request-size limits and basic rate limiting.
- Hide internal application ports.

## Next.js

The frontend web application.

Example internal port:

```text
3000
```

## Express API

The backend responsible for:

- Authentication.
- RBAC and permissions.
- Business logic.
- Database access.
- Reporting.
- Integrations.

Example internal port:

```text
4000
```

## PostgreSQL

The primary relational database.

It stores critical business data such as:

- Users.
- Customers.
- Products.
- Inventory.
- Invoices.
- Payments.
- Accounting records.
- Audit logs.

## Redis

Used for:

- Queue support.
- Cache.
- Sessions where applicable.
- Background job coordination.

## BullMQ Worker

Runs background work such as:

- Reports.
- Notifications.
- Scheduled tasks.
- Heavy exports.
- Backup jobs.

## pgAdmin

Administrative graphical UI for PostgreSQL.

It should be treated as an admin tool, not as part of the public application.

## Prisma Studio

A graphical interface for inspecting and managing data through the Prisma schema.

It should normally be used by developers or trusted administrators only.

---

# 3. Recommended VPS Specifications

## Initial Production Deployment

A practical starting point:

```text
CPU:     4-8 vCPU
RAM:     8-16 GB
Storage: 160+ GB NVMe SSD
OS:      Ubuntu LTS
```

For a larger ERP workload with many concurrent users and reports:

```text
CPU:     8+ vCPU
RAM:     16+ GB
Storage: 250+ GB NVMe SSD
```

The exact requirement depends on:

- Concurrent users.
- Database size.
- File uploads.
- Reporting workload.
- Background jobs.

Do not store your only database backup on the same VPS.

---

# 4. Network Design

Use two Docker networks.

```text
public-network
private-network
```

Suggested connectivity:

```text
Nginx  -> public-network
Web    -> public-network
API    -> public-network + private-network
Worker -> private-network
Postgres -> private-network
Redis  -> private-network
pgAdmin -> private-network
```

Only services that need public-facing communication should be reachable through the public layer.

PostgreSQL must not publish port 5432 to the internet.

Redis must not publish port 6379 to the internet.

---

# 5. Server Preparation

Before deployment:

1. Create a non-root deployment user.
2. Use SSH keys instead of password authentication where possible.
3. Disable direct root login.
4. Configure a firewall.
5. Install security updates.
6. Install Docker and Docker Compose.
7. Configure automatic security updates according to your operational requirements.

Recommended public firewall ports:

```text
22    SSH
80    HTTP
443   HTTPS
```

Do not publicly open:

```text
3000
4000
5432
6379
5050
5555
```

Restrict SSH further by IP or VPN if your operational setup allows it.

---

# 6. Secrets and Environment Variables

Never commit production secrets to Git.

Create a production environment file:

```text
POSTGRES_DB=app_production
POSTGRES_USER=app_user
POSTGRES_PASSWORD=CHANGE_TO_A_LONG_RANDOM_SECRET

DATABASE_URL=postgresql://app_user:CHANGE_TO_A_LONG_RANDOM_SECRET@postgres:5432/app_production

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=CHANGE_TO_A_SEPARATE_LONG_RANDOM_SECRET
```

Recommended practices:

- Use a password manager to generate secrets.
- Use different credentials for different services.
- Rotate credentials when required.
- Restrict access to the production environment file.

Example:

```bash
chmod 600 .env.production
```

Do not put real production credentials in:

- Git repositories.
- Screenshots.
- Documentation.
- Chat messages.

---

# 7. Production Docker Compose Example

The following is a structural example. Adapt image names, paths and application commands to the actual project.

```yaml
services:

  nginx:
    image: nginx:stable
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web
      - api
    networks:
      - public-network
    volumes:
      - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro

  web:
    build:
      context: .
      dockerfile: ./infra/docker/web.Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
    expose:
      - "3000"
    networks:
      - public-network

  api:
    build:
      context: .
      dockerfile: ./infra/docker/api.Dockerfile
    restart: unless-stopped
    env_file:
      - .env.production
    expose:
      - "4000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - public-network
      - private-network

  worker:
    build:
      context: .
      dockerfile: ./infra/docker/worker.Dockerfile
    restart: unless-stopped
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - private-network

  postgres:
    image: postgres:16
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - private-network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
        ]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - private-network
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10

networks:
  public-network:
  private-network:
    internal: true

volumes:
  postgres_data:
  redis_data:
```

Important:

There is intentionally no:

```yaml
ports:
  - "5432:5432"
```

under PostgreSQL.

---

# 8. PostgreSQL User Strategy

Do not use the PostgreSQL superuser as the application's everyday account.

Recommended logical roles:

```text
postgres_admin
    Administrative tasks only

app_user
    Normal application database access

migration_user
    Controlled schema migrations

readonly_user
    Read-only inspection or reporting where appropriate
```

Use the minimum privileges necessary for each role.

For example, application code should not automatically receive unlimited administrative permissions.

---

# 9. pgAdmin Secure Deployment

pgAdmin should not be openly available on the public internet.

A secure pattern is to bind its web interface to VPS localhost only.

Example service:

```yaml
pgadmin:
  image: dpage/pgadmin4
  restart: unless-stopped
  environment:
    PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
    PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
  ports:
    - "127.0.0.1:5050:80"
  networks:
    - private-network
```

This means pgAdmin is reachable on the VPS itself:

```text
127.0.0.1:5050
```

It is not automatically reachable from the internet.

---

# 10. Accessing pgAdmin Through an SSH Tunnel

The secure access pattern is:

```text
Your Computer
      |
      | Encrypted SSH tunnel
      v
VPS localhost:5050
      |
      v
pgAdmin
      |
      v
PostgreSQL
```

Example SSH tunnel command:

```bash
ssh -L 5050:127.0.0.1:5050 YOUR_VPS_USER@YOUR_VPS_IP
```

After the tunnel is established, open:

```text
http://localhost:5050
```

The browser connects locally, while SSH securely forwards the traffic to the VPS.

When finished, close the SSH session.

---

# 11. Connecting pgAdmin to PostgreSQL

Inside pgAdmin, create a server connection.

Typical settings:

```text
Host: postgres
Port: 5432
Database: app_production
Username: an authorized database user
Password: the corresponding secret
```

The hostname `postgres` works because pgAdmin and PostgreSQL are on the same Docker network.

Do not expose PostgreSQL merely to make pgAdmin easier to connect.

---

# 12. Prisma Studio Secure Access

Prisma Studio should not be permanently exposed to the public internet.

A safer operational method is to run it only when needed.

For example:

```bash
npx prisma studio --hostname 127.0.0.1 --port 5555
```

Then access it through SSH forwarding:

```bash
ssh -L 5555:127.0.0.1:5555 YOUR_VPS_USER@YOUR_VPS_IP
```

Open locally:

```text
http://localhost:5555
```

Recommended usage:

```text
Development:
    Prisma Studio allowed for normal development.

Staging:
    Restricted access.

Production:
    Use only when necessary and by authorized administrators.
```

Prisma Studio can modify production data, so production access must be controlled.

---

# 13. Nginx Routing

A simple design is:

```text
Public traffic
    |
    +-- /      -> Next.js web
    |
    +-- /api/  -> Express API
```

Example conceptual Nginx configuration:

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

This path-based design can also work when the application is accessed through a VPS IP address.

For serious production usage, HTTPS is strongly recommended.

---

# 14. If You Are Not Using a Domain

You can access the application by the VPS public IP:

```text
http://YOUR_VPS_IP
```

Possible drawbacks:

- HTTPS certificate management may be more difficult.
- The IP address is less professional and harder for users to remember.
- PWA and secure browser features may be limited without proper HTTPS.
- If the server IP changes, users must use the new address.
- Subdomain-based separation such as `app.example.com` and `api.example.com` is unavailable.

A practical approach is:

```text
Phase 1:
VPS IP + internal testing

Phase 2:
Domain + HTTPS + production rollout
```

---

# 15. Prisma Production Migration Workflow

Do not casually use schema synchronization commands against production.

Recommended workflow:

```text
Developer
    |
    v
Create reviewed migration
    |
    v
Commit migration files
    |
    v
Test on development/staging
    |
    v
Backup production database
    |
    v
Deploy application
    |
    v
Run production migration command
    |
    v
Health checks
```

For Prisma, production deployments generally use versioned migrations rather than an unreviewed direct schema push.

A failed migration plan should include a recovery procedure.

---

# 16. Database Backup Strategy

A production database should have multiple backup locations.

Recommended flow:

```text
PostgreSQL
    |
    v
Automated daily backup
    |
    +-------------------+
    |                   |
    v                   v
Local short retention   External backup storage
```

Suggested retention policy:

```text
Daily backups:   7-14 copies
Weekly backups:  4-8 copies
Monthly backups: according to business requirements
```

The exact retention period depends on your compliance and business requirements.

---

# 17. PostgreSQL Backup Example

Example logical backup:

```bash
docker exec app-postgres   pg_dump   -U "$POSTGRES_USER"   -d "$POSTGRES_DB"   -Fc   > backup_$(date +%F).dump
```

Important:

- Store the backup outside the database container.
- Copy backups to separate storage.
- Monitor backup failures.
- Do not assume a backup is valid until restoration has been tested.

For automated production backup, use a dedicated script and a scheduler.

---

# 18. Restore Testing

A backup strategy is incomplete without restore testing.

Recommended process:

```text
Production Backup
      |
      v
Temporary/Test PostgreSQL Instance
      |
      v
Restore Database
      |
      v
Run integrity checks
      |
      v
Verify important application data
```

Perform restore tests regularly.

---

# 19. Health Checks

Add health endpoints to the application.

Example:

```text
/health
/health/live
/health/ready
```

Suggested checks:

```text
Web running
API running
Database reachable
Redis reachable
Worker running
Disk capacity acceptable
Backup completed
```

Docker health checks help detect service failures, but external monitoring is also recommended.

---

# 20. Monitoring and Alerts

Monitor at least:

```text
CPU usage
RAM usage
Disk usage
Database availability
API health
HTTP availability
Backup success/failure
Container restarts
```

Set alerts for:

```text
Disk nearly full
Server unreachable
Database unavailable
Repeated container crashes
Backup failure
```

Monitoring should notify an administrator before a small issue becomes a major outage.

---

# 21. Docker Restart Strategy

Use:

```yaml
restart: unless-stopped
```

or another restart policy appropriate to your operations.

This allows services to return automatically after many ordinary container or server restarts.

However, automatic restart is not a replacement for monitoring.

---

# 22. File and Document Storage

Do not rely solely on the VPS disk for important uploaded files.

For files such as:

- Receipts.
- Product images.
- Visit photos.
- Signatures.
- Generated exports.
- Business documents.

Use S3-compatible object storage where practical.

Recommended flow:

```text
Application
    |
    v
S3-Compatible Object Storage
    |
    +--> Application files
    +--> Important generated documents
```

This reduces the risk of losing files when a VPS is rebuilt or replaced.

---

# 23. Production Security Checklist

Before launch, verify:

```text
[ ] Root SSH login restricted
[ ] SSH keys configured
[ ] Firewall enabled
[ ] Docker updated
[ ] Only required ports public
[ ] PostgreSQL not public
[ ] Redis not public
[ ] pgAdmin bound to localhost
[ ] Prisma Studio not public
[ ] Production secrets not committed to Git
[ ] Strong unique passwords used
[ ] Application authentication enabled
[ ] RBAC tested
[ ] HTTPS configured where applicable
[ ] Database backups automated
[ ] External backup location configured
[ ] Restore procedure tested
[ ] Monitoring configured
[ ] Disk alerts configured
[ ] Health checks working
```

---

# 24. Recommended Production Access Policy

```text
Normal Application User
    |
    -> Uses only the application UI

Developer
    |
    -> Development environment access
    -> Production access only when explicitly authorized

System Administrator
    |
    -> VPS infrastructure administration

Database Administrator
    |
    -> pgAdmin via SSH tunnel
    -> Controlled production database access
```

Use the principle of least privilege.

Not every developer or application user should have direct database administration access.

---

# 25. Deployment Procedure

A typical production deployment sequence:

```text
1. Prepare VPS
2. Configure SSH security
3. Configure firewall
4. Install Docker
5. Clone deployment repository
6. Create production environment file
7. Configure persistent volumes
8. Configure Nginx
9. Build application images
10. Start PostgreSQL and Redis
11. Run database migrations
12. Start API, Worker and Web
13. Run health checks
14. Configure backups
15. Configure monitoring
16. Perform a restore test
17. Launch production access
```

Always test deployments in a staging environment when the change affects:

- Database schema.
- Authentication.
- Accounting logic.
- Inventory.
- Payment flows.

---

# 26. Recommended Day-to-Day Operations

## Daily

Check:

- Application availability.
- Backup status.
- Disk space.
- Critical alerts.

## Weekly

Check:

- Container restarts.
- Server updates.
- Error logs.
- Backup copies.

## Monthly

Check:

- Database restore process.
- Access permissions.
- Unused accounts.
- Disk growth.
- Security updates.

---

# 27. Emergency Recovery Plan

## Scenario: Application Container Fails

```text
Check logs
    |
    v
Identify failed service
    |
    v
Restart/repair service
    |
    v
Run health check
```

## Scenario: VPS Fails

```text
Create replacement server
    |
    v
Deploy application containers
    |
    v
Restore database from external backup
    |
    v
Reconnect object storage
    |
    v
Run validation
    |
    v
Restore service
```

The exact recovery time depends on your automation and backup strategy.

---

# 28. Final Recommended Architecture

```text
                       USERS
                         |
                         v
                 NGINX / HTTPS
                 Public: 80/443
                         |
              +----------+----------+
              |                     |
              v                     v
         NEXT.JS WEB            EXPRESS API
                                     |
                         PRIVATE DOCKER NETWORK
                                     |
                   +-----------------+-----------------+
                   |                 |                 |
                   v                 v                 v
              POSTGRESQL           REDIS            WORKER
                   |
                   +--------------------+
                                        |
                           ADMIN-ONLY SSH ACCESS
                                        |
                              +---------+---------+
                              |                   |
                              v                   v
                           pgAdmin            Prisma Studio

BACKUP:
PostgreSQL -> Automated backup -> External storage

FILES:
Application -> S3-compatible object storage
```

---

# 29. Final Recommendation

For the initial version of this application, a single properly configured VPS can host:

- Nginx
- Next.js
- Express API
- PostgreSQL
- Redis
- BullMQ Worker

However, do not place all critical data protection responsibilities on that VPS.

Keep:

- Database backups externally.
- Important files in object storage where appropriate.
- Database administration behind SSH/VPN access.
- PostgreSQL and Redis on private networks.
- pgAdmin and Prisma Studio off the public internet.

As the application grows, the easiest scaling path is to move PostgreSQL and other critical services to dedicated or managed infrastructure without changing the overall application architecture.

## Core Rule

> Public users should interact with the application through Nginx. Administrative database tools should be accessed through controlled, authenticated channels. Databases should never be exposed simply for convenience.
