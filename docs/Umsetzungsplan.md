# Kaderblick – Umsetzungsplan Backend

Grundlage ist die Spezifikation [Kaderblick.md](Kaderblick.md). Das Backend wird zuerst vollständig umgesetzt, danach das Frontend (eigener Plan).

**Status:** Entwurf (Stand 2026-11-19)

## Vorgehen

- Jeder Schritt ist ein eigener, in sich lauffähiger Stand mit Tests und endet mit einem Commit (Conventional Commits, Deutsch). Lint und Tests sind grün, bevor der nächste Schritt beginnt.
- Ein Schritt soll sich in einer Sitzung reviewen lassen: grob 400–1000 geänderte Zeilen einschließlich Tests. Wird ein Schritt größer, wird er geteilt.
- Reihenfolge von innen nach außen: erst Domäne (ohne I/O), dann Speicher und Read-Models, dann Services und Routen je Fachbereich, zuletzt Jobs, Migration und Betrieb.
- Abweichungen oder Lücken in der Spezifikation, die bei der Umsetzung auffallen, werden in [Abschnitt 9 der Spezifikation](Kaderblick.md#9-offene-punkte) gesammelt und vor dem Weiterarbeiten geklärt.

## Technische Festlegungen

Ergänzend zu `CLAUDE.md` und `.claude/rules/`:

| Thema | Festlegung |
|---|---|
| Sprache | TypeScript (strict, ES-Module); Typen per `z.infer` aus den Schemas |
| Ausführen | Entwicklung und Tests mit der eingebauten Typ-Entfernung von Node (`erasableSyntaxOnly`, relative Importe mit Endung `.ts`); für das Docker-Image kompiliert `tsc` nach `dist/` (`rewriteRelativeImportExtensions`) |
| Node | Version 24.x |
| Features | Fachliches Verhalten als Gherkin-Features auf Englisch mit `@cucumber/cucumber`, Step-Definitionen in TypeScript: Fachregeln gegen das Aggregate (`features/domain/`), HTTP-Verhalten gegen die API über `fastify.inject()` (`features/api/`). Eine Regel wird nur auf einer Ebene vollständig durchgespielt; die API-Features prüfen die Abbildung, nicht jede Regel erneut. |
| Tests | Technisches ohne fachliche Aussage als klassische Tests mit `node:test` unter `test/`, z. B. Konfiguration, Fehlerübersetzung, Event-Serialisierung, Dateiablage, Repository gegen KurrentDB, CSV-Escaping. |
| Faustregel | Würde ein Trainer den Satz verstehen, wird es ein Feature; sonst ein Test. |
| Test-Doppel | In-Memory-Implementierungen von Event Store und Dateiablage für Service- und Routentests; echte KurrentDB nur in den Repository- und Projektionstests |
| KurrentDB lokal und in der CI | `backend/compose.dev.yaml` mit einer KurrentDB ohne TLS; in der CI als Service-Container |
| Lint | ESLint (Flat Config) mit `eslint-plugin-neverthrow` (`must-use-result`) |
| Sitzung | `@fastify/secure-session` (Cookie signiert und verschlüsselt mit `KADERBLICK_SESSION_KEY`) |
| Uploads | `@fastify/multipart`; JPEG-Prüfung über die Dateisignatur, keine Bildbibliothek |
| Zeitpläne | `croner` (klein, ohne Abhängigkeiten, mit Zeitzone `Europe/Berlin`) |
| Verzeichnis | alles unter `backend/` |

## Schritte

### Schritt 1 – Projektgerüst

- `backend/package.json`, `tsconfig.json`, ESLint (`typescript-eslint`), Skripte `lint`, `typecheck`, `test`, `build`
- Cucumber-Konfiguration mit gemeinsamer `World` (App-Instanz und Test-Doppel) und `node:test` für `test/`; Skript `test` führt beides aus
- Erste Tests für Konfiguration und Fehlerformat
- `src/server.js` und `src/app.js` getrennt; Config-Plugin mit Zod-Schema für alle Umgebungsvariablen (8.1)
- Laden und Prüfen der Trainer-Konfiguration beim Start (4.1.4: doppelte Schlüssel, Mindestlänge 32)
- Zentraler Error-Handler: Problem Details (6.1.5), `ValidationError` mit `errors`, `500` ohne interne Details
- `fastify-type-provider-zod`, `@fastify/swagger` nur in der Entwicklung
- `GET /api/v1/version`, Graceful Shutdown
- **Review-Fokus:** Struktur, Konfiguration, Fehlerformat

### Schritt 2 – Domäne: Feldwerte, Fehler, Team und Kader

- `src/schemas/`: Feldwerte aus 6.2.6 als zentrale Zod-Schemas (Position, Fuß, Ort, Wettbewerb, Einsatz, Anwesenheit, Schwerpunkte, Saison)
- `src/domain/errors.js`: fachliche Fehler aus 5.3.9 als Discriminated Union
- Event-Schemas für 5.3.1 und 5.3.2
- Klasse `Team` mit `create`, `fromEvents`, `#apply`, `#raise`, `pendingEvents`; Geschäftsmethoden für Team und Kader
- Regeln 1, 2, 3, 12 (Lebenszyklus, Teamdaten, Kader, keine leeren Änderungen)
- **Review-Fokus:** Aggregate-Muster, an dem sich alle weiteren Schritte orientieren

### Schritt 3 – Domäne: Termine

- `Appointment` (abstrakt), `Match`, `Training`
- Event-Schemas und Methoden aus 5.3.3 bis 5.3.5; `AppointmentNotFound` auch bei falscher Termin-Art
- Regeln 5 und 8 für Termine, Regel 10 für gelöschte Termine
- **Review-Fokus:** Klassenhierarchie, gemeinsame gegenüber typspezifischen Methoden

### Schritt 4 – Domäne: Bewertungen

- `Rating` (abstrakt), `MatchRating`, `TrainingRating` mit `counts()`
- Event-Schemas und Methoden aus 5.3.6 bis 5.3.8, einschließlich `markAllStarting` und `markAllPresent`
- Regeln 4, 6, 7, 8, 9, 10, 11 (inaktive Spieler, Einsatz zuerst, Werte verfallen, Wertebereiche, Karten, Entfernen, absolute Zähler)
- Regel-Features mit `Scenario Outline` und `Examples`: je Regel die erlaubten und abgelehnten Fälle
- **Review-Fokus:** Vollständigkeit der Regeln gegenüber 5.2

### Schritt 5 – Event Store und `TeamRepository`

- KurrentDB-Plugin (Client, `onClose`)
- Event-Register: Typ → Zod-Schema; Serialisieren und Prüfen beim Lesen
- `TeamRepository.load` und `save` mit `ResultAsync`; `TeamNotFound`, `ConcurrencyConflict`, `StreamDeleted`
- In-Memory-Repository mit gleichem Verhalten für spätere Tests
- Integrationstests gegen KurrentDB aus `compose.dev.yaml`
- **Review-Fokus:** Fehlerübersetzung, Optimistic Concurrency

### Schritt 6 – Dateiablage

- Repositories für Spielerprofil und Fotos, Wappen und Trainerangabe, Notizen und Kommentare, Trainer-Einstellungen (5.4.2)
- Atomisches Schreiben (temporäre Datei, dann umbenennen), Standardwerte bei fehlenden Dateien (5.4.6)
- JPEG-Prüfung und Größenlimit 5 MB
- In-Memory-Variante für Tests
- **Review-Fokus:** Pfade, keine personenbezogenen Daten in Logs

### Schritt 7 – Read-Models

- Subscription auf `$all` mit Präfix-Filter `team-`, Aufbau beim Start, Bereitschaft
- Projektionen Team-Übersicht, Spielerverzeichnis, Kader, Termine, Termin-Detail (5.5.3 bis 5.5.7), bereinigt um verfallene Werte über die Domänenlogik
- Revision je Team und globale Position; `waitForRevision` mit 2 Sekunden Höchstdauer (7.1)
- `GET /api/v1/health` mit `200` bzw. `503`; fachliche Routen antworten bis zur Bereitschaft mit `503`
- **Review-Fokus:** dieselben Regeln wie im Aggregate, keine doppelte Fachlogik

### Schritt 8 – Service-Grundlage, Anmeldung und Einstellungen

- Gemeinsamer Ablauf für Schreibvorgänge: laden, Geschäftsmethode, speichern, einmal wiederholen bei Konflikt, auf Projektion warten, `ETag` und `X-Projection-Pending` setzen
- Prüfung `previous` je Feld mit `409 EditConflict` und `currentValue` (6.1.3)
- `ETag` und `304` für lesende Team-Endpunkte (6.1.4)
- `POST`/`DELETE /session` mit Rate-Limit, Auth-Hook mit Prüfung der Trainer-Konfiguration, `GET /me`
- `GET`/`PATCH /me/settings` einschließlich Wahl des nächsten aktiven Teams (4.1.2)
- **Review-Fokus:** Sicherheit der Anmeldung, wiederverwendbarer Schreibablauf

### Schritt 9 – Teams

- `GET`/`POST /teams`, `GET`/`PATCH`/`DELETE /teams/{teamId}`, Wappen-Endpunkte (6.2.2 ohne Auswertung und CSV)
- Vergabe der Team-Nummer mit Überspringen gesperrter Nummern (5.1.3)
- `DuplicateTeam` und `LastTeam` über die Team-Übersicht; Löschen von `team/{teamId}/` nach `TeamDeleted`
- **Review-Fokus:** Team-Nummer, Reihenfolge Datei und Event (5.4.3)

### Schritt 10 – Kader und Spieler

- Kader-Endpunkte einschließlich neuer Spieler und Kader übernehmen (6.2.3)
- Spielersuche über Spielerverzeichnis und Profildateien
- Profil- und Foto-Änderungen mit `PlayerProfileChanged` in allen Teams des Spielers
- Kommentare nach `PlayerRemovedFromSquad` löschen
- **Review-Fokus:** Schreiben über mehrere Teams, Teilfehler

### Schritt 11 – Spieltage und Spielbewertungen

- Endpunkte aus 6.2.4: anlegen, Liste, Bewertungsansicht, Feldänderungen, löschen, Bewertung ändern und zurücksetzen, „Alle Startelf“
- Abbildung der `PATCH`-Felder auf Geschäftsmethoden (z. B. `cards.yellow` → `showCard` bzw. `withdrawCard`)
- Notizen und Kommentare als Dateien; Löschen von `appointment/{matchId}/`
- **Review-Fokus:** Feld-zu-Methode-Abbildung, Konfliktprüfung je Feld

### Schritt 12 – Trainings und Trainingsbewertungen

- Endpunkte aus 6.2.5 nach dem Muster aus Schritt 11, gemeinsame Teile wiederverwendet
- **Review-Fokus:** keine Kopie von Schritt 11, sondern gemeinsame Bausteine

### Schritt 13 – Auswertung

- Reine Funktion für alle Kennzahlen aus 4.4.1 bis 4.4.6 (Teambilanz, Trainingsbilanz, Spielertabelle, Ranglisten, Spielerdetail), Filter Zeitraum und inaktive Spieler
- `GET /teams/{teamId}/statistics` mit Namen aus den Profilen
- Features mit festen Beispieldaten als Tabellen und von Hand nachgerechneten Ergebnissen
- **Review-Fokus:** Rechenregeln

### Schritt 14 – CSV-Export

- `GET /teams/{teamId}/ratings.csv` nach 4.5.3 (Spalten, Sortierung, Kodierung, Dateiname)
- **Review-Fokus:** Format, Escaping

### Schritt 15 – Wiederkehrende Jobs

- Verwaiste Spieler (täglich 04:00) einschließlich nachgeholter Dateilöschungen (5.4.5)
- Verwaiste Streams (Tombstone, 1. Tag jedes zweiten Monats 04:30) und Scavenge über `KADERBLICK_KURRENTDB_HTTP_URL` (8.5)
- Jobs als eigene Funktionen, die Tests direkt aufrufen; Zeitplan nur im Plugin
- **Review-Fokus:** Sicherheitsabstände (24 Stunden, 30 Tage), Protokollierung nur mit IDs

### Schritt 16 – Migration

- `cli/import.js` nach 8.3: Zod-Schema der Exportdatei, Zuordnung der Felder, Abbruch bei Duplikaten, Import über die Geschäftsmethoden
- Features mit einer künstlichen Exportdatei (keine echten Daten)
- **Review-Fokus:** Zuordnungstabellen aus 8.3.2

### Schritt 17 – Bereitstellung

- `backend/Dockerfile` (Node 24, kompiliertes `dist/`, ohne Entwicklungsabhängigkeiten, nicht als root)
- `deploy/compose.yaml` nach 8.1.1 mit Backend, KurrentDB und Backup-Jobs (8.2); Frontend-Dienst als Platzhalter
- `.env.example` ohne Secrets, Beispiel-Trainer-Konfiguration
- CI anpassen: Node 24, Lint, Typprüfung, Features und Tests mit KurrentDB-Service, Build
- **Review-Fokus:** Netzwerke, Volumes, keine Secrets im Repository

## Danach

- Ende-zu-Ende-Test des Backends mit einer echten (künstlichen) Exportdatei und einem lokalen Compose-Stack
- Umsetzungsplan für das Frontend
