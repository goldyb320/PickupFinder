"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { ArrowLeft, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Friend {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface FriendGame {
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

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [games, setGames] = useState<FriendGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/friends");
      return;
    }
    if (status !== "authenticated" || !params.id) return;

    Promise.all([
      fetch(`/api/friends/${params.id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`/api/friends/${params.id}/games`).then((r) => {
        if (!r.ok) return [];
        return r.json();
      }),
    ])
      .then(([friendData, gamesData]) => {
        setFriend(friendData);
        setGames(gamesData);
      })
      .catch(() => setFriend(null))
      .finally(() => setLoading(false));
  }, [params.id, status, router]);

  const handleRemoveFriend = async () => {
    if (!friend || !confirm(`Remove ${friend.name ?? friend.email} from your friends?`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/friends/${friend.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/friends");
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

  const isParticipant = (game: FriendGame) =>
    game.participants.some((p) => p.user.id === session?.user?.id);

  if (status === "loading" || loading) {
    return (
      <div className="container max-w-2xl space-y-6 px-6 sm:px-8 py-6">
        <Skeleton className="h-9 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <p className="text-muted-foreground">Friend not found or you are not friends with this user.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl space-y-6 px-6 sm:px-8 py-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={(friend.avatarUrl ?? friend.image) ?? undefined} />
                <AvatarFallback className="text-xl">
                  {friend.name?.[0] ?? friend.email[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{friend.name ?? "Anonymous"}</h1>
                <p className="text-muted-foreground">{friend.email}</p>
                {friend.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">{friend.bio}</p>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveFriend}
              disabled={removing}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove friend
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Games they&apos;re hosting</h2>
        {games.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground">No upcoming games</p>
            <Button variant="outline" className="mt-3" onClick={() => router.push("/")}>
              Browse the map
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
