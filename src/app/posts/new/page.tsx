"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const SPORTS = [
  "BASKETBALL",
  "SOCCER",
  "TENNIS",
  "VOLLEYBALL",
  "PICKLEBALL",
  "ULTIMATE",
  "FLAG_FOOTBALL",
  "OTHER",
];
const SKILL_LEVELS = ["CASUAL", "MEDIUM", "COMPETITIVE"];
const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Anyone can join" },
  { value: "FRIENDS", label: "Friends can join" },
  { value: "INVITE_ONLY", label: "Invite only" },
];

function NewPostContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Array<{ id: string; label: string; lat: number; lng: number }>>([]);
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillLevel, setSkillLevel] = useState("CASUAL");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [friends, setFriends] = useState<Array<{ id: string; name: string | null; email: string; image: string | null }>>([]);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [totalPlayers, setTotalPlayers] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ placeName: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get("locationId");
  const labelParam = searchParams.get("label");
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  useEffect(() => {
    if (locationIdParam && status === "authenticated") {
      setLocationId(locationIdParam);
      if (labelParam) {
        setLocationLabel(decodeURIComponent(labelParam));
      }
      const lat = latParam ? parseFloat(latParam) : NaN;
      const lng = lngParam ? parseFloat(lngParam) : NaN;
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setSelectedCoords({ lat, lng });
      }
    }
  }, [locationIdParam, labelParam, latParam, lngParam, status]);

  useEffect(() => {
    if (status === "authenticated" && !locationIdParam) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((data) =>
          setFavorites(data.map((f: { location: { id: string; label: string; lat: number; lng: number } }) => f.location))
        )
        .catch(() => {});
    }
  }, [status, locationIdParam]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/friends/list")
        .then((r) => r.json())
        .then(setFriends)
        .catch(() => []);
    }
  }, [status]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearching(true);
      fetch(`/api/locations/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const selectSearchResult = async (result: { placeName: string; lat: number; lng: number }) => {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: result.placeName,
        lat: result.lat,
        lng: result.lng,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create location");
      return;
    }
    const loc = await res.json();
    setLocationId(loc.id);
    setLocationLabel(loc.label);
    setSelectedCoords({ lat: loc.lat, lng: loc.lng });
    setClickedPoint(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const selectFavorite = (loc: { id: string; label: string; lat: number; lng: number }) => {
    setLocationId(loc.id);
    setLocationLabel(loc.label);
    setSelectedCoords({ lat: loc.lat, lng: loc.lng });
    setClickedPoint(null);
  };

  const clearSelection = () => {
    setLocationId(null);
    setLocationLabel("");
    setSelectedCoords(null);
    setClickedPoint(null);
  };

  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/posts/new");
    return null;
  }

  useEffect(() => {
    if (!mapRef.current || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-87.6298, 41.8781],
      zoom: 11,
    });

    map.on("click", (e) => {
      if (!locationId) {
        setClickedPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setSelectedCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    if (mapRef.current) resizeObserver.observe(mapRef.current);

    mapInstance.current = map;
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, []);

  const coordsToShow = selectedCoords ?? clickedPoint;
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !coordsToShow) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const { lat, lng } = coordsToShow;
    map.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.className = "h-8 w-8 bg-primary rounded-full border-2 border-background shadow-md";
      el.style.backgroundColor = "var(--primary)";
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  }, [coordsToShow?.lat, coordsToShow?.lng]);

  const handleCreateLocation = async () => {
    if (!clickedPoint || !locationLabel.trim()) return;

    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: locationLabel.trim(),
        lat: clickedPoint.lat,
        lng: clickedPoint.lng,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create location");
      return;
    }

    const loc = await res.json();
    setLocationId(loc.id);
    setLocationLabel(loc.label);
    setSelectedCoords({ lat: loc.lat, lng: loc.lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !sport || !title.trim()) {
      toast.error("Please select a location, sport, and title");
      return;
    }

    const dateStr = startDate || new Date().toISOString().slice(0, 10);
    const timeStr = startTime || "12:00";
    const localDateTime = new Date(`${dateStr}T${timeStr}`);
    const startTimeUTC = localDateTime.toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          sport,
          title: title.trim(),
          description: description.trim() || undefined,
          skillLevel,
          visibility,
          startTime: startTimeUTC,
          durationMinutes,
          totalPlayers,
          invitedFriendIds: invitedFriendIds.length > 0 ? invitedFriendIds : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create post");
        return;
      }

      const post = await res.json();
      router.push(`/posts/${post.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:overflow-hidden">
      <div className="flex flex-1 flex-col border-b lg:border-b-0 lg:border-r lg:min-w-0">
        <div className="flex-none border-b p-4">
          <h1 className="text-xl font-bold">Create Game</h1>
          <h2 className="mt-1 text-sm font-medium text-muted-foreground">
            1. Select location
          </h2>
          <div className="relative mt-2">
            <Input
              placeholder="Search park, building, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border bg-background shadow-lg">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSearchResult(r)}
                  >
                    {r.placeName}
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <p className="mt-1 text-sm text-muted-foreground">Searching...</p>
            )}
          </div>
          {favorites.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {favorites.map((fav) => (
                <Button
                  key={fav.id}
                  variant={locationId === fav.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectFavorite(fav)}
                >
                  {fav.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="relative h-[50vh] min-h-[300px] shrink-0 lg:h-auto lg:min-h-[350px] lg:flex-1">
          <div
            ref={mapRef}
            className="h-full w-full rounded-b-lg lg:rounded-none"
          />
        </div>
        <div className="flex-none border-t p-4">
          {locationId ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Selected: {locationLabel}
              </Badge>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Change location
              </Button>
            </div>
          ) : clickedPoint ? (
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Location name (e.g. Lincoln Park Courts)"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="flex-1 min-w-[160px]"
              />
              <Button
                onClick={handleCreateLocation}
                disabled={!locationLabel.trim()}
              >
                Confirm
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click on the map to add a pin, or search and select above.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:w-[420px] lg:flex-none lg:overflow-y-auto"
      >
        <div className="flex-none border-b p-4">
          <h2 className="font-semibold">2. Game details</h2>
        </div>
        <Card className="m-0 flex-1 rounded-none border-0 border-t">
          <CardContent className="space-y-4 p-4">
            <div>
              <Label>Sport</Label>
              <Select value={sport} onValueChange={setSport} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Casual pickup basketball"
                required
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bring your own ball, water..."
              />
            </div>

            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Start time (local)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                max={480}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(parseInt(e.target.value, 10) || 90)
                }
              />
            </div>

            <div>
              <Label>Total players</Label>
              <Input
                type="number"
                min={2}
                max={50}
                value={totalPlayers}
                onChange={(e) =>
                  setTotalPlayers(parseInt(e.target.value, 10) || 6)
                }
              />
              {invitedFriendIds.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {invitedFriendIds.length} friend{invitedFriendIds.length !== 1 ? "s" : ""} added (slots filled)
                </p>
              )}
            </div>

            <div>
              <Label>Add friends (fills slots)</Label>
              <p className="mb-2 text-sm text-muted-foreground">
                Invite friends to automatically fill slots
              </p>
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.map((f) => (
                    <Button
                      key={f.id}
                      type="button"
                      variant={invitedFriendIds.includes(f.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setInvitedFriendIds((prev) =>
                          prev.includes(f.id)
                            ? prev.filter((id) => id !== f.id)
                            : [...prev, f.id]
                        )
                      }
                    >
                      {f.name ?? f.email}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Skill level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Who can join</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex-none border-t p-4">
          <Button
            type="submit"
            className="w-full"
            disabled={!locationId || submitting}
          >
            {submitting ? "Creating..." : "Create game"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <NewPostContent />
    </Suspense>
  );
}
