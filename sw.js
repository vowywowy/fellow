'use strict';
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("v1").then(cache => {
            cache.addAll([
                "index.html",
                "main.css",
                "main.js",
                "assets/icon.svg",
            ])
        })
    )
})

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request)
        })
    )
})