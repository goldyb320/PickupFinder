"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { UserPlus, UserMinus, Check } from "lucide-react";
import { toast } from "sonner";
import type { MapPost } from "@/lib/haversine";

interface PostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: MapPost[];
  onPostSelect?: (post: MapPost) => void;
}

export function PostSheet({
  open,
  onOpenChange,
  posts,
  onPostSelect,
}: PostSheetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && session) {
      fetch("/api/posts/joined-ids")
        .then((r) => r.json())
        .then((d) => setJoinedIds(new Set(d.joinedIds ?? [])))
        .catch(() => {});
    }
  }, [open, session]);

  const sorted = [...posts].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const handleJoin = async (post: MapPost) => {
    if (!session) {
      router.push("/auth/signin?callbackUrl=/");
      return;
    }
    setJoiningId(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}/join`, { method: "POST" });
      if (res.ok) {
        setJoinedIds((prev) => new Set([...prev, post.id]));
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not join");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (post: MapPost) => {
    if (!session) return;
    setLeavingId(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}/leave`, { method: "POST" });
      if (res.ok) {
        setJoinedIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not leave");
      }
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] px-6 sm:px-8 pb-8">
        <SheetHeader>
          <SheetTitle>
            {posts.length} game{posts.length !== 1 ? "s" : ""} nearby
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(60vh-80px)]">
          <div className="space-y-3 pr-4">
            {sorted.map((post) => (
              <div
                key={post.id}
                className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.locationLabel}
                    </p>
                  </div>
                  <Badge variant="secondary">{post.sport}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>
                    {format(new Date(post.startTime), "EEE, MMM d 'at' h:mm a")}
                  </span>
                  <span className="text-muted-foreground">
                    {post.joinedCount ?? 0}/{post.totalPlayers} players
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {joinedIds.has(post.id) ? (
                    <>
                      <Button size="sm" variant="secondary" disabled>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Joined
                      </Button>
                      {session?.user?.id !== (post.creatorId as string | undefined) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeave(post);
                          }}
                          disabled={leavingId === post.id}
                          aria-label={`Leave ${post.title}`}
                        >
                          <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                          Leave
                        </Button>
                      )}
                    </>
                  ) : (post.joinedCount ?? 0) < post.totalPlayers &&
                    post.status !== "FULL" ? (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(post);
                      }}
                      disabled={joiningId === post.id}
                      aria-label={`Join ${post.title}`}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Join
                    </Button>
                  ) : null}
                  {onPostSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPostSelect(post)}
                      aria-label={`View details for ${post.title}`}
                    >
                      View details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
