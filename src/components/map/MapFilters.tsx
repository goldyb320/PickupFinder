"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { List, Map } from "lucide-react";

const SPORTS = [
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

interface MapFiltersProps {
  sport: string;
  timeWindow: string;
  needsPlayersOnly: boolean;
  viewMode: "map" | "list";
  onSportChange: (sport: string) => void;
  onTimeWindowChange: (tw: string) => void;
  onNeedsPlayersChange: (v: boolean) => void;
  onViewModeChange: (mode: "map" | "list") => void;
}

export function MapFilters({
  sport,
  timeWindow,
  needsPlayersOnly,
  viewMode,
  onSportChange,
  onTimeWindowChange,
  onNeedsPlayersChange,
  onViewModeChange,
}: MapFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={sport || "_all"} onValueChange={(v) => onSportChange(v === "_all" ? "" : v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sport" />
        </SelectTrigger>
        <SelectContent>
          {SPORTS.map((s) => (
            <SelectItem key={s.value || "_all"} value={s.value || "_all"}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={timeWindow || "_all"} onValueChange={(v) => onTimeWindowChange(v === "_all" ? "" : v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All times</SelectItem>
          <SelectItem value="2h">Next 2 hours</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="weekend">Weekend</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={needsPlayersOnly ? "default" : "outline"}
        size="sm"
        onClick={() => onNeedsPlayersChange(!needsPlayersOnly)}
      >
        Needs players
      </Button>

      <div className="flex rounded-md border">
        <Button
          variant={viewMode === "map" ? "default" : "ghost"}
          size="sm"
          className="rounded-r-none"
          onClick={() => onViewModeChange("map")}
        >
          <Map className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          className="rounded-l-none"
          onClick={() => onViewModeChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
