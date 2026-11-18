---
paths:
  - "test/**"
---

# Tests

- Routen-Tests mit `fastify.inject()` statt echter HTTP-Requests.
- Jede neue Route bekommt mindestens einen Test für den Erfolgsfall und einen für ungültige Eingaben.
- Funktionen, die ein `Result` zurückgeben, werden für den `Ok`-Fall und für jeden ihrer fachlichen `Err`-Fälle getestet.
