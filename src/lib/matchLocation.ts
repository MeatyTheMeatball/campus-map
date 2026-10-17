import { BUILDINGS } from "../data/buildings";
import type { Building } from "../types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchBuilding(locationText: string): Building | null {
  const haystack = normalize(locationText);
  if (!haystack) return null;

  let best: { building: Building; score: number } | null = null;

  for (const building of BUILDINGS) {
    const names = [building.name, building.shortName, building.id, ...building.aliases];
    for (const name of names) {
      const needle = normalize(name);
      if (!needle) continue;
      if (haystack === needle) return building;
      if (haystack.includes(needle) || needle.includes(haystack)) {
        const score = needle.length;
        if (!best || score > best.score) best = { building, score };
      }
    }
  }

  return best?.building ?? null;
}
