# Aether Development Skill

**Purpose:** Enable Claude to effectively develop and maintain the Aether network automation platform.

---

## Project Overview

Aether is a microservices-based network automation platform with the following architecture:

### Services

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| Frontend | React + Vite | 5173 | Web UI |
| API Gateway | FastAPI | 8000 | REST APIs |
| WebSocket Hub | Rust | 3100 | Real-time updates |
| Message Broker | Redis | 6379 | Job queuing & pub/sub |
| Worker | FastAPI | - | Background job execution |

### Key Directories

```
aether/
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── context/   # React contexts (NavigationContext)
│   │   ├── hooks/     # Custom hooks (useWorkflowMessages)
│   │   ├── layouts/   # Layout components (AppLayout, MegaMenu)
│   │   ├── pages/     # Page components
│   │   └── lib/       # Utilities (navigationUtils)
│   └── py_scripts/    # Python automation scripts
├── app_gateway/       # FastAPI application
│   ├── api/           # API routers
│   │   └── routers/   # Organized by domain
│   ├── services/      # Business logic
│   └── data_access/   # Database/access layer
├── backend/           # Rust WebSocket server
│   └── src/
│       ├── routes/    # Route handlers
│       └── services/  # Services (yaml, redis)
└── shared/            # Shared data
    ├── data/          # YAML configs (navigation, inventories)
    ├── schemas/       # JSON schemas for validation
    └── jsnapy/        # JSNAPy test files
```

---

## Environment Configuration

### Environment Variables

**Critical:** All frontend environment variables MUST use `VITE_API_GATEWAY_URL`, not `VITE_API_BASE_URL`.

**Configuration File:** `.env`

```bash
# Server Configuration
SERVER_HOST=localhost          # or server IP/domain
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173
PROTOCOL=http                  # or https
WS_PROTOCOL=ws                 # or wss

# Internal (do not change)
REDIS_HOST=redis_broker
REDIS_PORT=6379
RUST_BACKEND_INTERNAL_URL=rust_backend
```

**Docker Compose Usage:**
```yaml
environment:
  VITE_API_GATEWAY_URL: ${PROTOCOL}://${SERVER_HOST}:${API_GATEWAY_PORT}
  VITE_RUST_WS_URL: ${WS_PROTOCOL}://${SERVER_HOST}:${RUST_WS_PORT}/ws
```

---

## Development Workflow

### Starting Services

```bash
# Start all services
docker compose up -d

# Rebuild after changes
docker compose up -d --build

# View logs
docker compose logs -f <service>

# Restart specific service
docker compose restart <service>
```

### Service Dependencies

1. **Frontend** depends on API Gateway and WebSocket Hub
2. **API Gateway** depends on Redis and WebSocket Hub
3. **Worker** depends on Redis
4. All services depend on `crpd-net` Docker network

### Testing Changes

1. **Frontend changes:** Hot reload via Vite (port 5173)
2. **Backend changes:** Restart container or use `--reload` flag
3. **Rust changes:** Rebuild container required

---

## Common Patterns

### Adding a New API Endpoint

1. Create router in `app_gateway/api/routers/`
2. Register in `app_gateway/main.py` (order matters!)
3. Add to `shared/schemas/` if validation needed
4. Update frontend to consume endpoint

**Router Registration Order in main.py:**
```python
# Specific routes first
app.include_router(proxy_router)
app.include_router(jsnapy_router)
# ...
# Generic routes last
app.include_router(automation_router)
```

### Adding a New Frontend Page

1. Create component in `frontend/src/pages/`
2. Add to `PageMap` in `frontend/src/lib/navigationUtils.js`
3. Add route configuration in `shared/data/navigation.yaml`
4. Restart frontend

### Job Processing Pattern

1. Client submits job → API Gateway
2. API Gateway queues to Redis: `ws_channel:job:{uuid}`
3. Worker polls Redis, executes job
4. Worker publishes updates via WebSocket channel
5. Frontend receives real-time updates

**WebSocket Event Structure:**
```json
{
  "event_type": "status" | "log" | "complete" | "error",
  "job_id": "uuid",
  "data": { ... }
}
```

---

## Important Conventions

### Environment Variables

