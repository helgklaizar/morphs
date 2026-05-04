# RMS AI OS Documentation

This folder contains architectural diagrams, API manifests, and system blueprints.

## Structure

- `api.md` - API contracts and integration details (PocketBase, Telegram).
- `architecture.md` - Formalized architecture graph (Mermaid format), visually explaining the relationships between Backoffice components, the PocketBase cloud, and Web UI.
- `architecture_manifesto.md` - Comprehensive architectural manifesto. Answers *why* we use SQLite for offline-first, Zustand for state management, and how we handle specific PocketBase constraints.
- `database_schema.md` - Core collections, relationships, and data modeling within PocketBase.
- `SECURITY_GUIDE.md` - Authentication flows, IAM roles, and secure access best practices.
- `server/` - Server orchestration scripts (systemd services, automated backup routines).

Any major architectural shifts should be documented here before implementation.
