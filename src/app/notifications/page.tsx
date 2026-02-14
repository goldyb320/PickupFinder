"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/notifications");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [status, router]);

  const handleMarkRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (res.ok) {
      setNotifications((n) => n.filter((x) => x.id !== id));
      window.dispatchEvent(new CustomEvent("notification-removed"));
    }
  };

  const handleFriendRequestResponse = async (
    requestId: string,
    action: "ACCEPT" | "DECLINE"
  ) => {
    const res = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to respond");
      return;
    }
    setNotifications((n) =>
      n.filter((x) => x.type !== "FRIEND_REQUEST" || x.data?.requestId !== requestId)
    );
    window.dispatchEvent(new CustomEvent("notification-removed"));
    if (action === "ACCEPT") {
      router.push("/friends");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const formatMessage = (n: Notification) => {
    switch (n.type) {
      case "FRIEND_REQUEST":
        return (n.data?.fromUserName as string) || "Someone sent you a friend request";
      case "TAGGED_IN_POST":
        return `You were tagged in "${n.data?.postTitle ?? "a post"}"`;
      case "JOINED_YOUR_POST":
        return `${(n.data?.joinedUserName as string) || "Someone"} joined your game "${n.data?.postTitle ?? ""}"`;
      default:
        return "New notification";
    }
  };

  const hasUnread = notifications.length > 0;

  const handleMarkAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (res.ok) {
      setNotifications([]);
      window.dispatchEvent(new CustomEvent("notification-removed"));
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            aria-label="Mark all notifications as read"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No notifications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When someone tags you or joins your games, you&apos;ll see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={n.readAt ? "opacity-75" : ""}
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {n.type === "FRIEND_REQUEST"
                      ? `${(n.data?.fromUserName as string) || "Someone"} sent you a friend request`
                      : formatMessage(n)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(n.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {n.type === "FRIEND_REQUEST" && typeof n.data?.requestId === "string" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleFriendRequestResponse(n.data!.requestId as string, "ACCEPT")
                        }
                        aria-label="Accept friend request"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleFriendRequestResponse(n.data!.requestId as string, "DECLINE")
                        }
                        aria-label="Decline friend request"
                      >
                        Decline
                      </Button>
                    </>
                  ) : null}
                  {n.type !== "FRIEND_REQUEST" && !n.readAt && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkRead(n.id)}
                      aria-label="Mark as read"
                    >
                      Mark read
                    </Button>
                  )}
                  {n.type === "FRIEND_REQUEST" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkRead(n.id)}
                      aria-label="Mark as read"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
