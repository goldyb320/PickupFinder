const EARTH_RADIUS_M = 6371000;

export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

const CLUSTER_RADIUS_M = 100;

export interface MapPost {
  id: string;
  lat: number;
  lng: number;
  sport: string;
  title: string;
  startTime: string;
  totalPlayers: number;
  joinedCount?: number;
  locationLabel?: string;
  [key: string]: unknown;
}

export interface Cluster {
  lat: number;
  lng: number;
  posts: MapPost[];
  isCluster: true;
}

export function clusterPosts100m(posts: MapPost[]): (MapPost | Cluster)[] {
  const result: (MapPost | Cluster)[] = [];
  const used = new Set<string>();

  for (const post of posts) {
    if (used.has(post.id)) continue;

    const nearby = posts.filter(
      (p) =>
        !used.has(p.id) &&
        haversineDistanceM(post.lat, post.lng, p.lat, p.lng) <= CLUSTER_RADIUS_M
    );

    if (nearby.length === 1) {
      result.push(post);
      used.add(post.id);
    } else {
      const centerLat =
        nearby.reduce((s, p) => s + p.lat, 0) / nearby.length;
      const centerLng =
        nearby.reduce((s, p) => s + p.lng, 0) / nearby.length;
      nearby.forEach((p) => used.add(p.id));
      result.push({
        lat: centerLat,
        lng: centerLng,
        posts: [...nearby].sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
        isCluster: true,
      });
    }
  }

  return result;
}
