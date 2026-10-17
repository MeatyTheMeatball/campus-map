import type { CampusEvent } from "../types";

function atDay(daysFromToday: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Demo events used until Suitable credentials are configured. */
export const SAMPLE_EVENTS: CampusEvent[] = [
  {
    id: "sample-sga",
    title: "SGA General Body Meeting",
    description: "Student Government Association meeting — all students welcome.",
    locationText: "Student Center",
    buildingId: "student-center",
    start: atDay(0, 18, 0),
    end: atDay(0, 19, 30),
    source: "sample",
  },
  {
    id: "sample-sab",
    title: "Student Activities Board Movie Night",
    description: "Outdoor screening on Panther Plaza. Bring a blanket.",
    locationText: "Panther Plaza",
    buildingId: "panther-plaza",
    start: atDay(0, 20, 0),
    end: atDay(0, 22, 0),
    source: "sample",
  },
  {
    id: "sample-chapel",
    title: "Midweek Chapel",
    description: "Weekly chapel gathering in Elmore Chapel.",
    locationText: "Elmore Chapel",
    buildingId: "chapel",
    start: atDay(1, 11, 0),
    end: atDay(1, 12, 0),
    source: "sample",
  },
  {
    id: "sample-career",
    title: "Career Development Drop-in Hours",
    description: "Resume reviews and internship questions.",
    locationText: "Corson Hall 134",
    buildingId: "corson",
    start: atDay(1, 13, 0),
    end: atDay(1, 16, 0),
    source: "sample",
  },
  {
    id: "sample-intramural",
    title: "Intramural Basketball",
    description: "Sign in at the gym. Suitable check-in at the door.",
    locationText: "Jonas T. Kennedy Center",
    buildingId: "jtk",
    start: atDay(2, 19, 0),
    end: atDay(2, 21, 0),
    source: "sample",
  },
  {
    id: "sample-orgfair",
    title: "Organization Fair Follow-up",
    description: "Meet club officers and pick up involvement pathways.",
    locationText: "Claflin University Student Center",
    buildingId: "student-center",
    start: atDay(3, 15, 0),
    end: atDay(3, 17, 0),
    source: "sample",
  },
];
