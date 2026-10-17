import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadBuildings() {
  const file = fs.readFileSync(path.join(root, "src/data/buildings.ts"), "utf8");
  const matches = [...file.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?shortName:\s*"([^"]+)"[\s\S]*?aliases:\s*\[([\s\S]*?)\]/g)];
  return matches.map((m) => ({
    id: m[1],
    name: m[2],
    shortName: m[3],
    aliases: [...m[4].matchAll(/"([^"]+)"/g)].map((a) => a[1]),
  }));
}

function matchBuilding(locationText, buildings) {
  const haystack = normalize(locationText);
  if (!haystack) return null;
  let best = null;
  for (const building of buildings) {
    const names = [building.name, building.shortName, building.id, ...building.aliases];
    for (const name of names) {
      const needle = normalize(name);
      if (!needle) continue;
      if (haystack === needle) return building.id;
      if (haystack.includes(needle) || needle.includes(haystack)) {
        const score = needle.length;
        if (!best || score > best.score) best = { id: building.id, score };
      }
    }
  }
  return best?.id ?? null;
}

function atDay(offset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function sampleEvents(buildings) {
  const rows = [
    ["sample-sga", "SGA General Body Meeting", "Student Government Association meeting — all students welcome.", "Student Center", 0, 18, 19, 30],
    ["sample-sab", "Student Activities Board Movie Night", "Outdoor screening on Panther Plaza. Bring a blanket.", "Panther Plaza", 0, 20, 22, 0],
    ["sample-chapel", "Midweek Chapel", "Weekly chapel gathering in Elmore Chapel.", "Elmore Chapel", 1, 11, 12, 0],
    ["sample-career", "Career Development Drop-in Hours", "Resume reviews and internship questions.", "Corson Hall 134", 1, 13, 16, 0],
    ["sample-intramural", "Intramural Basketball", "Sign in at the gym. Suitable check-in at the door.", "Jonas T. Kennedy Center", 2, 19, 21, 0],
    ["sample-orgfair", "Organization Fair Follow-up", "Meet club officers and pick up involvement pathways.", "Claflin University Student Center", 3, 15, 17, 0],
  ];
  return rows.map((r) => ({
    id: r[0],
    title: r[1],
    description: r[2],
    locationText: r[3],
    buildingId: matchBuilding(r[3], buildings),
    start: atDay(r[4], r[5]),
    end: atDay(r[4], r[6], r[7]),
    source: "sample",
  }));
}

function pick(obj, keys) {
  for (const key of keys) {
    const parts = key.split(".");
    let cur = obj;
    for (const part of parts) {
      if (cur == null) break;
      cur = cur[part];
    }
    if (cur != null && cur !== "") return cur;
  }
  return undefined;
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["events", "activities", "data", "items", "results", "catalog"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function mapSuitableEvent(raw, index, buildings) {
  const locationText = String(
    pick(raw, ["location", "location_name", "venue", "place", "address", "building"]) ?? "",
  );
  const start =
    pick(raw, ["start", "start_at", "starts_at", "startDate", "start_date", "begins_at", "date"]) ??
    new Date().toISOString();
  const end = pick(raw, ["end", "end_at", "ends_at", "endDate", "end_date"]) ?? start;
  return {
    id: String(pick(raw, ["id", "activity_id", "uuid"]) ?? `suitable-${index}`),
    title: String(pick(raw, ["title", "name", "activity_name"]) ?? "Untitled event"),
    description: String(pick(raw, ["description", "details", "summary"]) ?? ""),
    locationText,
    buildingId: matchBuilding(locationText, buildings),
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    source: "suitable",
    url: pick(raw, ["url", "link", "permalink"]) || undefined,
  };
}

async function loginSuitable() {
  const env = process.env.SUITABLE_API_ENV || "app";
  const base = (process.env.SUITABLE_BASE_URL || `https://${env}.suitable.co`).replace(/\/$/, "");
  const username = process.env.SUITABLE_USERNAME;
  const password = process.env.SUITABLE_PASSWORD;
  if (!username || !password) return null;

  const loginUrls = [`${base}/api/login`, `${base}/api/v1/login`, `${base}/login`];
  const body = {
    username,
    password,
    email: username,
    institution_id: process.env.SUITABLE_INSTITUTION_ID,
    institutionId: process.env.SUITABLE_INSTITUTION_ID,
  };

  for (const url of loginUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const token = pick(data, ["access_token", "accessToken", "token", "data.access_token"]);
      if (token) return { base, token };
    } catch {
      /* try next */
    }
  }
  throw new Error("Suitable login failed. Check credentials and confirm endpoints with Suitable support.");
}

async function fetchSuitableEvents(auth) {
  const institutionId = process.env.SUITABLE_INSTITUTION_ID;
  const catalogId = process.env.SUITABLE_CATALOG_ID;
  const custom = process.env.SUITABLE_EVENTS_PATH;
  const paths = custom
    ? [custom]
    : [
        `/api/v1/institutions/${institutionId}/catalogs/${catalogId}/activities`,
        `/api/institutions/${institutionId}/catalogs/${catalogId}/activities`,
        `/api/v1/institutions/${institutionId}/activities`,
        `/api/v1/catalogs/${catalogId}/activities`,
        `/api/activities`,
      ].filter((p) => !p.includes("undefined"));

  for (const p of paths) {
    const url = p.startsWith("http") ? p : `${auth.base}${p}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/json" },
      });
      if (!res.ok) continue;
      return asArray(await res.json());
    } catch {
      /* try next */
    }
  }
  throw new Error("Logged in to Suitable, but no events endpoint responded. Set SUITABLE_EVENTS_PATH.");
}

export function suitableApiPlugin() {
  loadEnvFile();
  const buildings = loadBuildings();

  return {
    name: "suitable-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.url === "/api/events" && req.method === "GET") {
            if (process.env.SUITABLE_USERNAME && process.env.SUITABLE_PASSWORD) {
              try {
                const auth = await loginSuitable();
                const raw = await fetchSuitableEvents(auth);
                const events = raw
                  .map((row, i) => mapSuitableEvent(row, i, buildings))
                  .filter((e) => e.title);
                return json(res, 200, {
                  events,
                  source: "suitable",
                  message: `Loaded ${events.length} Suitable activities.`,
                });
              } catch (err) {
                return json(res, 200, {
                  events: sampleEvents(buildings),
                  source: "sample",
                  message: `${err.message} Showing sample campus events instead.`,
                });
              }
            }
            return json(res, 200, {
              events: sampleEvents(buildings),
              source: "sample",
              message:
                "Suitable credentials are not configured. Sample events are shown. Add them in .env (see .env.example).",
            });
          }

          if (req.url === "/api/events/import" && req.method === "POST") {
            const payload = await readBody(req);
            const events = asArray(payload).map((row, i) => {
              const mapped = mapSuitableEvent(row, i, buildings);
              mapped.source = "import";
              mapped.id = mapped.id.startsWith("suitable-") ? `import-${i}` : mapped.id;
              return mapped;
            });
            return json(res, 200, {
              events,
              source: "import",
              message: `Imported ${events.length} events and matched them to campus buildings.`,
            });
          }
        } catch (err) {
          return json(res, 500, { error: err.message ?? "Server error" });
        }
        next();
      });
    },
  };
}
