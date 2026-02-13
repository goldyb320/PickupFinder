"use client";

import { useState, useCallback } from "react";
import { MapView } from "@/components/map/MapView";
import { PostSheet } from "@/components/posts/PostSheet";
import { AddGameSheet } from "@/components/posts/AddGameSheet";
import { ListView } from "@/components/posts/ListView";
import { MapFilters } from "@/components/map/MapFilters";
import type { MapPost } from "@/lib/haversine";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPosts, setSheetPosts] = useState<MapPost[]>([]);
  const [addGameSheetOpen, setAddGameSheetOpen] = useState(false);
  const [addGameCoords, setAddGameCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filters, setFilters] = useState({
    sport: "",
    timeWindow: "",
    needsPlayersOnly: false,
  });
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (status !== "authenticated") {
        router.push("/auth/signin?callbackUrl=/");
        return;
      }
      setAddGameCoords({ lat, lng });
      setAddGameSheetOpen(true);
    },
    [router, status]
  );

  const handleClusterClick = useCallback((posts: MapPost[]) => {
    setSheetPosts(posts);
    setSheetOpen(true);
  }, []);

  const handlePostSelect = useCallback(
    (post: MapPost) => {
      router.push(`/posts/${post.id}`);
    },
    [router]
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b px-6 sm:px-8 lg:px-12 py-2">
        <h1 className="text-lg font-semibold">Find pickup games</h1>
        <MapFilters
          sport={filters.sport}
          timeWindow={filters.timeWindow}
          needsPlayersOnly={filters.needsPlayersOnly}
          viewMode={viewMode}
          onSportChange={(s) => setFilters((f) => ({ ...f, sport: s }))}
          onTimeWindowChange={(tw) =>
            setFilters((f) => ({ ...f, timeWindow: tw }))
          }
          onNeedsPlayersChange={(v) =>
            setFilters((f) => ({ ...f, needsPlayersOnly: v }))
          }
          onViewModeChange={setViewMode}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "map" ? (
          <MapView
            onClusterClick={handleClusterClick}
            onPostClick={(p) => {
              setSheetPosts([p]);
              setSheetOpen(true);
            }}
            onMapClick={handleMapClick}
            filters={filters}
          />
        ) : (
          <ListView
            filters={filters}
            onPostSelect={handlePostSelect}
          />
        )}
      </div>

      <PostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        posts={sheetPosts}
        onPostSelect={handlePostSelect}
      />
      {addGameCoords && (
        <AddGameSheet
          open={addGameSheetOpen}
          onOpenChange={setAddGameSheetOpen}
          lat={addGameCoords.lat}
          lng={addGameCoords.lng}
        />
      )}
    </div>
  );
}
