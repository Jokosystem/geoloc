self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("geolook-cache").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/script.js",
        "/grungebg.jpeg"
      ]);
    })
  );
});