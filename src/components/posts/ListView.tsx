"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Search } from "lucide-react";
import Link from "next/link";
import type { MapPost } from "@/lib/haversine";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ListViewProps {
  filters: {
    sport: string;
    timeWindow: string;
    needsPlayersOnly: boolean;
  };
  onPostSelect?: (post: MapPost) => void;
}

export function ListView({
  filters,
  onPostSelect,
}: ListViewProps) {
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        if (searchQuery.trim()) {
          const params = new URLSearchParams({ q: searchQuery.trim() });
          if (filters.sport) params.set("sport", filters.sport);
          if (filters.timeWindow) params.set("timeWindow", filters.timeWindow);
          if (filters.needsPlayersOnly) params.set("needsPlayersOnly", "true");
          const res = await fetch(`/api/posts/search?${params}`);
          const data = await res.json();
          setPosts(data);
        } else {
          const params = new URLSearchParams({
            north: "90",
            south: "-90",
            east: "180",
            west: "-180",
          });
          if (filters.sport) params.set("sport", filters.sport);
          if (filters.timeWindow) params.set("timeWindow", filters.timeWindow);
          if (filters.needsPlayersOnly) params.set("needsPlayersOnly", "true");
          const res = await fetch(`/api/posts/viewport?${params}`);
          const data = await res.json();
          setPosts(data);
        }
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchPosts, searchQuery.trim() ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [filters, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 sm:px-8 lg:px-12 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by location or host name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search games by location or host name"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 sm:px-8 lg:px-12 py-4">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery.trim()
                ? "No games match your search"
                : "No games found"}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild variant="default">
                <Link href="/posts/new">Create a game</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Browse the map</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime()
              )
              .map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onPostSelect?.(post)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPostSelect?.(post);
                    }
                  }}
                  aria-label={`${post.title}, ${post.locationLabel ?? "Unknown location"}, ${post.joinedCount ?? 0} of ${post.totalPlayers} players`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{post.title}</h3>
                      <Badge variant="secondary">{post.sport}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {post.locationLabel ?? "Unknown location"}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {format(
                          new Date(post.startTime),
                          "EEE, MMM d 'at' h:mm a"
                        )}
                      </span>
                      <span>
                        {post.joinedCount ?? 0}/{post.totalPlayers} players
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
