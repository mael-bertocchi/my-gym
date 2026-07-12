<div align="center">

# 🏋️ My Gym

### Your training, tracked beautifully.

Log every set, watch your strength climb, and get coaching that actually knows your numbers — on iPhone, Apple Watch, and the Dynamic Island.

`iOS · SwiftUI` &nbsp;•&nbsp; `Apple Watch` &nbsp;•&nbsp; `Live Activity` &nbsp;•&nbsp; `Fastify + PostgreSQL` &nbsp;•&nbsp; `AI coaching`

</div>

---

## Why My Gym

- 💪 **Log at the speed of your session** — sets, warmups, drop & failure sets, supersets, and a built-in rest timer. Single-arm and bodyweight movements included.
- ⌚ **Lives on your wrist** — a full Apple Watch companion plus a lock-screen & Dynamic Island Live Activity that follow your sets and rest in real time.
- 📈 **Stats worth checking** — streaks, volume, muscle-group balance, personal records, estimated 1RM, and a training heatmap.
- 🧠 **A coach that knows your lifts** — an AI coach grounded strictly in *your* data. No generic advice, no invented numbers.
- ❤️ **Heart-rate aware** — pulls your average heart rate from Apple Health for every workout.
- 📴 **Offline-first, synced everywhere** — train with no signal; everything reconciles the moment you're back online.
- 🔒 **Yours to own** — a self-hosted backend. Your data, your server, one clean year of history.

## What's inside

| Component | What it does |
| --- | --- |
| **[Frontend](frontend/README.md)** | The iOS application (SwiftUI) + Apple Watch application + Live Activity. |
| **[Backend](backend/README.md)** | A Fastify + PostgreSQL backend with sync, stats, and AI coaching. |

## Under the hood

**Application** — Swift · SwiftUI · WidgetKit (Live Activity) · WatchKit · HealthKit
**Backend** — Node 24 · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · Google Gemini
**Identity** — JWT (access + refresh) · Argon2 · rate limiting · Helmet

## Layout

```
my-gym/
├─ frontend/   iOS + watchOS application (SwiftUI)
└─ backend/    Fastify server (TypeScript)
```

Pick a side — **[run the application](frontend/README.md)** or **[spin up the server](backend/README.md)**.
