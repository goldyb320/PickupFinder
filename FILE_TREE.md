# OpenRun – File Tree

```
PickupFinder/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── 20250213000000_init/
│       │   └── migration.sql
│       └── 20250213000001_postgis/
│           └── migration.sql
├── sql/
│   └── enable_postgis.sql
├── scripts/
│   └── expire-posts.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── dev-bypass-enabled/route.ts
│   │   │   ├── cron/
│   │   │   │   └── expire/route.ts
│   │   │   ├── favorites/
│   │   │   │   ├── route.ts
│   │   │   │   └── [locationId]/route.ts
│   │   │   ├── friends/
│   │   │   │   ├── list/route.ts
│   │   │   │   ├── request/route.ts
│   │   │   │   ├── respond/route.ts
│   │   │   │   └── search/route.ts
│   │   │   ├── locations/route.ts
│   │   │   ├── notifications/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/read/route.ts
│   │   │   └── posts/
│   │   │       ├── route.ts
│   │   │       ├── viewport/route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts
│   │   │           ├── cancel/route.ts
│   │   │           ├── join/route.ts
│   │   │           ├── leave/route.ts
│   │   │           └── remove-participant/route.ts
│   │   ├── auth/
│   │   │   └── signin/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── friends/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── posts/
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx
│   │   ├── map/
│   │   │   ├── MapFilters.tsx
│   │   │   └── MapView.tsx
│   │   ├── posts/
│   │   │   ├── ListView.tsx
│   │   │   └── PostSheet.tsx
│   │   ├── providers/
│   │   │   └── SessionProvider.tsx
│   │   └── ui/
│   │       └── (shadcn components)
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-dev.ts
│   │   ├── db.ts
│   │   ├── haversine.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── next-auth.d.ts
│   └── middleware.ts
├── .env.example
├── README.md
├── package.json
└── next.config.ts
```
