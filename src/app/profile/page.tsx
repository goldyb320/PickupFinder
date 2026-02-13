"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [profile, setProfile] = useState<{
    bio: string | null;
    profileImage: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          setProfile(data);
          setBio(data.bio ?? "");
        })
        .catch(() => {});
    }
  }, [status]);

  const avatarUrl = profile?.avatarUrl ?? session?.user?.image ?? undefined;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Upload failed");
        return;
      }
      const { url } = await res.json();
      const updateRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: url }),
      });
      if (updateRes.ok) {
        setProfile((p) => (p ? { ...p, profileImage: url, avatarUrl: url } : null));
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: null }),
      });
      if (res.ok) {
        setProfile((p) =>
          p ? { ...p, profileImage: null, avatarUrl: session?.user?.image ?? null } : null
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() || null }),
      });
      if (res.ok) {
        setProfile((p) => (p ? { ...p, bio: bio.trim() || null } : null));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save bio");
      }
    } catch {
      toast.error("Failed to save bio");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Please sign in to view your profile
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 sm:px-8 lg:px-12 py-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {session.user?.name?.[0] ?? session.user?.email?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {session.user?.name ?? "Anonymous"}
              </h2>
              <p className="text-muted-foreground">{session.user?.email}</p>
              {profile?.profileImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Remove photo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Profile photo defaults to your Google account picture. Upload a custom photo or remove it to use the default.
          </p>
          <p className="text-sm text-muted-foreground">
            Manage your account through your sign-in provider.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">About</h2>
          <p className="text-sm text-muted-foreground">
            Optional description that others can see on your profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            placeholder="Add a short bio..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{bio.length}/500</span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBio}
              disabled={saving}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Appearance</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <Label htmlFor="dark-mode" className="cursor-pointer">
                Dark mode
              </Label>
            </div>
            <Switch
              id="dark-mode"
              checked={isDark}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
