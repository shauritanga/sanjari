# Deployment Guide

Production deployment requires:

- DNS records for API, admin, and CDN/media domains.
- TLS certificates and HSTS.
- Nginx or managed ingress with strict CORS and secure headers.
- Managed PostgreSQL 16 with PostGIS and encrypted backups.
- Managed Redis with persistence appropriate for queues and rate limits.
- S3-compatible private buckets and CDN distribution.
- Separate API and worker containers.
- Prometheus-compatible metrics, structured logs, and Sentry-compatible error monitoring.
- Firewall rules allowing only required inbound ports.
- SSH hardening or managed access controls.
- Manual approval for production deploys.
- Tested rollback and database restore procedures.
