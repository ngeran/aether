# Aether Server Installation Guide

**Complete Step-by-Step Guide** - From Fresh Server to Running Application

**Version:** 1.0.0
**Last Updated:** 2025-02-07
**Estimated Time:** 30-45 minutes

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Server Requirements](#server-requirements)
4. [Installation Steps](#installation-steps)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks through installing Aether on a fresh server. Aether is a microservices application consisting of:

- **Frontend** (React + Vite) - Port 5173
- **API Gateway** (FastAPI) - Port 8000
- **WebSocket Hub** (Rust) - Port 3100
- **Message Broker** (Redis) - Port 6379
- **Worker Service** (FastAPI) - Background jobs

### Architecture Diagram

```
                    Internet
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              Firewall / Router                    │
│              Ports: 5173, 8000, 3100              │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              Aether Server                      │
│  ┌────────────────────────────────────────────┐  │
│  │  Frontend (5173)                           │  │
│  │  ┌────────────┐      ┌────────────────┐   │  │
│  │  │  React     │──────▶│  API Gateway  │   │  │
│  │  │            │◄─────▶│  (8000)        │   │  │
│  │  └────────────┘      └────────┬───────┘   │  │
│  │                              │            │  │
│  │                        ┌──────▼───────┐   │  │
│  │                        │  Rust WS     │   │  │
│  │                        │  (3100)      │   │  │
│  │                        └──────┬───────┘   │  │
│  │                               │            │  │
│  │                        ┌──────▼───────┐   │  │
│  │                        │  Redis       │   │  │
│  │                        │  Broker      │   │  │
│  │                        └──────┬───────┘   │  │
│  │                               │            │  │
│  │                        ┌──────▼───────┐   │  │
│  │                        │  Worker      │   │  │
│  │                        └──────────────┘   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  crpd-net (External Network for Devices)         │
└──────────────────────────────────────────────────┘
                       │
                       ▼
            Network Devices
         (Routers, Switches, etc.)
```

---

## Pre-Installation Checklist

### Before You Begin

- [ ] You have SSH access to the server
- [ ] You have sudo privileges on the server
- [ ] You know the server's IP address or domain name
- [ ] You have access to the Git repository
- [ ] Ports 5173, 8000, 3100 are available
- [ ] (Optional) SSL certificate ready for HTTPS

### Information Needed

| Information | Example | Your Value |
|-------------|---------|------------|
| Server IP | 192.168.1.100 | _____________ |
| Domain Name | aether.example.com | _____________ |
| Git Repository | github.com/user/aether | _____________ |
| Device Network | 172.27.200.0/24 | _____________ |

---

## Server Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 4GB | 8GB |
| **CPU** | 2 cores | 4 cores |
| **Disk** | 10GB | 50GB |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Network Requirements

**Inbound Ports (from clients):**
- `5173/tcp` - Frontend web interface
- `8000/tcp` - API Gateway
- `3100/tcp` - WebSocket connections

**Outbound Access (to devices):**
- SSH (22/tcp) to network devices
- Network device management ports

**Internal (Docker):**
- `6379/tcp` - Redis (internal only, no firewall rules needed)

---

## Installation Steps

### Step 1: Connect to Your Server

```bash
# SSH into your server
ssh user@your-server-ip

# Example:
# ssh admin@192.168.1.100
```

### Step 2: Update System Packages

```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim ufw
```

### Step 3: Install Docker

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run installation script
sudo sh get-docker.sh

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Activate group membership (logout and login again, or use:)
newgrp docker

# Verify installation
docker --version
# Expected: Docker version 24.0.0 or higher

docker compose version
# Expected: Docker Compose version v2.20.0 or higher
```

### Step 4: Configure Firewall

```bash
# Allow SSH (important! don't lock yourself out)
sudo ufw allow 22/tcp

# Allow Aether ports
sudo ufw allow 5173/tcp comment 'Aether Frontend'
sudo ufw allow 8000/tcp comment 'Aether API Gateway'
sudo ufw allow 3100/tcp comment 'Aether WebSocket'

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
5173/tcp                   ALLOW       Anywhere
8000/tcp                   ALLOW       Anywhere
3100/tcp                   ALLOW       Anywhere
```

### Step 5: Create Application Directory

```bash
# Create directory for Aether
sudo mkdir -p /opt/aether

# Set ownership to your user
sudo chown $USER:$USER /opt/aether

# Navigate to directory
cd /opt
```

### Step 6: Clone Repository

```bash
# Option A: Using HTTPS
git clone https://github.com/your-username/aether.git

# Option B: Using SSH (recommended)
git clone git@github.com:your-username/aether.git

# Navigate into project
cd aether
```

### Step 7: Create Docker Networks

```bash
# Create external network for device communication
docker network create crpd-net

# Verify network was created
docker network ls | grep crpd-net
```

**Expected output:**
```
crpd-net    bridge    local
```

### Step 8: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Edit the following values:**

```bash
# ================================================
# SERVER CONFIGURATION
# ================================================

# Change this to your server IP or domain
SERVER_HOST=192.168.1.100

# OR use domain name:
# SERVER_HOST=aether.example.com

# Ports (usually keep defaults)
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173

# Protocol (http for now, https after SSL setup)
PROTOCOL=http
WS_PROTOCOL=ws

# ================================================
# INTERNAL CONFIGURATION (DO NOT CHANGE)
# ================================================
REDIS_HOST=redis_broker
REDIS_PORT=6379
RUST_BACKEND_INTERNAL_URL=rust_backend
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 9: Verify Configuration Files

```bash
# Check navigation configuration exists
ls -la shared/data/navigation.yaml

# Check inventory configuration exists
ls -la shared/data/inventories/inventory.yaml

# If inventory doesn't exist, create it
mkdir -p shared/data/inventories
cat > shared/data/inventories/inventory.yaml << 'EOF'
locations:
  BASEMENT:
    routers:
      - host_name: "router01"
        vendor: "JUNIPER"
        ip_address: "192.168.1.1"
        platform: "SRX320"
EOF
```

### Step 10: Build and Start Services

```bash
# Build and start all services
docker compose up -d --build
```

**Watch the startup process:**
```bash
# View logs in real-time
docker compose logs -f
```

**Expected output (after ~1-2 minutes):**
```
frontend_app  | VITE v7.2.2 ready in 104 ms
frontend_app  | ➜ Local: http://0.0.0.0:5173/
rust_ws_hub   | Server listening on 0.0.0.0:3100
fastapi_gateway | Uvicorn running on http://0.0.0.0:8000
```

Press `Ctrl+C` to exit log view.

### Step 11: Verify Services are Running

```bash
# Check all containers
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

All should show `running` status.

---

## Configuration

### Update Device Inventory

Edit the inventory file with your actual network devices:

```bash
nano shared/data/inventories/inventory.yaml
```

```yaml
locations:
  BASEMENT:
    routers:
      - host_name: "MLRDCIENGDJRX01"
        vendor: "JUNIPER"
        ip_address: "172.27.200.200"
        platform: "SRX320"
  FLOOR1:
    switches:
      - host_name: "SWITCH-F1-01"
        vendor: "JUNIPER"
        ip_address: "172.27.201.10"
        platform: "EX4300"
```

### Create Required Directories

```bash
# JSNAPy directories
mkdir -p shared/jsnapy/config
mkdir -p shared/jsnapy/snapshots
mkdir -p shared/jsnapy/logs
mkdir -p shared/jsnapy/testfiles

# Backup directory
mkdir -p shared/data/backups
```

### Configure DNS (Optional)

If you have a domain name, add DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | aether | 192.168.1.100 | 300 |
| A | www | 192.168.1.100 | 300 |

---

## Verification

### 1. Frontend Access

Open your browser and navigate to:

```
http://YOUR_SERVER_IP:5173
```

**Expected:** Aether dashboard with:
- Management menu (Image Uploads, Code Upgrades)
- Automation menu (Configuration Templates, Validation)
- Reporting menu (Device Reports)
- Operations menu (Backups)

### 2. API Documentation

```
http://YOUR_SERVER_IP:8000/docs
```

**Expected:** FastAPI Swagger UI with all endpoints listed.

### 3. Test API Endpoint

```bash
# From the server
curl http://localhost:8000/api/navigation

# From another computer
curl http://YOUR_SERVER_IP:8000/api/navigation
```

**Expected:** JSON array with navigation items.

### 4. WebSocket Connection

Open browser Developer Tools (F12) → Network → WS

**Expected:** WebSocket connection to `ws://YOUR_SERVER_IP:3100/ws`

### 5. Service Health

```bash
# Check container health
docker compose ps

# Check for restart loops (should be 0 or 1)
docker compose ps | grep -E "Restarting|Exited"

# Check logs for errors
docker compose logs --tail=50
```

---

## Troubleshooting

### Services Won't Start

**Symptom:** `docker compose ps` shows `Exited` or `Restarting`

**Solution:**
```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check Docker is running
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Try starting again
docker compose down
docker compose up -d
```

### Cannot Access from External Network

**Symptom:** Works on server but not from other computers

**Solution:**
```bash
# 1. Check firewall
sudo ufw status

# 2. Check ports are allowed
sudo ufw status | grep -E "5173|8000|3100"

# 3. Check .env SERVER_HOST
cat .env | grep SERVER_HOST
# Should be server IP, NOT localhost

# 4. Restart services
docker compose down
docker compose up -d
```

### High Memory Usage

**Symptom:** Server becomes slow or unresponsive

**Solution:**
```bash
# Check resource usage
docker stats

# Limit container memory (add to docker-compose.yml)
# Under each service:
deploy:
  resources:
    limits:
      memory: 512M

# Restart to apply
docker compose up -d
```

### Database Connection Issues

**Symptom:** "Redis connection failed" errors

**Solution:**
```bash
# Check Redis is running
docker compose ps redis_broker

# Test Redis
docker exec -it redis_broker redis-cli PING
# Should return: PONG

# Restart Redis
docker compose restart redis_broker
```

### View All Logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs frontend

# Last 100 lines
docker compose logs --tail=100

# Follow logs in real-time
docker compose logs -f
```

---

## Post-Installation Tasks

### Set Up Automatic Backups

```bash
# Create backup script
cat > /opt/backup-aether.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/aether-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup shared data
tar -czf $BACKUP_DIR/aether-shared-$DATE.tar.gz /opt/aether/shared/

# Keep last 7 days
find $BACKUP_DIR -name "aether-shared-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
chmod +x /opt/backup-aether.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-aether.sh >> /var/log/aether-backup.log 2>&1") | crontab -
```

### Set Up Monitoring

```bash
# Create health check script
cat > /opt/health-check.sh << 'EOF'
#!/bin/bash
echo "Checking Aether services..."

# Check containers
if docker compose ps | grep -q "Exit"; then
    echo "ERROR: Some containers are not running!"
    docker compose ps
    exit 1
fi

# Check API
if ! curl -s http://localhost:8000/docs > /dev/null; then
    echo "ERROR: API Gateway not responding!"
    exit 1
fi

# Check Frontend
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "ERROR: Frontend not responding!"
    exit 1
fi

echo "All services healthy!"
EOF

chmod +x /opt/health-check.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/health-check.sh >> /var/log/aether-health.log 2>&1") | crontab -
```

---

## Quick Reference

### Essential Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f

# Rebuild after update
git pull
docker compose up -d --build

# Check status
docker compose ps

# Access container shell
docker exec -it fastapi_gateway bash
```

### File Locations

| What | Where |
|------|-------|
| Application | `/opt/aether` |
| Configuration | `/opt/aether/.env` |
| Device Data | `/opt/aether/shared/` |
| Logs | `docker compose logs` |
| Backups | `/opt/aether-backups/` |

### Access URLs

| Service | URL |
|---------|-----|
| Frontend | `http://SERVER_IP:5173` |
| API Docs | `http://SERVER_IP:8000/docs` |
| WebSocket | `ws://SERVER_IP:3100/ws` |

---

## Next Steps

1. **Set up SSL/TLS** - See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Configure devices** - Add your network devices to inventory
3. **Test automation** - Run a simple configuration task
4. **Set up backups** - Configure automated backups
5. **Monitor logs** - Regularly check service logs

---

## Support

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Moving between computers
- [SERVER_CONFIG.md](SERVER_CONFIG.md) - Configuration reference
- [CLAUDE.md](CLAUDE.md) - Architecture documentation

---

**End of Server Installation Guide**
