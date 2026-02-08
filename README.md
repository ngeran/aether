# Aether

**Aether** is a professional network automation platform built with a microservices architecture. It provides a unified interface for managing network devices, automating configurations, and validating changes across your infrastructure.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- 4GB RAM minimum (8GB recommended)
- Ports 5173, 8000, 3100 available

### Installation

```bash
# Clone the repository
git clone <your-repo-url> aether
cd aether

# Configure environment
cp .env.example .env
nano .env  # Edit SERVER_HOST if needed

# Start services
docker compose up -d --build

# Access the application
open http://localhost:5173
```

## 📖 Documentation

| Guide | Description |
|-------|-------------|
| [SERVER_INSTALLATION_GUIDE.md](SERVER_INSTALLATION_GUIDE.md) | Complete server installation |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Moving between computers |
| [SERVER_CONFIG.md](SERVER_CONFIG.md) | Configuration reference |
| [CLAUDE.md](CLAUDE.md) | Architecture documentation |

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)  : 5173        │
├─────────────────────────────────────────┤
│  API Gateway (FastAPI)   : 8000        │
├─────────────────────────────────────────┤
│  WebSocket Hub (Rust)    : 3100        │
├─────────────────────────────────────────┤
│  Message Broker (Redis)  : 6379        │
├─────────────────────────────────────────┤
│  Worker Service (FastAPI)              │
└─────────────────────────────────────────┘
```

## ✨ Features

- **Dynamic Navigation** - YAML-based menu configuration
- **Network Automation** - Configuration templates and deployment
- **Device Validation** - JSNAPy integration for pre/post checks
- **Backup & Restore** - Automated device configuration backups
- **Real-time Updates** - WebSocket-based job monitoring
- **Multi-vendor Support** - Juniper, Cisco, and more

## 🔧 Services

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| Frontend | React + Vite | 5173 | Web UI |
| API Gateway | FastAPI | 8000 | REST APIs |
| WebSocket Hub | Rust | 3100 | Real-time updates |
| Message Broker | Redis | 6379 | Job queuing |
| Worker Service | FastAPI | - | Background jobs |

## 📦 Environment Configuration

Edit `.env` file to configure your environment:

```bash
# Server Configuration
SERVER_HOST=localhost  # or your server IP/domain
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173

# Protocol (http/https)
PROTOCOL=http
WS_PROTOCOL=ws
```

## 🤝 Contributing

Contributions are welcome! Please read our documentation first.

## 📝 License

[Your License Here]

## 🔗 Links

- **API Documentation:** http://localhost:8000/docs
- **Frontend:** http://localhost:5173
- **WebSocket:** ws://localhost:3100/ws

---

**Aether** - Professional Network Automation Platform
