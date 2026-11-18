---
paths:
  - "src/routes/**"
---

# Routen

- Handler sind `async` und geben den Response-Body per `return` zurück – kein Mischen von `return` und `reply.send()`.
- Handler enthalten keine Fachlogik. Sie rufen einen Service auf und werten das zurückgegebene `Result` mit `.match()` aus: Der Erfolgsfall wird zurückgegeben, fachliche Fehler werden auf passende HTTP-Statuscodes abgebildet (z. B. `NotFound` → `404`, `Conflict` → `409`).
- Jede Route definiert Zod-Schemas für ihre Inputs und ihre `response` (Details in `validation.md`).
- Der zentrale `setErrorHandler` ist nur für Unerwartetes zuständig (Validierungsfehler, Bugs, Infrastrukturausfälle), nicht für fachliche Fehler.

## REST-Design

Alle HTTP-APIs sind RESTful gestaltet (Richardson Maturity Level 2: Ressourcen, HTTP-Methoden und Statuscodes werden korrekt genutzt; HATEOAS ist nicht gefordert).

### Ressourcen & URLs
- URLs bezeichnen Ressourcen, keine Aktionen: Substantive im Plural, kleingeschrieben, Wörter mit Bindestrich (`/orders`, `/orders/{orderId}`, `/production-lines`). Keine Verben im Pfad (`/getOrder`, `/orders/create`).
- Untergeordnete Ressourcen werden verschachtelt, maximal eine Ebene tief (`/orders/{orderId}/items`). Tiefere Beziehungen über eigene Top-Level-Ressourcen mit Filter abbilden.
- Filtern, Sortieren und Paginierung über Query-Parameter (`?status=open&sort=-createdAt&limit=50`), nicht über den Pfad.

### HTTP-Methoden
- `GET` liest und hat keine Seiteneffekte.
- `POST` legt eine neue Ressource in einer Collection an.
- `PUT` ersetzt eine Ressource vollständig und ist idempotent.
- `PATCH` ändert eine Ressource teilweise.
- `DELETE` entfernt eine Ressource und ist idempotent.
- Fachliche Vorgänge, die sich nicht als CRUD abbilden lassen, werden als eigene Ressource modelliert (z. B. `POST /orders/{orderId}/cancellations` statt `POST /orders/{orderId}/cancel`).

### Statuscodes
- `200` für erfolgreiche Antworten mit Body, `201` mit `Location`-Header nach dem Anlegen, `204` ohne Body (z. B. nach `DELETE`).
- `400` für ungültige Eingaben, `404` für nicht existierende Ressourcen, `409` für Konflikte (z. B. abweichende Revision), `422` für fachlich unzulässige Operationen auf gültigen Eingaben.
- Fachliche `Err`-Fälle aus den Services werden immer auf einen dieser Codes abgebildet, nie auf `500`.

### Repräsentation
- Request- und Response-Bodies sind JSON, Feldnamen in camelCase.
- Ressourcen-IDs werden im Body mitgeliefert.
- Fehlerantworten haben überall dasselbe Format.
