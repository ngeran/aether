# Aether Task Management Guide

**Purpose:** Efficiently manage development tasks while being token-efficient

---

## Task Categories

### 1. 🐛 Bug Fixes
- Navigation errors
- API failures
- WebSocket disconnections
- Job processing issues

### 2. ✨ Features
- New automation capabilities
- UI enhancements
- Device integrations
- Reporting features

### 3. 🏗️ Infrastructure
- Docker configuration
- CI/CD pipelines
- Monitoring
- Security updates

### 4. 📚 Documentation
- API documentation
- User guides
- Deployment docs
- Code comments

### 5. 🔧 Maintenance
- Dependency updates
- Code refactoring
- Performance optimization
- Test coverage

---

## Task Template

When creating a task, use this format:

```markdown
### [TITLE]

**Category:** 🐛 Bug / ✨ Feature / 🏗️ Infrastructure / 📚 Documentation / 🔧 Maintenance
**Priority:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)
**Estimated Time:** X hours
**Status:** Todo / In Progress / Blocked / Review / Done

**Description:**
[Brief description of what needs to be done]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Dependencies:**
- [ ] Dependency 1
- [ ] Dependency 2

**Notes:**
[Additional context, files affected, etc.]
```

---

## Current Tasks (In Progress)

### High Priority Tasks

#### P0 - Critical (Must Fix Now)
- [ ] **Fix: Navigation menu shows "Nav Error" on fresh install**
  - Affected: `frontend/src/context/NavigationContext.jsx`
  - Root cause: Environment variable mismatch
  - Status: ✅ COMPLETED (2025-02-07)

#### P1 - High (This Week)
- [ ] **Feature: Add SSL/TLS support for production deployment**
  - Files: `DEPLOYMENT_GUIDE.md`, docker setup
  - Estimated: 3 hours
  - Status: 📋 Todo

- [ ] **Feature: Implement device authentication (SSH keys)**
  - Files: `app_gateway/api/routers/automation.py`
  - Estimated: 4 hours
  - Status: 📋 Todo

#### P2 - Medium (This Month)
- [ ] **Feature: Add real-time job progress indicators**
  - Files: Frontend components, WebSocket handling
  - Estimated: 6 hours
  - Status: 📋 Todo

- [ ] **Documentation: Create API reference for all endpoints**
  - Files: New `API_REFERENCE.md`
  - Estimated: 4 hours
  - Status: 📋 Todo

---

## Token-Efficient Task Management

### Use Abbreviations

| Abbreviation | Meaning |
|-------------|---------|
| `FE` | Frontend |
| `BE` | Backend (FastAPI) |
| `RS` | Rust Backend |
| `DB` | Database/Redis |
| `WS` | WebSocket |
| `API` | API Gateway |
| `WRK` | Worker Service |
| `CFG` | Configuration |

### Task Status Codes

| Code | Meaning |
|------|---------|
| `📋` | Todo |
| `🔄` | In Progress |
| `⏸️` | Blocked |
| `👀` | Review |
| `✅` | Done |
| `❌` | Cancelled |

### Priority Codes

| Code | Meaning | Action Timeline |
|------|---------|-----------------|
| `P0` | Critical | Immediate |
| `P1` | High | This week |
| `P2` | Medium | This month |
| `P3` | Low | When available |

---

## Task Workflow

```
┌─────────┐    ┌────────────┐    ┌───────────┐
│  Todo   │───▶│ In Progress │───▶│  Review   │
└─────────┘    └────────────┘    └───────────┘
     ▲              │                  │
     │              ▼                  ▼
     │         ┌─────────┐        ┌────────┐
     │         │ Blocked │        │  Done  │
     │         └─────────┘        └────────┘
     │                              │
     └──────────────────────────────┘
           (Reopen if needed)
```

### State Transitions

1. **Todo → In Progress**: Start working on task
2. **In Progress → Blocked**: Waiting on dependency
3. **Blocked → In Progress**: Dependency resolved
4. **In Progress → Review**: Ready for review
5. **Review → Done**: Approved
6. **Review → In Progress**: Needs changes
7. **Done → Todo**: Reopened

