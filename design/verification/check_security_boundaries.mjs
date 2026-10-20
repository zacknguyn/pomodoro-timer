// Run the real disposable-database security checks, not the former MemoryStore reproduction.
// Requires POMOGIT_RUN_DISPOSABLE_CHECK=true; never reads backend/.env or accesses AWS.
await import('./check_production_readiness.mjs')
