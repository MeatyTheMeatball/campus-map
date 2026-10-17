import type { CampusEvent } from "../types";

export interface EventsResponse {
  events: CampusEvent[];
  source: "suitable" | "sample" | "import";
  message: string;
}

export async function fetchCampusEvents(): Promise<EventsResponse> {
  const res = await fetch("/api/events");
  if (!res.ok) {
    throw new Error("Could not load campus events.");
  }
  return (await res.json()) as EventsResponse;
}

export async function importEventJson(payload: unknown): Promise<EventsResponse> {
  const res = await fetch("/api/events/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Could not import events.");
  }
  return (await res.json()) as EventsResponse;
}
