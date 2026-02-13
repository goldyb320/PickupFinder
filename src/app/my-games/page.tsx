"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { Calendar, Crown, User } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface MyGame {
  id: string;
  title: string;
  sport: string;
  startTime: string;
  durationMinutes: number;
  totalPlayers: number;
  joinedCount: number;
  status: string;
  location: { id: string; label: string; lat: number; lng: number };
  role: "hosting" | "participant";
  creator?: { id: string; name: string | null; image: string | null };
  participants: Array<{ user: { id: string; name: string | null; image: string | null } }>;
}

const DATE_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "hosting", label: "Hosting" },
  { value: "participant", label: "Participant" },
];

const SPORT_OPTIONS = [
  { value: "_all", label: "All sports" },
  { value: "BASKETBALL", label: "Basketball" },
  { value: "SOCCER", label: "Soccer" },
  { value: "TENNIS", label: "Tennis" },
  { value: "VOLLEYBALL", label: "Volleyball" },
  { value: "PICKLEBALL", label: "Pickleball" },
  { value: "ULTIMATE", label: "Ultimate" },
  { value: "FLAG_FOOTBALL", label: "Flag Football" },
  { value: "OTHER", label: "Other" },
];

export default function MyGamesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [games, setGames] = useState<MyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("upcoming");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("_all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/my-games");
      return;
    }
    if (status !== "authenticated") return;

    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (roleFilter) params.set("role", roleFilter);
    if (sportFilter && sportFilter !== "_all") params.set("sport", sportFilter);

    setLoading(true);
    fetch(`/api/posts/my-games?${params}`)
      .then((r) => r.json())
      .then(setGames)
      .finally(() => setLoading(false));
  }, [status, router, dateFilter, roleFilter, sportFilter]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid w-full gap-4 grid-cols-1 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-start space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <h1 className="text-2xl font-bold">My Games</h1>

      <div className="flex w-full flex-wrap justify-start gap-3">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="min-w-[180px] gap-1.5 text-left">
            <Calendar className="h-4 w-4 shrink-0" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="min-w-[160px] text-left">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="min-w-[180px] text-left">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            {SPORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {games.length === 0 ? (
        <div className="w-full rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No games found. Create a game or join one from the map!
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
        <div className="grid w-full justify-items-stretch gap-4 grid-cols-1 lg:grid-cols-2">
          {games.map((game) => {
            const isPast = new Date(game.startTime) < new Date();
            return (
              <Card
                key={game.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/posts/${game.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{game.title}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {game.location.label}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">{game.sport}</Badge>
                      <Badge
                        variant={game.role === "hosting" ? "default" : "outline"}
                        className="gap-1"
                      >
                        {game.role === "hosting" ? (
                          <>
                            <Crown className="h-3 w-3" />
                            Hosting
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            Participant
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-nowrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {format(new Date(game.startTime), "EEE, MMM d 'at' h:mm a")}
                    </span>
                    <span>•</span>
                    <span>
                      {game.joinedCount}/{game.totalPlayers} players
                    </span>
                    {isPast && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary">Past</Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