---

## Quick Task Commands

### Create Task

```bash
# Add to TASKS.md
echo "### [TITLE]" >> TASKS.md
echo "- [ ] Task description" >> TASKS.md
```

### Update Status

```markdown
- [ ] Todo
- [🔄] In Progress
- [⏸️] Blocked
- [👀] Review
- [✅] Done
```

### Set Priority

```markdown
#### P0 - [Task Title]
#### P1 - [Task Title]
#### P2 - [Task Title]
#### P3 - [Task Title]
```

---

## Active Sprint Plan

### Sprint: Foundation (Week of Feb 7)

**Goal:** Complete installation and configuration documentation

**Tasks:**
- [✅] Fix environment variable issues
- [✅] Create SERVER_INSTALLATION_GUIDE.md
- [✅] Create DEPLOYMENT_GUIDE.md
- [✅] Update MIGRATION_GUIDE.md to v2.0
- [✅] Create Claude skill file
- [ ] Create task management system ← **YOU ARE HERE**

**Progress:** 5/6 complete (83%)

---

## Upcoming Tasks

### Next Sprint: Core Features

**Goal:** Implement essential network automation features

**Planned Tasks:**
- [ ] Device discovery and inventory management
- [ ] Configuration template editor
- [ ] JSNAPy test integration
- [ ] Real-time job monitoring
- [ ] Backup/restore functionality

**Estimated:** 2-3 weeks

---

## Token-Efficient Communication

### When Updating Tasks

**Bad (verbose):**
```
I have started working on the task of adding SSL support for the
production deployment. I have created the necessary configuration
files and am now working on testing them.
```

**Good (concise):**
```
🔄 SSL support: Config files created, testing in progress.
Estimated 2h remaining.
```

### Task Update Format

```
[Task ID] [Status] [Brief Update]

Example:
📋 T-001 🔄 Working on FE component for job monitoring
📋 T-002 ⏸️ Blocked on API endpoint from BE team
📋 T-003 👀 Ready for review in PR #42
```

---

## Task Tracking Files

| File | Purpose |
|------|---------|
| `TASKS.md` | Detailed task list (this file) |
| `CHANGELOG.md` | Version history and changes |
| `TODO` | Quick inline TODOs in code |
| `.claude/skills/aether.md` | Development context |

---

## Code TODO Format

When adding TODOs in code:

```javascript
// TODO: [P1] Add error handling for device disconnection
// TODO: [P2] Implement retry logic for failed jobs
// TODO: [P3] Add unit tests for this component
```

---

## Completing Tasks

### Checklist Before Marking Done

- [ ] Code written and tested locally
- [ ] Documentation updated
- [ ] No console errors
- [ ] Acceptance criteria met
- [ ] Code reviewed (if PR)
- [ ] Tests passing
- [ ] Logged to CHANGELOG.md

### CHANGELOG Entry Format

```markdown
## [Version] - YYYY-MM-DD

### Added
- Feature description

### Fixed
- Bug fix description

### Changed
- Modification description

### Removed
- Removed feature description
```

---

## Quick Reference

### Task Status Summary

```
Total Tasks: 25
✅ Completed: 12
🔄 In Progress: 3
📋 Todo: 7
⏸️ Blocked: 2
⏱️ On Track: Yes
```

### Service Health Quick Check

```bash
# All services running?
docker compose ps

# Any errors in logs?
docker compose logs --tail=50

# Can access frontend?
curl http://localhost:5173

# API responding?
curl http://localhost:8000/docs
```

---

## Best Practices

1. **One task at a time** - Focus on completing current task before starting new one
2. **Small tasks** - Break large tasks into < 4 hour chunks
3. **Clear acceptance** - Define done criteria before starting
4. **Update frequently** - Keep task status current
5. **Document decisions** - Note why specific approaches were taken
6. **Test locally** - Verify before marking as done
7. **Review first** - Have someone review critical changes

---

**Last Updated:** 2025-02-07
**Next Review:** 2025-02-14
