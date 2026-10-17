export type BuildingCategory =
  | "academic"
  | "residence"
  | "admin"
  | "dining"
  | "athletics"
  | "student-life"
  | "landmark";

export interface Building {
  id: string;
  name: string;
  shortName: string;
  category: BuildingCategory;
  lat: number;
  lng: number;
  description: string;
  aliases: string[];
}

export type Weekday = "M" | "T" | "W" | "R" | "F" | "S" | "U";

export interface ClassMeeting {
  id: string;
  courseCode: string;
  title: string;
  buildingId: string;
  room: string;
  days: Weekday[];
  startTime: string;
  endTime: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  locationText: string;
  buildingId: string | null;
  start: string;
  end: string;
  source: "suitable" | "sample" | "import";
  url?: string;
}

export type MapLayer = "buildings" | "events" | "classes";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}