- **Frontend:** Always use `VITE_API_GATEWAY_URL` (NOT `VITE_API_BASE_URL`)
- **Backend:** Use `RUST_WS_URL` for internal WebSocket connection
- **Worker:** Uses `REDIS_HOST` and `REDIS_PORT` from environment

### File Locations

- **Inventory:** `shared/data/inventories/inventory.yaml`
- **Navigation:** `shared/data/navigation.yaml`
- **JSNAPy Configs:** `shared/jsnapy/config/`
- **JSNAPy Tests:** `shared/jsnapy/testfiles/`
- **Automation Scripts:** `frontend/py_scripts/`

### API Response Format

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "description"
}
```

### Error Handling

- Always return appropriate HTTP status codes
- Include error messages in response body
- Log errors to service logs
- For background jobs, publish error events to WebSocket

---

## Code Style

### Frontend (React)

- Use functional components with hooks
- Context providers for global state
- Custom hooks for reusable logic
- No JSX (use `React.createElement`)

Example:
```javascript
const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);
  // ...
  return React.createElement('div', { className: 'container' }, children);
};
```

### Backend (FastAPI)

- Use Pydantic models for validation
- Async/await for I/O operations
- Type hints required
- Docstrings for endpoints

Example:
```python
@router.post("/api/automation/template")
async def apply_template(request: TemplateRequest) -> ResponseModel:
    """Apply configuration template to devices."""
    # ...
```

### Backend (Rust)

- Use Result<T, E> for error handling
- Async with tokio for I/O
- Module-based organization

---

## Testing

### Frontend Testing

```bash
cd frontend
npm test
```

### Backend Testing

```bash
cd app_gateway
pytest

cd backend
cargo test
```

### Integration Testing

Requires all services running:
```bash
docker compose up -d
# Run integration tests
```

---

## Deployment

### Local Development

```bash
# .env
SERVER_HOST=localhost
```

### Server Deployment

```bash
# .env
SERVER_HOST=192.168.1.100  # or domain name
```

### Production with SSL

```bash
# .env
SERVER_HOST=aether.example.com
PROTOCOL=https
WS_PROTOCOL=wss
```

See: [SERVER_INSTALLATION_GUIDE.md](SERVER_INSTALLATION_GUIDE.md)

---

## Troubleshooting

### Frontend Shows "Nav Error"

**Cause:** Environment variable mismatch

**Solution:**
1. Check `.env` has correct `SERVER_HOST`
2. Verify frontend uses `VITE_API_GATEWAY_URL`
3. Restart frontend: `docker compose restart frontend`

### Jobs Not Processing

**Cause:** Worker not connected to Redis

**Solution:**
1. Check worker logs: `docker compose logs fastapi_worker`
2. Verify Redis: `docker exec -it redis_broker redis-cli PING`
3. Restart worker: `docker compose restart fastapi_worker`

### WebSocket Connection Fails

**Cause:** Rust backend not accessible

**Solution:**
1. Check backend running: `docker compose ps rust_backend`
2. Check logs: `docker compose logs rust_backend`
3. Verify network: `docker network ls | grep crpd-net`

---

## Documentation Files

| File | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Architecture reference |
| [SERVER_INSTALLATION_GUIDE.md](SERVER_INSTALLATION_GUIDE.md) | Fresh server install |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Moving between computers |
| [SERVER_CONFIG.md](SERVER_CONFIG.md) | Configuration reference |

---

## Quick Reference Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Rebuild
docker compose up -d --build

# Check status
docker compose ps

# Access container
docker exec -it <container_name> bash

# Redis CLI
docker exec -it redis_broker redis-cli

# Monitor Redis
docker exec -it redis_broker redis-cli MONITOR
```

---

## Key Things to Remember

1. **Always** use `VITE_API_GATEWAY_URL` in frontend code (never `VITE_API_BASE_URL`)
2. **Always** configure `.env` file before starting services
3. **Always** create `crpd-net` Docker network before starting
4. **Never** hardcode `localhost` for server deployments
5. **Always** restart services after changing `.env`
6. **Router order matters** in FastAPI main.py (specific before generic)
7. **WebSocket channels** follow pattern: `ws_channel:job:{uuid}`
8. **JSNAPy directories** must exist: config, snapshots, logs, testfiles
9. **Inventory YAML** must be valid YAML with proper structure
10. **Hot reload works** for frontend (Vite) and backend with `--reload`

---

**End of Aether Development Skill**
