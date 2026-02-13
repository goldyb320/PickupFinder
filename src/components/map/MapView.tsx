"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { clusterPosts100m, type MapPost, type Cluster } from "@/lib/haversine";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CHICAGO = { lng: -87.6298, lat: 41.8781 };

interface MapViewProps {
  onClusterClick: (posts: MapPost[]) => void;
  onPostClick?: (post: MapPost) => void;
  onMapClick?: (lat: number, lng: number) => void;
  filters?: {
    sport?: string;
    timeWindow?: string;
    needsPlayersOnly?: boolean;
  };
}

export function MapView({
  onClusterClick,
  onPostClick,
  onMapClick,
  filters = {},
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [viewport, setViewport] = useState({
    north: 42.0,
    south: 41.6,
    east: -87.4,
    west: -87.9,
  });
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams({
      north: viewport.north.toString(),
      south: viewport.south.toString(),
      east: viewport.east.toString(),
      west: viewport.west.toString(),
    });
    if (filters.sport) params.set("sport", filters.sport);
    if (filters.timeWindow) params.set("timeWindow", filters.timeWindow);
    if (filters.needsPlayersOnly) params.set("needsPlayersOnly", "true");

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/viewport?${params}`);
      const text = await res.text();
      if (!res.ok) {
        console.error("Viewport API error:", res.status, text);
        setPosts([]);
        return;
      }
      const data = text ? JSON.parse(text) : [];
      setPosts(data);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [viewport, filters.sport, filters.timeWindow, filters.needsPlayersOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!mapRef.current || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [CHICAGO.lng, CHICAGO.lat],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      const target = e.originalEvent?.target as HTMLElement;
      if (target?.closest?.(".mapboxgl-marker")) return;
      onMapClick?.(e.lngLat.lat, e.lngLat.lng);
    };
    map.on("click", handleMapClick);

    map.on("moveend", () => {
      const b = map.getBounds();
      if (b) {
        setViewport({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
    });

    mapInstance.current = map;
    return () => {
      map.off("click", handleMapClick);
      map.remove();
      mapInstance.current = null;
    };
  }, [onMapClick]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!mapInstance.current) return;

    const map = mapInstance.current;
    const clustered = clusterPosts100m(posts);

    for (const item of clustered) {
      if ("isCluster" in item && item.isCluster) {
        const cluster = item as Cluster;
        const el = document.createElement("div");
        el.className =
          "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg";
        el.textContent = cluster.posts.length.toString();
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${cluster.posts.length} games at this location`);
        el.addEventListener("click", () => onClusterClick(cluster.posts));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([cluster.lng, cluster.lat])
          .addTo(map);
        markersRef.current.push(marker);
      } else {
        const post = item as MapPost;
        const el = document.createElement("div");
        el.className =
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-green-600 text-white font-semibold shadow text-xs";
        el.textContent = "1";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `1 game: ${post.title ?? "Pickup game"}`);
        el.addEventListener("click", () => {
          if (onPostClick) onPostClick(post);
          else onClusterClick([post]);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([post.lng, post.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [posts, onClusterClick, onPostClick]);

  const locateMe = () => {
    if (!mapInstance.current) return;
    if (!navigator.geolocation) {
      mapInstance.current.flyTo({
        center: [CHICAGO.lng, CHICAGO.lat],
        zoom: 11,
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstance.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
      },
      () => {
        mapInstance.current?.flyTo({
          center: [CHICAGO.lng, CHICAGO.lat],
          zoom: 11,
        });
      }
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <Button
        size="icon"
        className="absolute bottom-4 right-4 shadow-lg"
        onClick={locateMe}
        aria-label="Locate me"
      >
        <LocateFixed className="h-5 w-5" />
      </Button>
      {loading && (
        <div className="absolute left-4 top-4">
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      )}
    </div>
  );
}
