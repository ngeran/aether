# Quick Server Configuration Guide

## Problem Solved

Previously, the application was hardcoded to use `localhost`, which doesn't work when deploying to a server where clients connect from different machines.

## Solution

Added `.env` file configuration system that allows you to specify the server IP or hostname.

---

## Quick Start

### Local Development (Default)

The `.env` file is already configured for local development:

```bash
# .env file (already created)
SERVER_HOST=localhost
API_GATEWAY_PORT=8000
RUST_WS_PORT=3100
FRONTEND_PORT=5173
PROTOCOL=http
WS_PROTOCOL=ws
```

Just run:
```bash
docker compose up -d
```

Access at: `http://localhost:5173`

---

### Server Deployment

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file:**
   ```bash
   nano .env
   ```

3. **Change `SERVER_HOST` to your server IP or domain:**
   ```bash
   # Example 1: Using IP address
   SERVER_HOST=192.168.1.100

   # Example 2: Using domain name
   SERVER_HOST=aether.example.com

   # Example 3: Using public IP
   SERVER_HOST=203.0.113.50
   ```

4. **(Optional) Enable HTTPS/WSS if you have SSL:**
   ```bash
   PROTOCOL=https
   WS_PROTOCOL=wss
   ```

5. **Start services:**
   ```bash
   docker compose up -d
   ```

6. **Access from your browser:**
   ```
   http://YOUR_SERVER_IP:5173
   # or
   http://aether.example.com:5173
   ```

---

## Files Changed

| File | Purpose |
|------|---------|
| `.env` | Environment configuration (not in git) |
| `.env.example` | Template for environment configuration |
| `docker-compose.yml` | Updated to use `${VARIABLE}` syntax |
| `DEPLOYMENT_GUIDE.md` | Comprehensive server deployment guide |

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `localhost` | IP/hostname where clients access the server |
| `API_GATEWAY_PORT` | `8000` | API Gateway port |
| `RUST_WS_PORT` | `3100` | WebSocket port |
| `FRONTEND_PORT` | `5173` | Frontend port |
| `PROTOCOL` | `http` | Use `https` for SSL |
| `WS_PROTOCOL` | `ws` | Use `wss` for SSL/WebSocket |

---

## Common Scenarios

### Scenario 1: Home Network Server

```bash
# .env file
SERVER_HOST=192.168.1.100
```

Access from any device on your home network: `http://192.168.1.100:5173`

### Scenario 2: Cloud Server with Domain

```bash
# .env file
SERVER_HOST=aether.mycompany.com
PROTOCOL=https
WS_PROTOCOL=wss
```

Access: `https://aether.mycompany.com:5173`

### Scenario 3: Development on Different Machine

```bash
# .env file on the development machine
SERVER_HOST=192.168.1.50  # IP of the machine running Docker
```

Access from your laptop: `http://192.168.1.50:5173`

---

## Testing Your Configuration

After updating `.env` and restarting:

```bash
# Check services are running
docker compose ps

# Check environment variables
docker compose exec frontend env | grep VITE

# Test from another machine
curl http://YOUR_SERVER_IP:5173
```

---

## Troubleshooting

### Frontend shows "Nav Error" or can't connect

1. Check `.env` file has correct `SERVER_HOST`
2. Restart services: `docker compose restart frontend`
3. Clear browser cache (Ctrl+Shift+R)

### Can access from server but not from other computers

1. Check firewall: `sudo ufw status`
2. Allow ports: `sudo ufw allow 5173/tcp`
3. Check `.env` - SERVER_HOST should be server IP, not localhost

### Need help?

See:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment guide
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Moving to new computer
- [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Common issues
