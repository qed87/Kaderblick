# Domain Driven Design & Event Sourcing mit KurrentDB

## Aggregates
- Business Rules und Invarianten werden ausschließlich in Aggregates durchgesetzt, nicht in Route-Handlern, Services oder Repositories.
- Ein Aggregate ist die Konsistenzgrenze: Alles, was atomar konsistent sein muss, gehört in genau ein Aggregate.
- Aggregates sind frei von I/O. Sie kennen weder KurrentDB noch Fastify noch andere Infrastruktur.
- Aggregates werden als Klassen umgesetzt. Ihr Zustand ist privat (`#state`) und wird ausschließlich aus Events rekonstruiert: Eine statische Fabrik (`static fromEvents(events)`) ruft für jedes gelesene Event die private Methode `#apply(event)` auf.
- `#apply` prüft nichts. Ein Event ist eine bereits eingetretene Tatsache und muss sich immer anwenden lassen, auch wenn sich Regeln seitdem geändert haben. `#apply` übernimmt die Tatsache in den Zustand und leitet nur deren fachliche Folgen ab (z. B. verfallene Bewertungen eines entfernten Spielers).
- Geschäftsmethoden (z. B. `team.ratePlayer(...)`) prüfen die Invarianten gegen den aktuellen Zustand und geben `Result<void, DomainError>` zurück. Verletzte Invarianten sind fachliche `Err`-Fälle, keine Exceptions. Im `Err`-Fall entstehen keine Events und der Zustand bleibt unverändert.
- Im Erfolgsfall erzeugt die Geschäftsmethode Events über die private Methode `#raise(event)`. Sie wendet das Event über dasselbe `#apply` an wie beim Rekonstruieren und merkt es als Pending Event vor (lesbar über `pendingEvents`). So unterscheidet sich der Zustand nach einer Änderung nie vom Zustand nach erneutem Laden.
- Neue Aggregates entstehen über eine statische Fabrik (z. B. `static create(...)`), die `Result<Aggregate, DomainError>` zurückgibt und das erste Event über `#raise` erzeugt.
- Aggregates nutzen weder Uhr noch Zufall: IDs und Zeitstempel werden als Parameter übergeben.
- Services orchestrieren nur: Aggregate laden, Geschäftsmethode aufrufen, Pending Events speichern. Sie enthalten keine eigenen Business Rules.

## Events
- Events beschreiben fachliche Tatsachen in der Vergangenheitsform (`OrderPlaced`, `OrderCancelled`), keine technischen Änderungen (`OrderUpdated`).
- Jedes Event-Payload ist als Zod-Schema definiert. Beim Lesen aus KurrentDB wird jedes Event damit validiert.
- Events sind unveränderlich. Änderungen am Schema erfolgen über neue Event-Typen oder Versionen, nie durch Umdeuten bestehender Events.

## Personenbezogene Daten (DSGVO)
- Personenbezogene Daten stehen nie direkt in Events: Namen, Geburtsdaten, Freitexte über Personen (Notizen, Kommentare) und Fotos.
- Sie werden außerhalb des Event Stores gespeichert, z. B. als `<spielerId>.json` für ein Spielerprofil bzw. als Bilddatei. Events enthalten nur die Referenz (ID).
- Löschen bedeutet, diese Dateien zu entfernen. Die Events bleiben unverändert und verweisen danach auf eine ID ohne Personenbezug.
- Read-Models, die personenbezogene Daten anzeigen, lesen sie über die Referenz aus diesem Speicher und kommen mit einem gelöschten Profil zurecht.

## Repositories
- Aggregates werden ausschließlich über Repositories geladen und gespeichert.
- `load` liest den Stream des Aggregates, baut den Zustand aus den Events auf und liefert das Aggregate zusammen mit seiner aktuellen Revision.
- `save` schreibt nur die neu entstandenen Events des Aggregates.
- Repositories geben `ResultAsync` zurück. Ein nicht existierender Stream wird zu einem getypten `NotFound`-Fehler, Client-Exceptions werden eingewickelt (siehe `error-handling.md`).

