"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  avatarUrl?: string | null;
}

export default function FriendsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [friends, setFriends] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/friends");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/friends/list")
      .then((r) => r.json())
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [status, router]);

  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/friends/search?q=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then(setSearchResults);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAddFriend = async (userId: string) => {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: userId }),
    });
    setSearch("");
    setSearchResults([]);
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-8 w-24" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <h2 className="font-semibold">Add friends</h2>
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users by name or email"
          />
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={(u.avatarUrl ?? u.image) ?? undefined} />
                        <AvatarFallback>{u.name?.[0] ?? u.email[0]}</AvatarFallback>
                      </Avatar>
                    <div>
                      <p className="font-medium">{u.name ?? "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {!friends.some((f) => f.id === u.id) && (
                    <Button
                      size="sm"
                      onClick={() => handleAddFriend(u.id)}
                      aria-label={`Add ${u.name ?? u.email} as friend`}
                    >
                      Add friend
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 font-semibold">Your friends</h2>
          {friends.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-muted-foreground">No friends yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search above to add friends by name or email
              </p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1">
              {friends.map((u) => (
                <Link key={u.id} href={`/friends/${u.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Avatar>
                        <AvatarImage src={(u.avatarUrl ?? u.image) ?? undefined} />
                        <AvatarFallback>{u.name?.[0] ?? u.email[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name ?? "Anonymous"}</p>
                        <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
