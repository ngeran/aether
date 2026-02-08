# Changelog

All notable changes to Aether will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Server installation guide with complete step-by-step instructions
- Claude skill file for improved AI-assisted development
- Task management system for efficient project tracking
- Environment-based configuration system (.env files)

### Changed
- Updated MIGRATION_GUIDE.md to version 2.0.0 with comprehensive migration steps
- Docker Compose configuration to use environment variables from .env file
- Frontend environment variable consistency (VITE_API_GATEWAY_URL)

### Fixed
- Environment variable mismatch causing "Nav Error" in frontend
  - Changed `VITE_API_BASE_URL` to `VITE_API_GATEWAY_URL` in:
    - `frontend/src/context/NavigationContext.jsx`
    - `frontend/src/layouts/components/MegaMenu.jsx`
- Server deployment configuration now supports dynamic IP/domain configuration

---

## [1.0.0] - 2025-02-07

### Added
- Initial Aether platform release
- Microservices architecture with:
  - React + Vite frontend
  - FastAPI API Gateway
  - Rust WebSocket Hub
  - Redis message broker
  - FastAPI Worker service
- Dynamic navigation system from YAML configuration
- Network automation capabilities
- JSNAPy validation integration
- Device backup/restore functionality
- Configuration template management
- Real-time job processing via WebSocket

### Documentation
- CLAUDE.md - Architecture and development reference
- MIGRATION_GUIDE.md - Moving between computers
- DEPLOYMENT_GUIDE.md - Production deployment
- SERVER_CONFIG.md - Configuration reference
- docker-compose.yml with all services

---

## Version Format

- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major**: Breaking changes
- **Minor**: New features (backwards compatible)
- **Patch**: Bug fixes (backwards compatible)

---

## Types of Changes

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security vulnerability fixes

---

**Note:** This project is in active development. Check the `Unreleased` section for upcoming changes.
