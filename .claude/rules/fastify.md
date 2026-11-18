# Fastify

## Plugins
- Funktionalität wird als Fastify-Plugin gekapselt (`async function (fastify, opts) { ... }`).
- Gemeinsam genutzte Dekoratoren, Hooks oder Clients (z. B. DB-Verbindungen) mit `fastify-plugin` wrappen, damit sie nicht im Encapsulation-Kontext verschwinden.
- Routen werden über `fastify.register()` mit Präfix eingebunden, nicht alle in einer Datei gesammelt.
- Offizielle `@fastify/*`-Plugins bevorzugen, bevor eigene Lösungen gebaut werden (z. B. `@fastify/cors`, `@fastify/swagger`).

## Konfiguration
- Konfiguration ausschließlich über Umgebungsvariablen, beim Start mit einem Zod-Schema validiert. Bei ungültiger Konfiguration bricht der Start mit klarer Fehlermeldung ab.
- Keine Secrets im Code oder in eingecheckten Dateien.

## Lifecycle
- Ressourcen (Verbindungen, Timer) im `onClose`-Hook sauber freigeben.
- Graceful Shutdown bei `SIGINT`/`SIGTERM` über `fastify.close()`.
