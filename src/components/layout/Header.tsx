"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, PlusCircle, Heart, Bell, Users, Calendar, ChevronDown } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchCount = () =>
      fetch("/api/notifications/count")
        .then((r) => r.json())
        .then((data) => setUnreadCount(data.count ?? 0))
        .catch(() => {});
    fetchCount();
    const onFocus = () => fetchCount();
    const onNotificationRemoved = () => fetchCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener("notification-removed", onNotificationRemoved);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notification-removed", onNotificationRemoved);
    };
  }, [status, pathname]);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-6 sm:px-8 lg:px-12 backdrop-blur">
            <Link href="/" className="flex items-center gap-2 font-bold" aria-label="OpenRun home">
        <MapPin className="h-6 w-6 text-primary" />
        OpenRun
      </Link>

      <nav className="flex items-center gap-2" aria-label="Main navigation">
        {status === "authenticated" ? (
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/my-games" aria-label="My games">
                <Calendar className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/posts/new" aria-label="Create post">
                <PlusCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/favorites" aria-label="Favorites">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/friends" aria-label="Friends">
                <Users className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link
                href="/notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Go to profile"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user?.image ?? undefined} />
                  <AvatarFallback>
                    {session.user?.name?.[0] ?? session.user?.email?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Open account menu"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/my-games">My Games</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </>
        ) : (
          <Button asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
