# Getting Started with PhotoMe
**Prerequisites:** Docker Desktop installed and running

## One-Command Setup BACKEND
From the `mvp` folder run the quickstart script
```bash
cd ./mvp
./photome-backend/quickstart.sh
```

This automatically:
- Starts all services (Postgres, MinIO, DeepFace, Backend)
- Runs database migrations
- Seeds 10 test users + 5 events with photos
```

##  What Gets Created

### 👥 Users (10 total)
All passwords: `letmeinbro`

| Username | Email | Tier | Role |
|----------|-------|------|------|
| sushil | sushil@photome.app | Business | Main organizer |
| gabriel | gabriel@photome.app | Pro | Active member |
| nico | nico@photome.app | Pro | Active member |
| boff | boff@photome.app | Pro | Active member |
| kit | kit@photome.app | Basic | Casual user |
| saniya | saniya@photome.app | Pro | Active member |
| alex | alex@photome.app | Basic | Event creator |
| maya | maya@photome.app | Pro | Birthday person |
| jordan | jordan@photome.app | Basic | Casual user |
| taylor | taylor@photome.app | Pro | Concert organizer |

### 🎉 Events (5 total)

1. **Summer BBQ 2026** (Public)
   - Creator: sushil
   - Members: sushil, gabriel, nico, boff, kit, saniya
   - Date: 7 days ago

2. **Mountain Hiking Trip** (Public)
   - Creator: gabriel
   - Members: gabriel, nico, kit, maya, jordan
   - Date: 14 days ago

3. **Maya's 25th Birthday Bash** (Private)
   - Creator: alex
   - Members: alex, maya, saniya, taylor, boff
   - Date: 3 days ago

4. **Beach Day Vibes** (Public)
   - Creator: nico
   - Members: nico, sushil, kit, jordan, taylor, gabriel
   - Date: In 5 days

5. **Concert Night - The Waves** (Public)
   - Creator: taylor
   - Members: taylor, maya, boff, saniya, alex
   - Date: In 12 days
   
### 🤝 Friendships (15 connections)
Pre-established friend network:
- sushil ↔ gabriel, nico, kit
- gabriel ↔ nico, maya
- nico ↔ boff
- boff ↔ kit, saniya
- kit ↔ saniya, jordan
- saniya ↔ maya
- maya ↔ alex, taylor
- alex ↔ taylor
- taylor ↔ jordan


### View Logs
```bash
docker compose logs -f backend      # Backend logs
docker compose logs -f deepface     # Face recognition logs
```

### Stop Services
```bash
docker compose down
```

### Reset All Data
```bash
docker compose down -v              # Wipes everything
```

## 🐛 Troubleshooting

### "Connection refused" errors
Services aren't ready yet. Wait 20-30 seconds after `docker compose up`.

### "Module not found" errors
```bash
docker compose down
docker compose up --build -d
```

### Database errors
```bash
docker compose down -v  # Nuclear option: wipes all data
docker compose up -d
docker compose exec backend alembic upgrade head
```


