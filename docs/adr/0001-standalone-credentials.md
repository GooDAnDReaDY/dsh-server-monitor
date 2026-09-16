# ADR-0001 — Standalone Credentials and SSH Lifecycle

- Date: 2026-09-16
- Status: accepted
- Issue: #1

## Decision

dsh-server-monitor owns its own server profiles, SSH connection pool, vault namespace and lifecycle. It does not read or depend on dsh-remote-workspace profiles, settings, services or credentials at runtime.

The proven SSH/auth/vault source implementation is adapted into this package. No third shared package is introduced for the MVP.

## Rationale

The owner explicitly requires independent plugins with independent connections and credentials. A runtime dependency on dsh-remote-workspace would couple installation, lifecycle and configuration ownership. A third package would add release and deployment overhead without enough benefit for the first version.

## Consequences

- Some connection code is intentionally duplicated and must be kept covered by tests.
- The monitor can be installed, configured and removed independently.
- The monitor must use a distinct vault filename/namespace and never expose secret material.
- Future deduplication can be reconsidered only after both plugins have a stable compatible API.
