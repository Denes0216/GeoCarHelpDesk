const CACHE_VERSION = "google-car-map-v1";
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const APP_CACHE = `${CACHE_VERSION}-app`;
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./cars-data.js",
  "./countries.geo.json",
  "./filters.html",
  "./filters-data.js",
  "./filters.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_CACHE, IMAGE_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (request.mode === "navigate" || new URL(request.url).origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, APP_CACHE));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_IMAGES" || !Array.isArray(event.data.urls)) return;

  event.waitUntil(
    caches.open(IMAGE_CACHE).then((cache) =>
      Promise.allSettled(
        event.data.urls.map((url) =>
          cache.match(url).then((cached) => {
            if (cached) return cached;
            return fetch(url, { mode: "no-cors" }).then((response) => cache.put(url, response));
          })
        )
      )
    )
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetched;
}
