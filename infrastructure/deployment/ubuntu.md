# Ubuntu Deployment Notes

1. Create a non-root deploy user with SSH key-only access.
2. Install Docker Engine and the Docker Compose plugin.
3. Configure firewall rules for `22`, `80`, and `443` only.
4. Provision PostgreSQL, Redis, object storage, and backups.
5. Store environment variables in a secrets manager or encrypted deployment environment.
6. Run migrations as an explicit release step.
7. Deploy API, worker, admin, and Nginx containers.
8. Verify health, metrics, logs, queues, and backup jobs.
9. Keep rollback images and tested database restoration instructions.

## Database Backups

Create a compressed PostgreSQL backup from the running Compose service:

```bash
cd /var/www/sanjari
infrastructure/deployment/backup-postgres.sh
```

Backups are written to `backups/postgres/` by default, paired with SHA-256 checksums, and older files are removed after 14 days. Set `BACKUP_DIR` and `RETENTION_DAYS` for a separate encrypted volume and the required retention policy.

To restore into a maintenance database, verify the checksum first, then stream the dump into PostgreSQL. Do not restore over production without an approved maintenance window and a fresh backup:

```bash
sha256sum -c backups/postgres/sanjari-YYYYMMDDTHHMMSSZ.sql.gz.sha256
gunzip -c backups/postgres/sanjari-YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose --env-file infrastructure/deployment/.env \
      -f infrastructure/deployment/docker-compose.production.yml exec -T postgres \
      sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
