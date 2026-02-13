"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Favorite {
  locationId: string;
  location: { id: string; label: string; lat: number; lng: number };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/favorites");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/favorites")
      .then((r) => r.json())
      .then(setFavorites)
      .finally(() => setLoading(false));
  }, [status, router]);

  const handleRemove = async (locationId: string) => {
    await fetch(`/api/favorites/${locationId}`, { method: "DELETE" });
    setFavorites((f) => f.filter((x) => x.locationId !== locationId));
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <h1 className="text-2xl font-bold">Favorite locations</h1>

      {favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No favorite locations yet. Add locations when creating a post.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/posts/new">Create a game</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {favorites.map((fav) => (
            <Card key={fav.locationId}>
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="font-semibold">{fav.location.label}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(fav.locationId)}
                  aria-label="Remove favorite"
                >
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {fav.location.lat.toFixed(4)}, {fav.location.lng.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
