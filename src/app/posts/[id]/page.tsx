"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { ArrowLeft, UserPlus, UserMinus, Heart, X, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface PostDetail {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  skillLevel: string;
  visibility: string;
  startTime: string;
  durationMinutes: number;
  totalPlayers: number;
  status: string;
  joinedCount: number;
  location: { id: string; label: string; lat: number; lng: number };
  creator: { id: string; name: string | null; image: string | null };
  participants: Array<{ user: { id: string; name: string | null; image: string | null } }>;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    Record<string, { isFriend: boolean; requestPending: boolean }>
  >({});
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${params.id}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 410) {
            router.push("/");
            return;
          }
        }
        const data = await res.json();
        setPost(data);
        setIsParticipant(
          data.participants?.some(
            (p: { user: { id: string } }) => p.user.id === session?.user?.id
          ) ?? false
        );
        fetch("/api/favorites")
          .then((r) => r.json())
          .then((favs) =>
            setIsFavorite(
              favs.some(
                (f: { locationId: string }) =>
                  f.locationId === data.location?.id
              )
            )
          )
          .catch(() => {});
        const participantIds = (data.participants ?? [])
          .map((p: { user: { id: string } }) => p.user.id)
          .filter((id: string) => id !== session?.user?.id);
        if (participantIds.length > 0 && session?.user?.id) {
          fetch(`/api/friends/status?ids=${participantIds.join(",")}`)
            .then((r) => r.json())
            .then((d) => setFriendStatus(d.status ?? {}))
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [params.id, session?.user?.id, router]);

  const handleJoin = async () => {
    if (!session) {
      router.push("/auth/signin?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/posts/${params.id}/join`, {
        method: "POST",
      });
      if (res.ok) {
        setIsParticipant(true);
        setPost((p) =>
          p
            ? {
                ...p,
                joinedCount: p.joinedCount + 1,
                status: p.joinedCount + 1 >= p.totalPlayers ? "FULL" : p.status,
                participants: [
                  ...p.participants,
                  {
                    user: {
                      id: session.user!.id!,
                      name: session.user?.name ?? null,
                      image: session.user?.image ?? null,
                    },
                  },
                ],
              }
            : null
        );
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/posts/${params.id}/leave`, {
        method: "POST",
      });
      if (res.ok) {
        setIsParticipant(false);
        setPost((p) =>
          p
            ? {
                ...p,
                joinedCount: p.joinedCount - 1,
                status: "OPEN",
                participants: p.participants.filter(
                  (x) => x.user.id !== session?.user?.id
                ),
              }
            : null
        );
      }
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async () => {
    if (!post || post.creator.id !== session?.user?.id) return;
    if (!confirm("Are you sure you want to delete this game? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!session) return;
    setAddingFriendId(userId);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: userId }),
      });
      if (res.ok) {
        setFriendStatus((prev) => ({
          ...prev,
          [userId]: { ...prev[userId], requestPending: true },
        }));
        toast.success("Friend request sent");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not add friend");
      }
    } finally {
      setAddingFriendId(null);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!post || post.creator.id !== session?.user?.id) return;
    setRemovingId(userId);
    try {
      const res = await fetch(
        `/api/posts/${params.id}/remove-participant?userId=${encodeURIComponent(userId)}`,
        { method: "POST" }
      );
      if (res.ok) {
        setPost((p) =>
          p
            ? {
                ...p,
                joinedCount: p.joinedCount - 1,
                status: "OPEN",
                participants: p.participants.filter((x) => x.user.id !== userId),
              }
            : null
        );
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not remove");
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || !post) {
    if (loading) {
      return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
          <Skeleton className="h-9 w-24" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Post not found
      </div>
    );
  }

  const canJoin =
    session &&
    post.creator.id !== session.user?.id &&
    !isParticipant &&
    post.status === "OPEN" &&
    post.joinedCount < post.totalPlayers;

  const showJoinPrompt = !session && post.status === "OPEN" && post.joinedCount < post.totalPlayers;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <Button variant="ghost" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const url = window.location.href;
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }}
                aria-label="Copy link"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Badge variant="secondary">{post.sport}</Badge>
              {session && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    const locId = post.location.id;
                    if (!locId) return;
                    if (isFavorite) {
                      await fetch(`/api/favorites/${locId}`, {
                        method: "DELETE",
                      });
                      setIsFavorite(false);
                    } else {
                      await fetch(`/api/favorites/${locId}`, {
                        method: "POST",
                      });
                      setIsFavorite(true);
                    }
                  }}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">{post.location.label}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span>
              {format(new Date(post.startTime), "EEE, MMM d 'at' h:mm a")}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{post.durationMinutes} min</span>
            <span className="text-muted-foreground">•</span>
            <span>
              {post.joinedCount}/{post.totalPlayers} players
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{post.skillLevel}</span>
            {post.visibility === "INVITE_ONLY" && (
              <>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline">Invite only</Badge>
              </>
            )}
          </div>

          {post.description && (
            <p className="text-muted-foreground">{post.description}</p>
          )}

          {canJoin && (
            <Button onClick={handleJoin} disabled={joining} aria-label="Join this game">
              <UserPlus className="mr-2 h-4 w-4" />
              Join game
            </Button>
          )}

          {showJoinPrompt && (
            <Button
              onClick={() =>
                router.push(
                  "/auth/signin?callbackUrl=" +
                    encodeURIComponent(window.location.pathname)
                )
              }
              aria-label="Sign in to join this game"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Sign in to join
            </Button>
          )}

          {isParticipant && post.creator.id !== session?.user?.id && (
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={joining}
              aria-label="Leave this game"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Leave
            </Button>
          )}

          {post.creator.id === session?.user?.id && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete this game"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete game
            </Button>
          )}

          <div>
            <h3 className="mb-2 font-semibold">Participants</h3>
            <div className="flex flex-wrap gap-2">
              {post.participants.map((p) => {
                const status = friendStatus[p.user.id];
                const isSelf = p.user.id === session?.user?.id;
                const canAddFriend =
                  session &&
                  !isSelf &&
                  status &&
                  !status.isFriend &&
                  !status.requestPending;

                return (
                  <div
                    key={p.user.id}
                    className="flex items-center gap-1 rounded-md border px-2 py-1"
                  >
                    {isSelf ? (
                      <span>{p.user.name ?? "Anonymous"}</span>
                    ) : (
                      <Link
                        href={`/users/${p.user.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.user.name ?? "Anonymous"}
                      </Link>
                    )}
                    {p.user.id === post.creator.id && (
                      <Badge variant="secondary" className="text-xs">
                        Host
                      </Badge>
                    )}
                    {status?.isFriend && !isSelf && (
                      <Badge variant="outline" className="text-xs">
                        Friend
                      </Badge>
                    )}
                    {status?.requestPending && !isSelf && (
                      <Badge variant="secondary" className="text-xs">
                        Request sent
                      </Badge>
                    )}
                    {canAddFriend && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleAddFriend(p.user.id)}
                        disabled={addingFriendId === p.user.id}
                        aria-label={`Add ${p.user.name ?? "participant"} as friend`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {post.creator.id === session?.user?.id &&
                      p.user.id !== post.creator.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveParticipant(p.user.id)}
                          disabled={removingId === p.user.id}
                          aria-label={`Remove ${p.user.name ?? "participant"} from game`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
