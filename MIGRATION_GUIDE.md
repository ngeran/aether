# Aether Repository Migration Guide

**Version:** 2.0.0
**Last Updated:** 2025-02-07
**Purpose:** Step-by-step guide for moving Aether from one computer to another

---

## Quick Start Checklist

For experienced users, here's the essential checklist:

- [ ] Clone repository: `git clone <repo-url> aether && cd aether`
- [ ] Create network: `docker network create crpd-net`
- [ ] Configure environment: `cp .env.example .env && nano .env`
- [ ] Update `SERVER_HOST` in `.env` if deploying to server
- [ ] Start services: `docker compose up -d --build`
- [ ] Verify: Open `http://localhost:5173` in browser

**New to Aether?** Read the full guide below.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites on New Computer](#prerequisites-on-new-computer)
3. [Migration Steps](#migration-steps)
4. [Data Migration](#data-migration)
5. [Post-Migration Verification](#post-migration-verification)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Configuration Customization](#configuration-customization)
8. [Advanced Scenarios](#advanced-scenarios)

---

## Overview

Aether consists of multiple microservices that work together. When migrating to a new computer, you need to:

1. Clone the repository
2. Install dependencies (Docker recommended)
3. Create required Docker networks
4. Configure environment settings via `.env` file
5. Start all services
6. Verify connectivity

### What Gets Migrated?

| Component | Stored In | Migrated via Git? |
|-----------|-----------|-------------------|
| Application Code | Repository | ✅ Yes |
| Environment Config | `.env` file | ❌ No (create new) |
| Device Inventories | `shared/data/inventories/` | ✅ Yes (if committed) |
| Navigation Config | `shared/data/navigation.yaml` | ✅ Yes |
| JSNAPy Tests | `shared/jsnapy/testfiles/` | ✅ Yes |
| JSNAPy Snapshots | `shared/jsnapy/snapshots/` | ⚠️ Optional (large files) |
| Device Backups | `shared/data/backups/` | ❌ No (usually too large) |

---

## Prerequisites on New Computer

### Required Software

#### For Docker Deployment (Recommended)
- **Docker** - Version 24.0 or later
  ```bash
  docker --version
  ```
- **Docker Compose** - Version 2.20 or later
  ```bash
  docker compose version
  ```

#### For Local Development (Optional)
- **Node.js** - Version 20 or later (for frontend)
  ```bash
  node --version
  npm --version
  ```
- **Python** - Version 3.10 or later (for backend)
  ```bash
  python --version
  pip --version
  ```
- **Rust/Cargo** - Latest stable (for Rust backend)
  ```bash
  cargo --version
  rustc --version
  ```
- **Git** - For cloning the repository
  ```bash
  git --version
  ```

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4GB | 8GB |
| Disk Space | 5GB | 20GB |
| CPU | 2 cores | 4 cores |
| Operating System | Linux, macOS, Windows with WSL2 | Ubuntu 22.04 LTS |

### Network Requirements

**Ports that must be available:**
- `5173` - Frontend (HTTP)
- `8000` - API Gateway (HTTP)
- `3100` - WebSocket (WS)
- `6379` - Redis (internal only)

**Firewall requirements:**
- Allow inbound ports 5173, 8000, 3100 for client access
- Port 6379 can remain internal (Docker network only)

---

## Migration Steps

### Step 1: Clone the Repository

```bash
# Navigate to your desired workspace directory
cd ~/github/ngeran  # or your preferred location

# Clone the repository
git clone <repository-url> aether
cd aether
```

**Note:** If moving from a private GitHub repository, ensure you have SSH keys or access tokens configured.

**Alternative: Copy from existing computer**

If you have the repository on another computer:

```bash
# On the old computer, create a bundle
cd aether
git bundle create aether.bundle --all

# Transfer aether.bundle to new computer (via scp, USB, etc.)
scp aether.bundle user@new-computer:~/github/ngeran/

# On the new computer, clone from the bundle
cd ~/github/ngeran
git clone aether.bundle aether
cd aether
git remote set-url origin <repository-url>  # Update to use origin
```

---

### Step 2: Create Docker Networks

The application requires a Docker network for device communication:

```bash
# Create the external network for device communication
docker network create crpd-net

# Verify the network was created
docker network ls | grep crpd-net
```

**Expected output:**
```
crpd-net    bridge    local
```

**Error?** If you see "network crpd-net already exists", that's fine - skip to next step.

---

### Step 3: Configure Environment Settings

#### 3.1 Create Environment Configuration File

```bash
# Copy the example environment file
cp .env.example .env

# Edit for your environment
nano .env  # or use your preferred editor
```

#### 3.2 Choose Your Environment

**For Local Development** - Keep defaults:
```bash
# .env file
SERVER_HOST=localhost
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173
PROTOCOL=http
WS_PROTOCOL=ws
```

**For Server Deployment** - Update SERVER_HOST:
```bash
# .env file
SERVER_HOST=192.168.1.100
# OR with domain name:
# SERVER_HOST=aether.example.com

API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173
PROTOCOL=http  # Change to https if using SSL
WS_PROTOCOL=ws  # Change to wss if using SSL
```

**For Production with SSL**:
```bash
# .env file
SERVER_HOST=aether.example.com
PROTOCOL=https
WS_PROTOCOL=wss
```

> **See also:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete production deployment instructions.

#### 3.3 Update Network Device Inventory

If your network devices have different IP addresses on the new computer:

```bash
# Edit the inventory file
nano shared/data/inventories/inventory.yaml
```

Update device IP addresses to match your new environment:

```yaml
locations:
  BASEMENT:
    routers:
      - host_name: "MLRDCIENGDJRX01"
        vendor: "JUNIPER"
        ip_address: "172.27.200.200"  # ← Update this IP
        platform: "SRX320"
```

#### 3.4 Verify JSNAPy Directories

Ensure required directories exist:

```bash
mkdir -p shared/jsnapy/config
mkdir -p shared/jsnapy/snapshots
mkdir -p shared/jsnapy/logs
mkdir -p shared/jsnapy/testfiles
```

---

### Step 4: Build and Start Services

#### Option A: Docker Deployment (Recommended)

```bash
# Build and start all services
docker compose up -d --build

# View service status
docker compose ps
```

**Expected output:**
```
NAME                IMAGE                      STATUS         PORTS
fastapi_gateway     aether-fastapi          running        0.0.0.0:8000->8000/tcp
fastapi_worker      aether-fastapi          running
frontend_app        aether-frontend         running        0.0.0.0:5173->5173/tcp
redis_broker        redis:7.2-alpine          running        6379/tcp
rust_ws_hub         aether-rust             running        0.0.0.0:3100->3100/tcp
```

#### Option B: Local Development (Not Docker)

If you prefer running services natively:

```bash
# Terminal 1: Start Redis
docker compose up -d redis_broker

# Terminal 2: Start Rust Backend
cd backend
cargo run

# Terminal 3: Start API Gateway
cd app_gateway
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 4: Start Worker
cd app_gateway
source venv/bin/activate
python fastapi_worker.py

# Terminal 5: Start Frontend
cd frontend
npm install
npm run dev
```

---

### Step 5: Verify Service Startup

Check that all services are running correctly:

```bash
# Check all containers
docker compose ps

# Check logs for any errors
docker compose logs --tail=50

# Verify environment variables are loaded
docker compose exec frontend env | grep VITE
```

**Expected output from env check:**
```
VITE_API_GATEWAY_URL=http://localhost:8000
VITE_RUST_WS_URL=ws://localhost:3100/ws
```

---

## Data Migration

### Migrating Device Backups

If you want to transfer existing device backups from the old computer:

```bash
# On old computer:
tar -czf aether-backups.tar.gz shared/data/backups/

# Transfer to new computer (example with scp)
scp aether-backups.tar.gz user@new-computer:~/aether/

# On new computer:
cd ~/aether
tar -xzf aether-backups.tar.gz
```

### Migrating JSNAPy Snapshots

If you want to keep JSNAPy test snapshots:

```bash
# On old computer:
tar -czf jsnapy-snapshots.tar.gz shared/jsnapy/snapshots/

# Transfer to new computer
scp jsnapy-snapshots.tar.gz user@new-computer:~/aether/

# On new computer:
cd ~/aether
tar -xzf jsnapy-snapshots.tar.gz
```

### Excluding Large Files from Git

If your backups or snapshots are large, don't commit them to Git. Add to `.gitignore`:

```bash
# Add to .gitignore
echo "shared/data/backups/" >> .gitignore
echo "shared/jsnapy/snapshots/*.xml" >> .gitignore
```

---

## Post-Migration Verification

### 1. Frontend Access

Open your browser and navigate to:

**Local development:**
```
http://localhost:5173
```

**Server deployment:**
```
http://YOUR_SERVER_IP:5173
```

**Expected:** You should see the Aether application with:
- Management menu (Image Uploads, Code Upgrades)
- Automation menu (Configuration Templates, Validation)
- Reporting menu (Device Reports)
- Operations menu (Backups)

### 2. API Documentation

Access the FastAPI Swagger documentation:

```
http://localhost:8000/docs
# or for server:
http://YOUR_SERVER_IP:8000/docs
```

**Expected:** You should see all available API endpoints:
- `/api/automation/*` - Network automation tasks
- `/api/inventory/*` - Device inventory
- `/api/jsnapy/*` - JSNAPy validation
- `/api/operations/*` - Backup/restore operations
- `/api/navigation/*` - Navigation configuration

### 3. WebSocket Connection

Open browser Developer Tools:
1. Press `F12`
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)

**Expected:** You should see a WebSocket connection:
```
ws://localhost:3100/ws
# or for server:
ws://YOUR_SERVER_IP:3100/ws
```

Connection status should show `101 Switching Protocols`

### 4. API Endpoint Test

```bash
# Test navigation endpoint
curl http://localhost:8000/api/navigation

# Expected: JSON array with navigation items
```

### 5. Redis Connection Test

```bash
# Connect to Redis container
docker exec -it redis_broker redis-cli

# Test connection
PING
```

**Expected:** `PONG`

### 6. Service Health Check

```bash
# Check all services are healthy
docker compose ps

# Check for any restart loops
docker compose ps | grep -E "Restarting|Exited"
```

---

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Symptom:** Error message like `Bind for 0.0.0.0:8000 failed: port is already allocated`

**Diagnosis:**
```bash
# Find what's using the port
sudo lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows
```

**Solutions:**
```bash
# Option A: Kill the conflicting process
kill -9 <PID>

# Option B: Change the port in .env
echo "API_GATEWAY_PORT=8001" >> .env
docker compose up -d
```

---

### Issue 2: crpd-net Network Not Found

**Symptom:** `ERROR: Network crpd-net declared as external, but could not be found`

**Solution:**
```bash
docker network create crpd-net
docker compose up -d
```

---

### Issue 3: Frontend Shows "Nav Error"

**Symptom:** Browser console shows error when loading navigation menu

**Cause:** Environment variable mismatch or services not communicating

**Solution:**
```bash
# 1. Check .env file
cat .env | grep SERVER_HOST

# 2. Verify environment variables are loaded
docker compose exec frontend env | grep VITE

# 3. Restart services
docker compose restart frontend

# 4. Clear browser cache and reload
# Ctrl+Shift+R (Linux/Windows) or Cmd+Shift+R (Mac)
```

---

### Issue 4: Cannot Access from Other Computers

**Symptom:** Works on server but not from other computers

**Diagnosis:**
```bash
# Check if SERVER_HOST is set to localhost (wrong for server)
cat .env | grep SERVER_HOST

# Check firewall
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-all  # RHEL/CentOS
```

**Solution:**
```bash
# 1. Update .env with server IP
nano .env
# Change: SERVER_HOST=localhost
# To: SERVER_HOST=192.168.1.100

# 2. Restart services
docker compose down
docker compose up -d

# 3. Open firewall ports
sudo ufw allow 5173/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3100/tcp
```

---

### Issue 5: Worker Not Processing Jobs

**Symptom:** Jobs are queued but never complete

**Diagnosis:**
```bash
# Check worker logs
docker compose logs fastapi_worker -f

# Check worker is running
docker compose ps fastapi_worker
```

**Solution:**
```bash
# Restart worker
docker compose restart fastapi_worker

# Verify Redis connection
docker exec -it fastapi_worker python -c "import redis; r=redis.Redis(host='redis_broker'); print(r.ping())"
```

---

### Issue 6: JSNAPy Tests Failing

**Symptom:** JSNAPy validation tests fail with file not found errors

**Solution:**
```bash
# Verify JSNAPy directories exist
ls -la shared/jsnapy/config/
ls -la shared/jsnapy/testfiles/

# Recreate if missing
mkdir -p shared/jsnapy/config
mkdir -p shared/jsnapy/snapshots
mkdir -p shared/jsnapy/logs
mkdir -p shared/jsnapy/testfiles

# Check container mounts
docker inspect fastapi_worker | grep -A 10 jsnapy
```

---

### Issue 7: Permission Denied on Volume Mounts

**Symptom:** Container exits with permission errors

**Solution:**
```bash
# Fix directory permissions
chmod -R 755 shared/
chmod -R 755 frontend/py_scripts/

# On Linux, you may need to adjust UID/GID
sudo chown -R $USER:$USER shared/
```

---

### Issue 8: git Clone Fails with SSH Permission Denied

**Symptom:** `Permission denied (publickey)` when cloning

**Solution:**
```bash
# Setup SSH keys for GitHub
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub

# Add the SSH key to your GitHub account
# Then clone using SSH: git clone git@github.com:username/aether.git
```

---

## Configuration Customization

### Server vs. Local Development Configuration

The `.env` file controls how the application connects to services:

#### Local Development (Default)
```bash
# .env file
SERVER_HOST=localhost
PROTOCOL=http
WS_PROTOCOL=ws
```
Access via: `http://localhost:5173`

#### Server Deployment
```bash
# .env file
SERVER_HOST=192.168.1.100    # Your server IP
# OR
SERVER_HOST=aether.example.com  # Your domain name

PROTOCOL=http      # or https with SSL
WS_PROTOCOL=ws     # or wss with SSL
```
Access via: `http://192.168.1.100:5173`

**For complete server deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

### Changing Default Ports

If default ports conflict with other services, edit `.env`:

```bash
# .env file
API_GATEWAY_PORT=8001
RUST_WS_PORT=3101
FRONTEND_PORT=3000
```

Then restart:
```bash
docker compose down
docker compose up -d
```

### Accessing from Remote Computers

To access Aether from other computers on your network:

1. Find your host computer's IP address:
   ```bash
   ip addr show  # Linux
   ipconfig getifaddr en0  # macOS
   ipconfig  # Windows
   ```

2. Edit `.env`:
   ```bash
   SERVER_HOST=192.168.1.100  # Use your actual IP
   ```

3. Restart services:
   ```bash
   docker compose down
   docker compose up -d
   ```

4. Access from remote browser: `http://192.168.1.100:5173`

### Custom Inventory Location

To store inventories elsewhere:

```bash
# Create a symlink
ln -s /path/to/your/inventories shared/data/inventories
```

---

## Advanced Scenarios

### Scenario 1: Multi-Environment Setup

Maintain different configurations for dev/staging/production:

```bash
# Create environment-specific files
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production

# Use specific environment
ln -s .env.production .env
docker compose up -d
```

### Scenario 2: Migration with Downtime

For minimal downtime during migration:

```bash
# On old computer:
docker compose down

# Transfer data
rsync -avz ~/aether/ user@new-computer:~/aether/

# On new computer:
cd ~/aether
docker compose up -d
```

### Scenario 3: Blue-Green Deployment

Run both old and new simultaneously:

```bash
# On new computer, use different ports:
echo "FRONTEND_PORT=5174" >> .env
echo "API_GATEWAY_PORT=8001" >> .env
docker compose up -d

# Test at http://new-computer:5174
# Verify everything works

# Switch traffic (update DNS, load balancer, etc.)
```

---

## Quick Reference Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart fastapi_automation

# Rebuild after code changes
docker compose up -d --build

# Check service status
docker compose ps

# Access container shell
docker exec -it fastapi_gateway bash

# View Redis messages
docker exec -it redis_broker redis-cli MONITOR

# Clean rebuild (remove volumes)
docker compose down -v
docker compose up -d --build

# Check environment variables
docker compose exec frontend env | grep VITE
```

---

## Support and Troubleshooting

If you encounter issues not covered in this guide:

1. **Check logs:** `docker compose logs -f <service-name>`
2. **Verify configuration:** Check `.env` file is correct
3. **Review documentation:**
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Server deployment
   - [SERVER_CONFIG.md](SERVER_CONFIG.md) - Quick server configuration
   - [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Common issues
   - [CLAUDE.md](CLAUDE.md) - Architecture details

4. **Check service health:**
   ```bash
   docker compose ps
   docker compose logs --tail=100
   ```

---

## Appendix: Service Dependencies

```
                    ┌─────────────┐
                    │   Frontend  │
                    │   (5173)    │
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
    ┌───────▼────────┐          ┌────────▼────────┐
    │  FastAPI       │          │  Rust WS Hub    │
    │  Gateway       │◄─────────┤  (3100)         │
    │  (8000)        │  WS      │                 │
    └───────┬────────┘          └────────┬────────┘
            │                             │
            │                             │
    ┌───────▼────────┐          ┌────────▼────────┐
    │  FastAPI       │          │     Redis       │
    │  Worker        │◄─────────┤   Broker        │
    │                │  Queue   │   (6379)        │
    └────────────────┘          └─────────────────┘
```

**Flow:**
1. Frontend sends HTTP requests to FastAPI Gateway
2. Frontend connects to Rust WS Hub for real-time updates
3. FastAPI Gateway queues jobs to Redis
4. Worker polls Redis for jobs and executes them
5. Worker publishes status updates via Redis → Rust WS Hub → Frontend

---

**End of Migration Guide**
