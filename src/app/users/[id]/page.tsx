"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isFriend: boolean;
  requestPending?: boolean;
}

interface UserGame {
  id: string;
  title: string;
  sport: string;
  startTime: string;
  durationMinutes: number;
  totalPlayers: number;
  joinedCount: number;
  status: string;
  location: { id: string; label: string; lat: number; lng: number };
  participants: Array<{ user: { id: string; name: string | null; image: string | null } }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/users/" + params.id);
      return;
    }
    if (status !== "authenticated" || !params.id) return;

    Promise.all([
      fetch(`/api/users/${params.id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`/api/users/${params.id}/games`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([userData, gamesData]) => {
        setUser(userData);
        setGames(gamesData);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [params.id, status, router]);

  const handleAddFriend = async () => {
    if (!user) return;
    setAdding(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: user.id }),
      });
      if (res.ok) {
        setUser((u) => (u ? { ...u, requestPending: true } : null));
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not add friend");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !confirm(`Remove ${user.name ?? user.email} from your friends?`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/friends/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setUser((u) => (u ? { ...u, isFriend: false } : null));
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not remove friend");
      }
    } finally {
      setRemoving(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    setJoiningId(gameId);
    try {
      const res = await fetch(`/api/posts/${gameId}/join`, { method: "POST" });
      if (res.ok) {
        router.push(`/posts/${gameId}`);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not join");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const isParticipant = (game: UserGame) =>
    game.participants.some((p) => p.user.id === session?.user?.id);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-9 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <Button variant="ghost" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xl">
                  {user.name?.[0] ?? user.email?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user.name ?? "Anonymous"}</h1>
                {user.email && (
                  <p className="text-muted-foreground">{user.email}</p>
                )}
                {user.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {user.isFriend ? (
                <>
                  <Button size="sm" variant="secondary" disabled>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Added
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveFriend}
                    disabled={removing}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove friend
                  </Button>
                </>
              ) : user.requestPending ? (
                <Button size="sm" variant="secondary" disabled>
                  Request sent
                </Button>
              ) : user.requestPending ? (
                <Button size="sm" variant="secondary" disabled>
                  Request sent
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAddFriend}
                  disabled={adding}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add friend
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Games they&apos;re hosting</h2>
        {games.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground">No upcoming games</p>
            <Button variant="outline" className="mt-3" asChild>
              <Link href="/">Browse the map</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const joined = isParticipant(game);
              const full = game.joinedCount >= game.totalPlayers;
              const canJoin = !joined && !full && game.status === "OPEN";

              return (
                <Card key={game.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{game.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {game.location.label}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(game.startTime), "EEE, MMM d 'at' h:mm a")}
                          </span>
                          <span>•</span>
                          <span>
                            {game.joinedCount}/{game.totalPlayers} players
                          </span>
                          <span>•</span>
                          <Badge variant="secondary">{game.sport}</Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {joined ? (
                          <Badge variant="secondary">Joined</Badge>
                        ) : canJoin ? (
                          <Button
                            size="sm"
                            onClick={() => handleJoinGame(game.id)}
                            disabled={joiningId === game.id}
                          >
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                            Join
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/posts/${game.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
