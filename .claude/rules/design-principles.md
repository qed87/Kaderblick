# Design-Prinzipien

## YAGNI (You Aren't Gonna Need It)
- Nur umsetzen, was die aktuelle Aufgabe erfordert. Keine spekulativen Erweiterungspunkte, Konfigurationsoptionen, Abstraktionsschichten oder generischen Lösungen „für später“.
- Keine neuen Dependencies, Plugins oder Fehlertypen einführen, die noch nicht gebraucht werden.
- Lieber einfachen, direkten Code schreiben und bei echtem Bedarf refaktorieren.

## DRY (Don't Repeat Yourself)
- Jedes fachliche Wissen hat genau eine Quelle: Zod-Schemas, Fehlertypen, Konstanten und Geschäftsregeln werden zentral definiert und wiederverwendet. Typen werden aus Schemas abgeleitet, nicht parallel gepflegt.
- DRY betrifft Wissen, nicht zufällig ähnlich aussehenden Code. Zwei Stellen, die sich unabhängig voneinander ändern können, bleiben getrennt.
- Abstrahieren erst bei der dritten Wiederholung (Rule of Three). Bis dahin hat YAGNI Vorrang vor einer vorschnellen Abstraktion.

## SOLID
- **Single Responsibility:** Jedes Modul, Plugin und jede Funktion hat genau einen Grund, sich zu ändern. Route-Handler kümmern sich nur um HTTP (Request entgegennehmen, `Result` auf Response abbilden); Business Rules liegen in den Aggregates unter `domain/`, Orchestrierung in `services/`, Datenzugriff in `repositories/`.
- **Open/Closed:** Erweiterung über neue Plugins, Routen oder Fehlervarianten statt durch Umbau bestehender Module. Fastify-Encapsulation gezielt dafür nutzen.
- **Liskov Substitution:** Implementierungen einer gemeinsamen Schnittstelle (z. B. echte und Test-Repositories) verhalten sich austauschbar, inklusive gleicher `Result`-Fehlertypen.
- **Interface Segregation:** Funktionen und Services erhalten nur die Abhängigkeiten, die sie wirklich nutzen, keine großen „God Objects“ wie die komplette Fastify-Instanz oder einen allumfassenden Kontext.
- **Dependency Inversion:** Fachlogik hängt nicht direkt von konkreten Clients (DB, HTTP, Queues) ab. Abhängigkeiten werden als Parameter oder über Fastify-Dekoratoren injiziert, damit sie in Tests austauschbar sind.

Bei Zielkonflikten gilt: Einfachheit und Lesbarkeit vor Prinzipientreue. SOLID ist kein Grund, Interfaces oder Schichten ohne konkreten Nutzen einzuführen (siehe YAGNI).
