# Claflin University Campus Map

Interactive map of Claflin University (Orangeburg, SC) built with the Google Maps JavaScript API.

Students can:

- Browse **named campus buildings**
- Show **live location** on the map
- Get **walking directions** from where they are
- Pin **classes** to the correct hall
- Plot **Suitable** campus events on those same buildings

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Google Maps API key

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Maps JavaScript API** and **Directions API**.
2. Create an API key. Restrict it to `http://localhost:5173/*` while developing.
3. Either paste the key in the app’s setup card, or copy `.env.example` to `.env` and set:

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Restart `npm run dev` after changing `.env`.

## Suitable App events

Suitable does not publish a public student events feed. Claflin’s connection uses Suitable’s institution REST API ([developer.suitable.co](https://developer.suitable.co/)):

1. Ask Suitable support (or Claflin Student Development) for `INSTITUTION_ID`, `CATALOG_ID`, and API admin credentials.
2. Put them in `.env` (never `VITE_` — they stay on the Vite server, not in the browser).
3. If Suitable gives Claflin a custom events URL, set `SUITABLE_EVENTS_PATH`.

Until credentials are present, the Events tab shows sample campus activities already matched to buildings (Student Center, Chapel, Corson, JTK, Panther Plaza).

You can also `POST /api/events/import` with a JSON array of `{ title, description, location, start, end }` objects. Location strings are fuzzy-matched to halls (`JST`, `Tingley`, `SRC East`, and so on).

## Data notes

Several halls (Tingley, Corson, Asbury, Dunton, GTK, Manning Library, Kleist, Student Center, JTK, and others) use OpenStreetMap or NRHP coordinates. A few newer or unmapped buildings (High Rise, Commons, SRC cluster, Elmore Chapel, MSRC, Middleton, Music) are placed from campus layout relative to those points and should be field-checked on site.
