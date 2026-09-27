# apps/api/src/modules

Empty at Phase 0 (scaffold only, `prompt.md` §184). Starting Phase 2 (Identity
& RBAC), each bounded context gets its own folder here, mirroring
`architecture.md` §40's four layers exactly (`prompt.md` §129):

```
modules/<context>/
  domain/          — entities, value objects, domain events — no framework imports
  application/     — use cases / command handlers, orchestrate domain + infra
  infrastructure/  — Prisma repositories, external service adapters
  presentation/    — Express router + controllers for this context only
```

Context list and build order: `prompt.md` §57–127 (71 rows), phase grouping:
`prompt.md` §184–203 / `PROGRESS.md` §381.
