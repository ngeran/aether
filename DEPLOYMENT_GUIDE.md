# Aether Server Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-02-07
**Purpose:** Deploy Aether to a production or staging server

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Requirements](#server-requirements)
3. [Initial Server Setup](#initial-server-setup)
4. [Deployment Steps](#deployment-steps)
5. [SSL/TLS Configuration (Optional)](#ssltls-configuration-optional)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Firewall Configuration](#firewall-configuration)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to a server, ensure you have:

- [ ] Server access (SSH credentials)
- [ ] Server IP address or domain name
- [ ] Docker and Docker Compose installed on server
- [ ] Sudo privileges on the server
- [ ] Git installed on the server
- [ ] At least 5GB free disk space
- [ ] Ports 5173, 8000, 3100, 6379 available
- [ ] (Optional) SSL certificate for HTTPS
- [ ] (Optional) Domain name configured with DNS

---

## Server Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4GB | 8GB |
| CPU | 2 cores | 4 cores |
| Disk Space | 5GB | 20GB |
| OS | Ubuntu 20.04+, Debian 11+, RHEL 8+ | Ubuntu 22.04 LTS |

### Network Requirements

- **Inbound Ports:**
  - `5173` - Frontend (HTTP)
  - `8000` - API Gateway (HTTP)
  - `3100` - WebSocket (WS)
  - `22` - SSH (for management)

- **Internal Ports (Docker network):**
  - `6379` - Redis (internal only)

---

## Initial Server Setup

### Step 1: Connect to Your Server

```bash
ssh user@your-server-ip
# Or with a domain:
ssh user@aether.example.com
```

### Step 2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# Or
sudo yum update -y  # RHEL/CentOS
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose version
```

### Step 4: Install Git (if not installed)

```bash
sudo apt install git -y  # Ubuntu/Debian
# Or
sudo yum install git -y  # RHEL/CentOS
```

---

## Deployment Steps

### Step 1: Clone the Repository

```bash
# Choose your deployment directory
cd /opt
sudo git clone <repository-url> aether
cd aether

# Or deploy to home directory
cd ~
git clone <repository-url> aether
cd aether
```

### Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env
```

**Edit these values for server deployment:**

```bash
# ================================================
# SERVER CONFIGURATION - UPDATE THESE
# ================================================

# Use your server's public IP or domain name
SERVER_HOST=192.168.1.100
# Or with domain:
# SERVER_HOST=aether.example.com

# Ports (usually keep defaults unless changed)
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173

# For production with SSL, change to:
# PROTOCOL=https
# WS_PROTOCOL=wss
PROTOCOL=http
WS_PROTOCOL=ws
```

### Step 3: Create Docker Networks

```bash
# Create the external network for device communication
docker network create crpd-net

# Verify
docker network ls | grep crpd-net
```

### Step 4: Build and Start Services

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

### Step 5: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Check logs for errors
docker compose logs --tail=50

# Test API Gateway
curl http://localhost:8000/docs

# Test Navigation API
curl http://localhost:8000/api/navigation
```

---

## SSL/TLS Configuration (Optional)

For production deployment, you should use HTTPS. Here are two approaches:

### Option 1: Reverse Proxy with Nginx

#### Install Nginx

```bash
sudo apt install nginx -y
```

#### Configure Nginx Reverse Proxy

Create a new Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/aether
```

Add the following configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name aether.example.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS proxy
server {
    listen 443 ssl http2;
    server_name aether.example.com;

    # SSL configuration (see Let's Encrypt section below)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3100/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/aether /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Update .env for SSL

```bash
# Edit .env
nano .env

# Change to:
PROTOCOL=https
WS_PROTOCOL=wss
SERVER_HOST=aether.example.com
```

#### Restart Services

```bash
docker compose down
docker compose up -d
```

### Option 2: Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d aether.example.com

# Certbot will automatically configure Nginx with SSL
# Certificates will be automatically renewed
```

---

## Post-Deployment Configuration

### Update Network Device Inventory

If your network devices have different IPs on the server:

```bash
nano shared/data/inventories/inventory.yaml
```

Update device IP addresses to match your server's network.

### Configure Device Network Access

Ensure the server can reach your network devices:

```bash
# Test connectivity to a device
ping 172.27.200.200  # Replace with your device IP
telnet 172.27.200.200 22  # Test SSH port
```

### Set Up Automatic Backups

```bash
# Create a backup script
nano /opt/backup-aether.sh
```

Add the following:

```bash
#!/bin/bash
BACKUP_DIR="/opt/aether-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup shared data
tar -czf $BACKUP_DIR/aether-shared-$DATE.tar.gz /opt/aether/shared/

# Keep last 7 days of backups
find $BACKUP_DIR -name "aether-shared-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/backup-aether.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/backup-aether.sh
```

---

## Firewall Configuration

### UFW (Ubuntu)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow Aether ports
sudo ufw allow 5173/tcp  # Frontend
sudo ufw allow 8000/tcp  # API Gateway
sudo ufw allow 3100/tcp  # WebSocket

# If using Nginx reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### firewalld (RHEL/CentOS)

```bash
# Allow Aether ports
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=3100/tcp

# Reload firewall
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

---

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f fastapi_automation
docker compose logs -f rust_backend

# Last 100 lines
docker compose logs --tail=100
```

### Service Management

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart frontend

# Stop services
docker compose down

# Start services
docker compose up -d

# Update and rebuild
git pull
docker compose down
docker compose up -d --build
```

### Health Checks

```bash
# Create a health check script
nano /opt/health-check.sh
```

```bash
#!/bin/bash
echo "Checking Aether services..."

# Check if containers are running
if docker compose ps | grep -q "Exit"; then
    echo "ERROR: Some containers are not running!"
    docker compose ps
    exit 1
fi

# Check API Gateway
if ! curl -s http://localhost:8000/docs > /dev/null; then
    echo "ERROR: API Gateway is not responding!"
    exit 1
fi

# Check Frontend
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "ERROR: Frontend is not responding!"
    exit 1
fi

echo "All services are healthy!"
```

```bash
chmod +x /opt/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/health-check.sh >> /var/log/aether-health.log 2>&1
```

### Resource Monitoring

```bash
# Check container resource usage
docker stats

# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused Docker resources
docker system prune -a
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check detailed logs
docker compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E '(5173|8000|3100)'

# Check Docker disk space
docker system df
```

### Cannot Access from External Network

1. **Check firewall:**
   ```bash
   sudo ufw status
   ```

2. **Check if services are listening on all interfaces:**
   ```bash
   sudo netstat -tulpn | grep -E '(5173|8000|3100)'
   # Should show 0.0.0.0:PORT, not 127.0.0.1:PORT
   ```

3. **Check .env configuration:**
   ```bash
   cat .env | grep SERVER_HOST
   # Should be your server IP, not localhost
   ```

### High Memory Usage

```bash
# Limit container memory (add to docker-compose.yml)
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Database Connection Issues

```bash
# Check Redis is running
docker compose ps redis_broker

# Test Redis connection
docker exec -it redis_broker redis-cli PING
# Should return: PONG
```

### Update Application

```bash
# SSH into server
cd /opt/aether

# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Verify
docker compose ps
docker compose logs --tail=50
```

---

## Quick Reference

### Essential Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart <service-name>

# Update deployment
git pull && docker compose up -d --build

# Check status
docker compose ps
```

### File Locations

| Purpose | Location |
|---------|----------|
| Application | `/opt/aether` or `~/aether` |
| Configuration | `/opt/aether/.env` |
| Data | `/opt/aether/shared/` |
| Logs | `docker compose logs` |
| Backups | `/opt/aether-backups/` |

### Access URLs

| Service | URL |
|---------|-----|
| Frontend | `http://SERVER_IP:5173` |
| API Docs | `http://SERVER_IP:8000/docs` |
| WebSocket | `ws://SERVER_IP:3100/ws` |

---

## Security Best Practices

1. **Use HTTPS in production** with valid SSL certificates
2. **Restrict API access** with firewall rules
3. **Change default ports** if exposing to public internet
4. **Regular updates** - keep Docker and system packages updated
5. **Monitor logs** for suspicious activity
6. **Backup regularly** - automate backup of `shared/` directory
7. **Use strong passwords** for any authentication systems
8. **Limit container resources** to prevent DoS
9. **Network isolation** - keep crpd-net for trusted devices only
10. **Regular security audits** - review access logs periodically

---

**End of Deployment Guide**
