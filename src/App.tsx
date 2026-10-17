import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILDINGS, CATEGORY_LABEL, getBuilding } from "./data/buildings";
import { CampusMap } from "./components/CampusMap";
import {
  classesOnDay,
  formatDays,
  loadSchedule,
  newClassId,
  nextClass,
  saveSchedule,
  todayWeekday,
} from "./lib/schedule";
import { fetchCampusEvents } from "./lib/suitable";
import type {
  BuildingCategory,
  CampusEvent,
  ClassMeeting,
  MapLayer,
  UserLocation,
  Weekday,
} from "./types";

const DAYS: Weekday[] = ["M", "T", "W", "R", "F"];
const KEY_STORAGE = "claflin-maps-api-key";

const CATEGORIES: BuildingCategory[] = [
  "academic",
  "residence",
  "admin",
  "dining",
  "athletics",
  "student-life",
  "landmark",
];

export default function App() {
  const [apiKey, setApiKey] = useState(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem(KEY_STORAGE) || "",
  );
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BuildingCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"explore" | "events" | "schedule">("explore");
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({
    buildings: true,
    events: true,
    classes: true,
  });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [eventsMessage, setEventsMessage] = useState("Loading campus events…");
  const [classes, setClasses] = useState<ClassMeeting[]>(() => loadSchedule());
  const [classForm, setClassForm] = useState({
    courseCode: "",
    title: "",
    buildingId: BUILDINGS[0].id,
    room: "",
    days: ["M", "W", "F"] as Weekday[],
    startTime: "09:00",
    endTime: "09:50",
  });

  const selected = selectedId ? getBuilding(selectedId) : undefined;
  const upcoming = nextClass(classes);
  const todaysClasses = classesOnDay(classes, todayWeekday());

  const filteredBuildings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILDINGS.filter((b) => {
      const catOk = category === "all" || b.category === category;
      const text = `${b.name} ${b.shortName} ${b.description} ${b.aliases.join(" ")}`.toLowerCase();
      return catOk && (!q || text.includes(q));
    });
  }, [query, category]);

  useEffect(() => {
    saveSchedule(classes);
  }, [classes]);

  useEffect(() => {
    fetchCampusEvents()
      .then((res) => {
        setEvents(res.events);
        setEventsMessage(res.message);
      })
      .catch(() => {
        setEventsMessage("Could not reach the events service.");
      });
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("This browser does not support location.");
      return;
    }
    setTracking(true);
    setGeoError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Enable it to see yourself on the map."
            : "Could not read your location. Try again outdoors or check device settings.",
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!tracking) return;
    return startTracking();
  }, [tracking, startTracking]);

  function saveKey(e: React.FormEvent) {
    e.preventDefault();
    const next = keyDraft.trim();
    localStorage.setItem(KEY_STORAGE, next);
    setApiKey(next);
  }

  function addClass(e: React.FormEvent) {
    e.preventDefault();
    if (!classForm.courseCode.trim() || classForm.days.length === 0) return;
    setClasses((prev) => [
      ...prev,
      {
        id: newClassId(),
        courseCode: classForm.courseCode.trim().toUpperCase(),
        title: classForm.title.trim() || classForm.courseCode.trim(),
        buildingId: classForm.buildingId,
        room: classForm.room.trim(),
        days: classForm.days,
        startTime: classForm.startTime,
        endTime: classForm.endTime,
      },
    ]);
    setClassForm((f) => ({ ...f, courseCode: "", title: "", room: "" }));
    setTab("schedule");
    setLayers((l) => ({ ...l, classes: true }));
  }

  function toggleDay(day: Weekday) {
    setClassForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="crest">CU</span>
          <div>
            <p className="eyebrow">Claflin University</p>
            <h1>Campus Map</h1>
          </div>
        </div>
        <div className="top-actions">
          <button className={tracking ? "ghost on" : "ghost"} onClick={() => setTracking((v) => !v)}>
            {tracking ? "Location on" : "Share location"}
          </button>
          {upcoming && (
            <button className="ghost accent" onClick={() => setSelectedId(upcoming.buildingId)}>
              Next class · {upcoming.courseCode}
            </button>
          )}
        </div>
      </header>

      <aside className="sidebar">
        <label className="search">
          <span>Search campus</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Building, class, or event"
          />
        </label>

        <div className="tabs" role="tablist">
          {(["explore", "events", "schedule"] as const).map((id) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {id === "explore" ? "Buildings" : id === "events" ? "Events" : "Schedule"}
            </button>
          ))}
        </div>

        {tab === "explore" && (
          <section>
            <div className="chips">
              <button className={category === "all" ? "chip on" : "chip"} onClick={() => setCategory("all")}>
                All
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} className={category === c ? "chip on" : "chip"} onClick={() => setCategory(c)}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            <ul className="list">
              {filteredBuildings.map((b) => (
                <li key={b.id}>
                  <button className={selectedId === b.id ? "row selected" : "row"} onClick={() => setSelectedId(b.id)}>
                    <strong>{b.name}</strong>
                    <span>
                      {CATEGORY_LABEL[b.category]}
                      {b.shortName !== b.name.split(" ")[0] ? ` · ${b.shortName}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "events" && (
          <section>
            <p className="note">{eventsMessage}</p>
            <ul className="list">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    className="row"
                    onClick={() => event.buildingId && setSelectedId(event.buildingId)}
                  >
                    <strong>{event.title}</strong>
                    <span>
                      {formatWhen(event.start)} · {event.locationText}
                      {event.buildingId ? "" : " · location unmatched"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "schedule" && (
          <section>
            <form className="class-form" onSubmit={addClass}>
              <h2>Add a class</h2>
              <input
                required
                value={classForm.courseCode}
                onChange={(e) => setClassForm((f) => ({ ...f, courseCode: e.target.value }))}
                placeholder="Course code · e.g. BIOL 101"
              />
              <input
                value={classForm.title}
                onChange={(e) => setClassForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title (optional)"
              />
              <select
                value={classForm.buildingId}
                onChange={(e) => setClassForm((f) => ({ ...f, buildingId: e.target.value }))}
              >
                {BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                value={classForm.room}
                onChange={(e) => setClassForm((f) => ({ ...f, room: e.target.value }))}
                placeholder="Room · e.g. 214"
              />
              <div className="days">
                {DAYS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={classForm.days.includes(d) ? "chip on" : "chip"}
                    onClick={() => toggleDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="times">
                <label>
                  Starts
                  <input
                    type="time"
                    value={classForm.startTime}
                    onChange={(e) => setClassForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </label>
                <label>
                  Ends
                  <input
                    type="time"
                    value={classForm.endTime}
                    onChange={(e) => setClassForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </label>
              </div>
              <button type="submit" className="primary">
                Place on map
              </button>
            </form>

            <h2>Today</h2>
            {todaysClasses.length === 0 && <p className="note">No classes scheduled for today.</p>}
            <ul className="list">
              {todaysClasses.map((c) => {
                const b = getBuilding(c.buildingId);
                return (
                  <li key={c.id}>
                    <button className="row" onClick={() => setSelectedId(c.buildingId)}>
                      <strong>
                        {c.startTime} · {c.courseCode}
                      </strong>
                      <span>
                        {c.title} · {b?.shortName} {c.room}
                      </span>
                    </button>
                    <button className="mini danger" onClick={() => setClasses((prev) => prev.filter((x) => x.id !== c.id))}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>

            {classes.length > todaysClasses.length && (
              <>
                <h2>All classes</h2>
                <ul className="list">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <button className="row" onClick={() => setSelectedId(c.buildingId)}>
                        <strong>{c.courseCode}</strong>
                        <span>
                          {formatDays(c.days)} · {c.startTime}–{c.endTime}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </aside>

      <main className="stage">
        {!apiKey ? (
          <form className="key-card" onSubmit={saveKey}>
            <p className="eyebrow">Google Maps</p>
            <h2>Add your Maps API key</h2>
            <p>
              Create a key in Google Cloud and enable the Maps JavaScript API, then
              paste it here. It is stored only in this browser. You can also put it in{" "}
              <code>.env</code> as <code>VITE_GOOGLE_MAPS_API_KEY</code>.
            </p>
            <input
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
            />
            <button className="primary" type="submit">
              Load campus map
            </button>
          </form>
        ) : (
          <CampusMap
            apiKey={apiKey}
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
            selectedBuildingId={selectedId}
            userLocation={userLocation}
            events={events}
            classes={classes}
            layers={layers}
            onSelectBuilding={setSelectedId}
            onMapError={setMapError}
          />
        )}

        <div className="map-hud">
          <div className="layers">
            {(Object.keys(layers) as MapLayer[]).map((layer) => (
              <label key={layer}>
                <input
                  type="checkbox"
                  checked={layers[layer]}
                  onChange={() => setLayers((l) => ({ ...l, [layer]: !l[layer] }))}
                />
                {layer}
              </label>
            ))}
          </div>
          {geoError && <p className="hud-msg">{geoError}</p>}
          {mapError && <p className="hud-msg">{mapError}</p>}
        </div>

        {selected && (
          <article className="detail">
            <p className="eyebrow">{CATEGORY_LABEL[selected.category]}</p>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="detail-actions">
              <button className="ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