## Optimistic Concurrency über die Revision
- Jeder Schreibvorgang auf ein Aggregate nutzt optimistisches Sperren: `appendToStream` wird mit der beim Laden gelesenen Revision als `streamState` aufgerufen.
- Beim Anlegen eines neuen Aggregates wird `NO_STREAM` verwendet. `ANY` ist für Aggregate-Streams verboten.
- Ein `WrongExpectedVersionError` wird in einen getypten `ConcurrencyConflict`-Fehler übersetzt.
- Bei einem `ConcurrencyConflict` wird der Vorgang höchstens einmal wiederholt: Das Aggregate wird neu geladen und die Geschäftsmethode erneut gegen den aktuellen Zustand aufgerufen. Kein blindes Wiederholen derselben Events.
- Schlägt auch diese Wiederholung mit einem Konflikt fehl, wird der `ConcurrencyConflict` an den Aufrufer gemeldet (REST: `409`).

## Aggregate-Schnitt und Stream-Design
- Aggregates werden nach fachlichen Invarianten und Geschäftsregeln geschnitten, nicht nach technischer Größe. Ein Aggregate umfasst alles, was zusammen konsistent sein muss, damit seine Regeln vollständig in ihm selbst geprüft werden können, statt sie auf mehrere Aggregates zu verteilen.
- Nebenläufigkeit ist dabei ein nachrangiges Kriterium: Ein Aggregate wird nur dann kleiner geschnitten, wenn parallele Änderungen am selben Aggregate fachlich häufig und störend wären. Weil Konflikte durch Neuladen und erneutes Aufrufen der Geschäftsmethode aufgelöst werden, ist ein gemeinsamer Stream für viele Änderungen in der Regel unproblematisch.
- Keine Sammel-Streams ohne fachliche Konsistenzgrenze (z. B. ein Stream für „alle Bestellungen“), nur damit Daten beisammen liegen.
- Ein Stream pro Aggregate-Instanz, benannt als `<aggregateType>-<id>` (z. B. `order-3f2a…`). Der Aggregate-Typ enthält selbst keinen Bindestrich (camelCase, z. B. `productionLine-<id>`), da KurrentDB die Kategorie am ersten Bindestrich ableitet.
- Ein Schreibvorgang verändert genau ein Aggregate. Konsistenz über mehrere Aggregates hinweg wird eventual consistent über Events hergestellt (z. B. Process Manager/Policies), nicht über einen gemeinsamen Schreibvorgang.
- Langlebige Aggregates mit stetig wachsendem Stream werden fachlich in Lebenszyklen oder Zeiträume geschnitten (z. B. `shift-<lineId>-<datum>` statt eines endlosen Streams pro Linie).

## Lesen: Wann ein Read-Model (CQRS) und wann nicht
Geschrieben wird immer über Aggregates (siehe oben). Für das Lesen gilt:

- **Kein Read-Model** bei Abfragen genau einer Aggregate-Instanz per ID, deren Antwort sich vollständig aus dem Zustand ergibt, den das Aggregate ohnehin für seine Invarianten hält. Dann wird das Aggregate über das Repository geladen und auf das Response-Schema abgebildet.
- **Read-Model (Projektion) ist Pflicht**, sobald eine Abfrage
  - mehrere Aggregates umfasst (Listen, Suche, Filter, Sortierung, Summen, Reports), oder
  - Felder braucht, die das Aggregate für seine Invarianten nicht benötigt. Aggregates werden nicht um reine Anzeige-Felder erweitert.
- Read-Models sind eventual consistent. Sie werden **nie** zur Prüfung von Invarianten beim Schreiben herangezogen (z. B. Eindeutigkeitsprüfungen). Was beim Schreiben garantiert sein muss, gehört in die Konsistenzgrenze eines Aggregates.
- Read-Models werden ausschließlich aus Events gespeist und lassen sich jederzeit durch erneutes Abspielen der Events neu aufbauen.
- Für Read-Models wird keine zusätzliche Datenbanktechnologie eingeführt, ohne vorher Rücksprache zu halten.
