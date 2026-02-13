"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddGameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
}

export function AddGameSheet({
  open,
  onOpenChange,
  lat,
  lng,
}: AddGameSheetProps) {
  const router = useRouter();
  const [locationLabel, setLocationLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!locationLabel.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: locationLabel.trim(),
          lat,
          lng,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create location");
        return;
      }

      const loc = await res.json();
      onOpenChange(false);
      setLocationLabel("");
      router.push(
        `/posts/new?locationId=${loc.id}&label=${encodeURIComponent(loc.label)}&lat=${loc.lat}&lng=${loc.lng}`
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 sm:px-8 pb-8">
        <SheetHeader>
          <SheetTitle>Add game at this location</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="location-name">Location name</Label>
            <Input
              id="location-name"
              placeholder="e.g. Lincoln Park Courts"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              className="mt-2"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!locationLabel.trim() || creating}
          >
            {creating ? "Creating..." : "Continue to create game"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
