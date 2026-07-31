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
