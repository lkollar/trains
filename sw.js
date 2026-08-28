const CACHE_NAME = "cannon-line-v12";
const ASSET_PATHS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
];

const assetUrls = () =>
  ASSET_PATHS.map((path) => new URL(path, self.registration.scope).toString());

const appShellUrls = () => {
  const scope = new URL(self.registration.scope);
  return {
    root: new URL("./", scope).toString(),
    index: new URL("./index.html", scope).toString(),
  };
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assetUrls()))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== location.origin) return;

  if (event.request.mode === "navigate") {
    const shell = appShellUrls();
    event.respondWith(
      fetch(event.request).catch(
        () => caches.match(shell.root).then((cached) => cached || caches.match(shell.index))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
