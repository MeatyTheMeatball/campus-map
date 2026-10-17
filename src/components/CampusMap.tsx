import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { BUILDINGS, CAMPUS_BOUNDS, CAMPUS_CENTER, CATEGORY_LABEL } from "../data/buildings";
import type { Building, CampusEvent, ClassMeeting, MapLayer, UserLocation } from "../types";
import { isClassNow } from "../lib/schedule";

const CATEGORY_COLOR: Record<Building["category"], string> = {
  academic: "#1f4b8f",
  residence: "#7a1f2b",
  admin: "#8a5a12",
  dining: "#c45c12",
  athletics: "#0f6b4c",
  "student-life": "#5b2d8e",
  landmark: "#b45309",
};

interface CampusMapProps {
  apiKey: string;
  mapId?: string;
  selectedBuildingId: string | null;
  userLocation: UserLocation | null;
  events: CampusEvent[];
  classes: ClassMeeting[];
  layers: Record<MapLayer, boolean>;
  onSelectBuilding: (id: string) => void;
  onMapError: (error: string | null) => void;
}

export function CampusMap({
  apiKey,
  mapId,
  selectedBuildingId,
  userLocation,
  events,
  classes,
  layers,
  onSelectBuilding,
  onMapError,
}: CampusMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const buildingMarkers = useRef<google.maps.Marker[]>([]);
  const eventMarkers = useRef<google.maps.Marker[]>([]);
  const classMarkers = useRef<google.maps.Marker[]>([]);
  const userMarker = useRef<google.maps.Marker | null>(null);
  const accuracyCircle = useRef<google.maps.Circle | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const onSelectRef = useRef(onSelectBuilding);
  const onMapErrorRef = useRef(onMapError);
  onSelectRef.current = onSelectBuilding;
  onMapErrorRef.current = onMapError;

  useEffect(() => {
    if (!hostRef.current || !apiKey) return;
    let cancelled = false;

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places"],
    });

    loader.load().then(() => {
      if (cancelled || !hostRef.current) return;
      const map = new google.maps.Map(hostRef.current, {
        center: CAMPUS_CENTER,
        zoom: 17,
        mapTypeId: "hybrid",
        tilt: 0,
        mapId: mapId || undefined,
        restriction: {
          latLngBounds: CAMPUS_BOUNDS,
          strictBounds: false,
        },
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: false,
        clickableIcons: false,
        styles: mapId
          ? undefined
          : [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
            ],
      });
      mapRef.current = map;
      infoRef.current = new google.maps.InfoWindow();

      buildingMarkers.current = BUILDINGS.map((building) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: building.lat, lng: building.lng },
          title: building.name,
          label: {
            text: building.shortName,
            color: "#1c1412",
            fontSize: "11px",
            fontWeight: "700",
            fontFamily: "Manrope, sans-serif",
          },
          icon: pin(CATEGORY_COLOR[building.category]),
          zIndex: 10,
        });
        marker.addListener("click", () => {
          onSelectRef.current(building.id);
          infoRef.current?.setContent(
            `<div class="map-info"><strong>${building.name}</strong><span>${CATEGORY_LABEL[building.category]}</span><p>${building.description}</p></div>`,
          );
          infoRef.current?.open({ map, anchor: marker });
        });
        return marker;
      });
      setMapReady(true);
      onMapErrorRef.current(null);
    }).catch(() => {
      if (!cancelled) onMapErrorRef.current("Google Maps could not load. Check the API key and Maps JavaScript API access.");
    });

    return () => {
      cancelled = true;
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    buildingMarkers.current.forEach((marker, i) => {
      const building = BUILDINGS[i];
      const selected = building.id === selectedBuildingId;
      marker.setVisible(layers.buildings);
      marker.setZIndex(selected ? 200 : 10);
      marker.setIcon(pin(CATEGORY_COLOR[building.category], selected));
      if (selected) {
        map.panTo({ lat: building.lat, lng: building.lng });
      }
    });
  }, [mapReady, selectedBuildingId, layers.buildings]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    eventMarkers.current.forEach((m) => m.setMap(null));
    eventMarkers.current = [];
    if (!layers.events) return;

    events.forEach((event) => {
      const building = BUILDINGS.find((b) => b.id === event.buildingId);
      if (!building) return;
      const marker = new google.maps.Marker({
        map,
        position: offset(building.lat, building.lng, 0.00012, 0),
        title: event.title,
        icon: pin("#f47b20", true),
        zIndex: 80,
      });
      marker.addListener("click", () => {
        onSelectRef.current(building.id);
        infoRef.current?.setContent(
          `<div class="map-info"><strong>${event.title}</strong><span>${event.locationText}</span><p>${event.description}</p></div>`,
        );
        infoRef.current?.open({ map, anchor: marker });
      });
      eventMarkers.current.push(marker);
    });
  }, [mapReady, events, layers.events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    classMarkers.current.forEach((m) => m.setMap(null));
    classMarkers.current = [];
    if (!layers.classes) return;

    classes.forEach((meeting, index) => {
      const building = BUILDINGS.find((b) => b.id === meeting.buildingId);
      if (!building) return;
      const live = isClassNow(meeting);
      const marker = new google.maps.Marker({
        map,
        position: offset(building.lat, building.lng, 0, 0.00012 + index * 0.00002),
        title: `${meeting.courseCode} · ${meeting.title}`,
        icon: pin(live ? "#0f6b4c" : "#1f4b8f", live),
        zIndex: live ? 120 : 60,
      });
      marker.addListener("click", () => {
        onSelectRef.current(building.id);
        infoRef.current?.setContent(
          `<div class="map-info"><strong>${meeting.courseCode}</strong><span>${meeting.title} · ${meeting.room || "Room TBA"}</span><p>${building.name}</p></div>`,
        );
        infoRef.current?.open({ map, anchor: marker });
      });
      classMarkers.current.push(marker);
    });
  }, [mapReady, classes, layers.classes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    const position = { lat: userLocation.lat, lng: userLocation.lng };
    map.panTo(position);
    if (!userMarker.current) {
      userMarker.current = new google.maps.Marker({
        map,
        position,
        title: "You are here",
        zIndex: 300,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      accuracyCircle.current = new google.maps.Circle({
        map,
        center: position,
        radius: userLocation.accuracy,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.35,
        strokeWeight: 1,
      });
    } else {
      userMarker.current.setPosition(position);
      accuracyCircle.current?.setCenter(position);
      accuracyCircle.current?.setRadius(userLocation.accuracy);
    }
  }, [mapReady, userLocation]);

  return <div ref={hostRef} className="map-canvas" role="application" aria-label="Claflin University campus map" />;
}

function pin(color: string, selected = false): google.maps.Symbol {
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: selected ? "#fff6e8" : "#1c1412",
    strokeWeight: selected ? 2.5 : 1.2,
    scale: selected ? 1.85 : 1.45,
    anchor: new google.maps.Point(12, 22),
    labelOrigin: new google.maps.Point(12, -8),
  };
}

function offset(lat: number, lng: number, dLat: number, dLng: number) {
  return { lat: lat + dLat, lng: lng + dLng };
}
