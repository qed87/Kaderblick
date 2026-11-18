# CLAUDE.md

Diese Datei gibt Claude Code Kontext für die Arbeit in diesem Repository. Detaillierte Regeln liegen thematisch aufgeteilt in `.claude/rules/`.

## Tech-Stack

- **Runtime:** Node.js (aktuelle LTS-Version, siehe `engines` in `package.json`)
- **Web-Framework:** [Fastify](https://fastify.dev/) – ausschließlich Fastify verwenden, kein Express, Koa o. Ä.
- **Datenbank:** [KurrentDB](https://docs.kurrent.io/) (ehemals EventStoreDB), angebunden über den offiziellen Client [`@kurrent/kurrentdb-client`](https://www.npmjs.com/package/@kurrent/kurrentdb-client)
- **Validierung:** [Zod](https://zod.dev/)
- **Fehlerbehandlung:** Result-Types mit [neverthrow](https://github.com/supermacro/neverthrow)
- **Logging:** Der in Fastify integrierte Pino-Logger (`fastify.log` bzw. `request.log`), kein `console.log` im Anwendungscode

## Projektstruktur (Richtwert)

```
src/
  app.js          # Die App als Plugin: setzt Services und Routen zusammen (setzt das Config-Plugin voraus)
  server.js       # Erzeugt die Fastify-Instanz, registriert Config und App, startet den Server (listen)
  plugins/        # Querschnittliche Plugins (DB, Auth, Config, ...)
  routes/         # Routen (nur HTTP-Schicht), nach Fachbereich gruppiert
  domain/         # Aggregates, Events, Domain-Fehler – frei von I/O
  services/       # Orchestrierung: Aggregate laden, Geschäftsmethode aufrufen, speichern
  repositories/   # Datenzugriff auf KurrentDB und Dateiablage, wickelt Client-Exceptions in Results ein
  projections/    # Read-Models im Speicher, aus Events aufgebaut
  schemas/        # Wiederverwendbare Zod-Schemas
test/
```

`app.js` und `server.js` getrennt halten, damit Tests die App über `fastify.inject()` ansprechen können, ohne einen Port zu öffnen. Tests erzeugen dafür selbst eine Fastify-Instanz und registrieren Config- und App-Plugin wie `server.js`.

## Arbeitsweise für Claude

- Vor dem Hinzufügen neuer Dependencies prüfen, ob Fastify oder ein `@fastify/*`-Plugin das bereits abdeckt.
- Bestehende Patterns im Code übernehmen, statt neue Stile einzuführen.
- Nach Änderungen Linting und Tests ausführen und Fehler beheben, bevor die Aufgabe als erledigt gilt.
