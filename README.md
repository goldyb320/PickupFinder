# OpenRun – Pickup Sports Map

A production-quality web app for discovering and creating pickup sports games on a map.

---

## Tech Stack

- **Next.js 14+** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Mapbox GL JS** – maps and geocoding
- **Prisma ORM** + Neon Postgres (PostGIS)
- **Auth.js (NextAuth)** – Google OAuth + optional dev bypass
- **Zod** – validation

---

## Features & Functionality

### Authentication

| Feature | Description |
|--------|-------------|
| **Google OAuth** | Sign in with a Google account. |
| **Dev Login** | When `AUTH_DEV_BYPASS=true`, a "Dev Login" button appears and logs you in as `DEV_USER_EMAIL` without Google. Disabled in production. |
| **Session** | JWT-based sessions. Sign out via the profile dropdown. |

---

### Map & Discovery

| Feature | Description |
|--------|-------------|
| **Full-screen map** | Home page shows a Mapbox map with pickup games. |
| **Locate me** | Button centers the map on your location; falls back to Chicago if denied. |
| **100m clustering** | Games within 100m are grouped into cluster markers (haversine). |
| **Cluster click** | Click a cluster to open a bottom sheet with games sorted by start time. |
| **Single marker click** | Click a single-game marker to open the same sheet. |
| **Map click to add game** | Left-click on empty map (no drag) opens a sheet to add a game at that location. Enter a location name and continue to the create form. |
| **List view** | Toggle to see games in a list instead of the map. |
| **Filters** | Filter by sport, time window (next 2h / today / weekend), and “needs players only.” |

---

### Creating a Game (Post)

| Feature | Description |
|--------|-------------|
| **Location – search** | Search by park name, building, or address (Mapbox Geocoding). Results appear after 2+ characters. |
| **Location – map click** | Click the map to set a point, enter a name, then confirm. |
| **Location – favorites** | Quick-select from saved favorite locations. |
| **Location – from home map** | Click the home map to add a game; you’re taken to the create form with that location pre-filled. |
| **Fields** | Sport, title, description, skill level (Casual / Medium / Competitive), visibility (Public / Friends), start date/time (local → stored in UTC), duration, total players. |
| **Tag friends** | Optional: tag friends when creating; they receive a notification. |
| **Expiry** | Posts expire 30 minutes after start time and are hidden from the map. |

---

### Joining & Managing Games

| Feature | Description |
|--------|-------------|
| **Join** | Join a game from the post detail page until it’s full. |
| **Leave** | Leave a game you’ve joined. |
| **Creator actions** | Edit, cancel, or delete your own posts. |
| **Remove participant** | Creator can remove a participant (API: `POST /api/posts/[id]/remove-participant?userId=...`). |
| **Capacity** | Shows joined count vs total players; status becomes FULL when full. |

---

### Favorites

| Feature | Description |
|--------|-------------|
| **Add to favorites** | On a post detail page, use the heart icon to save the location. |
| **Favorites page** | View and remove saved locations. |
| **Quick-select** | Use favorites when creating a new post. |

---

### Friends

| Feature | Description |
|--------|-------------|
| **Search users** | Search by **name or email** (minimum 2 characters). No username field; users are identified by name and email. |
| **Add friend** | Send a friend request from search results. |
| **Friend list** | View accepted friends. |
| **Friend requests** | Incoming requests appear as notifications (type: FRIEND_REQUEST). Accept/decline is supported via API (`POST /api/friends/respond`). |

---

### Notifications

| Feature | Description |
|--------|-------------|
| **Types** | `FRIEND_REQUEST`, `TAGGED_IN_POST`, `JOINED_YOUR_POST`. |
| **Notifications page** | View all notifications and mark as read. |
| **Links** | TAGGED_IN_POST and JOINED_YOUR_POST link to the relevant post. |

---

### Expiry System

| Feature | Description |
|--------|-------------|
| **Automatic filtering** | Expired posts are excluded from viewport and list queries. |
| **Cron endpoint** | `GET /api/cron/expire` marks expired posts. Protected by `CRON_SECRET` (header `x-cron-secret` or query `?secret=`). |
| **Local script** | `npm run cron:expire` calls the cron endpoint locally. |

---

## Database (Neon Postgres)

- **Pooled connection** (`DATABASE_URL`) – used at runtime (Vercel/serverless-friendly)
- **Direct connection** (`DIRECT_DATABASE_URL`) – used for Prisma migrations

**PostGIS:** Run `sql/enable_postgis.sql` once on your Neon database before migrations. PostGIS is required for spatial queries.

---

## Local Run

1. Copy `.env.example` to `.env` and fill in values.
2. Run PostGIS setup on Neon:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Seed (optional):
   ```bash
   npm run db:seed
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed database with dev user and sample data |
| `npm run cron:expire` | Call the expire endpoint (requires `CRON_SECRET`) |

---

## Routes Overview

| Route | Description |
|-------|-------------|
| `/` | Home – map or list of games |
| `/auth/signin` | Sign in (Google or Dev Login) |
| `/posts/new` | Create a new game |
| `/posts/[id]` | View a game, join/leave |
| `/favorites` | Saved locations |
| `/friends` | Search users, view friends |
| `/notifications` | Notifications |
| `/profile` | User profile |

---

*This README is updated as the project evolves.*
