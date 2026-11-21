# Kaderblick – Spezifikation

> Status: Vollständig ausgearbeitet (Stand 2026-11-19). Grundlage für die Umsetzung; Änderungen werden hier nachgezogen.

## 1. Überblick

Kaderblick ist eine Client-Server-Anwendung für Trainer im Amateur- und Jugendfußball. Mit ihr erfassen sie die Leistungen der Spieler ihrer Mannschaft in Trainings und Spielen und werten sie über die Saison aus. 
Das System besteht aus zwei Teilen:

- **Frontend:** eine moderne Webanwendung, die eine übersichtliche und intuitive Oberfläche anbietet und auf einem Webserver gehostet wird.
- **Backend:** enthält die gesamte Geschäftslogik und speichert die Daten. Änderungen werden als Events in KurrentDB abgelegt. Personenbezogene Daten liegen getrennt davon als Dateien (siehe [5.4](#54-personenbezogene-daten-dsgvo)).

Jeder Trainer meldet sich mit seinem eigenen **Zugangsschlüssel** an. Alle Trainer, die am selben Server angemeldet sind, teilen sich einen gemeinsamen Datenstand. So arbeiten mehrere Trainer einer Mannschaft zusammen. Jeder Trainer hält seinen Zugangsschlüssel geheim.

Die App gliedert sich in fünf Reiter: `Kader`, `Termine`, `Auswertungen`, `Team` und `Einstellungen`. In der App ist immer genau eine Mannschaft mit einer Saison aktiv.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Team** | Ein Team stellt eine Gruppe von Spielern einer Saison dar. Ein Team hat einen Namen, eine Spielklasse, eine Saison im Format `JJJJ_JJ` (z. B. `2026_27`, angezeigt als `2026/27`), ein optionales Feld Trainer (Namen der Trainer als Freitext; personenbezogen, deshalb als Datei `./data/team/{teamId}/coaches.txt`) und ein optionales Wappen/Foto. Kader, Termine und Bewertungen gehören immer genau zu einem Team. Teams haben einen eindeutigen Schlüssel (fortlaufende Nummer). Name und Saison sollten möglichst eindeutig sein, aber seltene Verstöße gegen diese Regel werden in Kauf genommen.  |
| **Aktives Team** | Das Team, das ein Trainer gerade bearbeitet. Es wird pro Trainer im Backend gespeichert (siehe Trainer) und gilt damit auf allen Endgeräten des Trainers. Die Einstellung bleibt über mehrere Besuche hinweg erhalten. |
| **Spieler** | Spieler werden Teams über den Kader zugewiesen. Da Events unveränderlich sind und wir DSGVO-konform die Löschung von persönlichen Daten abbilden wollen, sollen Spielerprofile auf dem Dateisystem abgelegt werden. Jeder Spieler erhält beim Anlegen eine zufällige, unveränderliche `playerId` (UUID). Sie wird nicht aus personenbezogenen Daten abgeleitet, damit Events nach dem Löschen des Profils keinen Rückschluss auf die Person zulassen und Korrekturen an Name oder Geburtsdatum die Identität nicht ändern. Für das Profil wird der Pfad `./data/player/{playerId}` vorgesehen. Das Verzeichnis enthält dann eine `profile.json` mit Name, Vorname, Geburtsdatum, starker Fuß (rechts, links, beide) und `photo.jpg` (Originalbild) sowie `photo-cropped.jpg` (zugeschnittenes Spielerbild). |
| **Kaderspieler** | Ein Spieler der einem Team zugewiesen ist. Er referenziert ein Spielerprofil über die `playerId` und weist diesem zusätzlich eine Rückennummer, Position (TW, AB, MF, ST, AR für Allrounder; optional) sowie aktiv/inaktiv zu. |
| **Trainer** | Sind Nutzer der App. Jeder Trainer ist in der Trainer-Konfiguration (siehe [8.1](#81-konfiguration)) mit Trainer-Id (E-Mail), Name und eigenem Zugangsschlüssel hinterlegt. E-Mail und Name sind personenbezogene Daten und stehen deshalb nie in Events. Mit dem Zugangsschlüssel authentifiziert sich ein Trainer im Backend. Die Einstellungen eines Trainers werden unter `./data/trainer/{trainerId}/settings.json` abgelegt. Dort werden das aktive Team, die Trainingszeit (Default 90 min, Vorbelegung der Trainingsdauer) und die Darstellung (Hell, Dunkel, Wie System) hinterlegt. |
| **Zugangsschlüssel** | Ein persönliches Geheimnis je Trainer, mit dem er sich am Backend anmeldet. Beim Login prüft das Backend den Schlüssel gegen die Trainer-Konfiguration und setzt bei Erfolg ein Session-Cookie (siehe Sitzung). Der Schlüssel selbst wird danach nicht mehr übertragen. |
| **Sitzung** | Ein signiertes und verschlüsseltes Session-Cookie (`@fastify/secure-session`) mit `trainerId` und Ablaufzeit. Cookie-Attribute: `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age` von 30 Tagen. Die Ablaufzeit wird serverseitig geprüft; nach Ablauf oder Abmelden ist eine erneute Anmeldung nötig. `Secure` setzt HTTPS voraus. |
| **Termin** | Oberbegriff für Spieltag und Training: ein Ereignis, bei dem die Spieler eines Teams bewertet werden. Jeder Termin hat eine Termin-ID (UUID, innerhalb des Teams eindeutig), ein Datum, eine optionale Notiz und je Spieler höchstens eine Bewertung. Ein Termin ist entweder ein Spieltag oder ein Training. |
| **Spieltag** | Ein Spieltag ist ein Termin, an dem ein Spiel stattfindet. Er hat ein Datum, optional außerdem Spieltag-Nummer, Gegner, Ort (Heim, Auswärts, Neutral), Wettbewerb (Liga, Pokal, Test, Turnier), Notizen und Ergebnis (Tore Team, Tore Gegner). |
| **Training** | Ein Training (Trainingseinheit) ist ein Termin mit Datum, Dauer, Thema, Schwerpunkten (z. B. Technik, Taktik, Kondition) und optionaler Notiz. |
| **Bewertung** | Die Leistung eines Spielers bei einem Termin. Gemeinsam sind allen Bewertungen Leistungsnote, Fairness, Eigenschaften und Kommentar. Es werden zwei Arten unterschieden: Spielbewertung und Trainingsbewertung. Eine Trainingsbewertung erfasst die Leistung eines Spielers bei einer Trainingseinheit (Training). Eine Spielbewertung erfasst die Leistung eines Spielers an einem Spieltag. Eine Bewertung ist eindeutig durch Termin und Spieler bestimmt und hat keine eigene ID. Eine Spielbewertung enthält den Einsatz (Startelf, Eingewechselt, Nicht dabei), Leistungsnote (1–6 in halben Schritten), Fairness (1–6), Eigenschaften mit 0–5 Sternen (Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist), Tore, Vorlagen, Paraden und Karten (Gelb, Gelb-Rot, Rot) sowie einen optionalen Kommentar. Leistungswerte einer Spielbewertung zählen nur bei Startelf oder Eingewechselt. Leistungswerte einer Trainingsbewertung zählen nur bei Anwesend oder Verspätet. Eine Trainingsbewertung enthält Leistungsnote (1–6 in halben Schritten), Fairness (1–6), Eigenschaften mit 0–5 Sternen (Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist), Anwesenheit (Anwesend, Verspätet, Entschuldigt und Unentschuldigt) und einen optionalen Kommentar. |
| **Kommentar / Notiz** | Freitext zu einer Bewertung (Kommentar) oder zu einem Termin (Notiz). Freitexte gelten als personenbezogen. Daher werden sie nicht in Events gespeichert, sondern auf dem Dateisystem: Kommentare je Termin und Spieler unter `./data/team/{teamId}/appointment/{appointmentId}/comments/{playerId}.txt`, Notizen unter `./data/team/{teamId}/appointment/{appointmentId}/notes.txt`. |
| **Event** | Eine im Event Store gespeicherte fachliche Tatsache, z. B. `TeamCreated`. Events sind unveränderlich und enthalten keine personenbezogenen Daten. |

## 3. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Team als Aggregate | Teams sollen als Aggregates betrachtet werden. Für jedes neues Team wird deshalb ein eigener Stream `team-{teamId}` angelegt. Ein Team besteht aus Kader (zugewiesene Spieler), Terminen (Spieltage und Trainings) und deren Bewertungen. |
| Gleicher Name + Saison eines Teams | Bewusste Ausnahme von der Regel „Read-Models nie für Invarianten“: Die Prüfung erfolgt über eine Projektion. Wegen eventual consistency kann es in seltenen Fällen zu Duplikaten kommen; das ist fachlich akzeptiert. |
| Kaderspieler löschen | Wird ein Spieler aus dem Kader entfernt, so verfallen auch alle Bewertungen des Spielers in diesem Team: Die Events bleiben unverändert, Aggregate und Read-Models ignorieren die Bewertungen ab diesem Zeitpunkt. Die zugehörigen Kommentardateien werden gelöscht. |
| Kaderspieler inaktiv | Wird ein Spieler im Kader inaktiv gesetzt, dann können keine Bewertungen mehr erfasst werden bis der Spieler wieder aktiviert wird. |
| Kaderspieler hinzufügen | Ein bereits existierender Spieler (z. B. aus einem Team der Vorsaison) wird beim Hinzufügen per Suche ausgewählt und über seine `playerId` übernommen. Wird ein neuer Spieler einem Kader hinzugefügt, dann erhält er eine neue zufällige `playerId` und es wird ein Eintrag auf dem Dateisystem für ihn angelegt. Dabei wird erst die Profildatei geschrieben, dann das Event. |
| Verwaiste Spieler | Verwaiste Spieler (Spieler auf dem Dateisystem, die keinem Kader mehr zugewiesen sind) müssen über einen Aufräumjob identifiziert und gelöscht werden. Der Job läuft täglich. |
| Spieler löschen (DSGVO) | Wird ein Spieler gelöscht, werden nur seine Dateien auf dem Dateisystem entfernt: Profil, Fotos und die Kommentare zu seinen Bewertungen in allen Teams. Die Events bleiben unverändert, der Spieler bleibt einem Team weiterhin zugewiesen und verweist nur noch auf eine `playerId` ohne Personenbezug. |
| Fehlende personenbezogene Daten beim Lesen | Read-Models und Antworten ersetzen fehlende Dateien durch sinnvolle Standardwerte, z. B. Name „Gelöschter Spieler“, kein Foto, kein Kommentar. Fehlende Dateien sind kein Fehler. |
| Team löschen | Beim Löschen eines Teams wird ein `TeamDeleted`-Event geschrieben, der Stream bleibt bestehen. Die Dateien unter `./data/team/{teamId}/` (Wappen, Notizen, Kommentare) werden sofort gelöscht. Auf ein gelöschtes Team werden keine weiteren Geschäftsmethoden angewendet, und es erscheint in keiner Übersicht mehr. |
| Verwaiste Streams | Der Stream eines gelöschten Teams gilt 30 Tage nach dem `TeamDeleted`-Event als verwaist. Ein wiederkehrender Job räumt verwaiste Streams auf; er läuft alle 2 Monate. Ein gelöschtes Team wird dadurch frühestens 30 Tage und spätestens etwa 90 Tage nach dem Löschen aus dem Event Store entfernt. Der Job löscht die Streams endgültig (Tombstone), sodass ihre Nummern nie wieder vergeben werden; den Speicherplatz gibt ein anschließender Scavenge frei. |
| Aktives Team nach dem Löschen | Ist das gelöschte Team bei einem Trainer als aktives Team hinterlegt, wird sein aktives Team auf das nächste verfügbare Team gewechselt: das Team mit der neuesten Saison, bei Gleichstand alphabetisch nach Name. Die Umstellung erfolgt beim nächsten Lesen der Einstellungen: Das Backend prüft, ob das hinterlegte Team noch existiert, wählt sonst das nächste Team und speichert es. Beim Löschen eines Teams werden keine Einstellungsdateien angefasst. Damit kein Trainer mit einem gelöschten Team weiterarbeitet, liest das Frontend die Einstellungen beim Start immer zuerst und lädt sie bei jeder Antwort `404 TeamDeleted` bzw. `TeamNotFound` neu (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)). |
| Immer ein aktives Team | In der Anwendung muss immer ein Team aktiv sein. Das letzte noch vorhandene Team kann deshalb nicht gelöscht werden; der Versuch wird mit `422` abgelehnt. Geprüft wird über die Projektion der Team-Übersicht. Das ist wie bei doppelten Namen eine bewusste Ausnahme von der Regel „Read-Models nie für Invarianten“, weil die Regel mehrere Teams betrifft. In seltenen Fällen (zwei Trainer löschen gleichzeitig die letzten beiden Teams) können dadurch kurzzeitig keine Teams vorhanden sein; dann erzwingt das Frontend den Dialog „Team anlegen“. |
| Sichtbarkeit von Teams | Alle Trainer sehen und bearbeiten alle Teams. Es gibt keine Zuordnung von Trainern zu Teams. |
| Termin gelöscht | Wird ein Termin (Spieltag oder Training) gelöscht, dann verfallen auch alle zugehörigen Bewertungen: Die Events bleiben unverändert, Aggregate und Read-Models ignorieren die Bewertungen. Die zugehörigen Kommentar- und Notizdateien werden gelöscht. |
| Termin als Basisklasse | Spieltag und Training sind Termine. Im Aggregate gibt es die abstrakte Basisklasse `Appointment` mit den Unterklassen `Match` und `Training` sowie die abstrakte Basisklasse `Rating` mit `MatchRating` und `TrainingRating`. Was beide gemeinsam haben (Datum, Notiz, Löschen, Leistungsnote, Fairness, Eigenschaften, Kommentar, Zurücksetzen), hat gemeinsame Geschäftsmethoden und Events; nur das Typspezifische ist getrennt (siehe [5.3](#53-geschäftsmethoden-und-events)). |
| Team als Klasse | Das Team-Aggregate wird als Klasse `Team` umgesetzt (objektorientierter Stil). Der Zustand ist privat und nur über Geschäftsmethoden änderbar. |
| Team (Aggregate) einlesen | Ein Team soll nur über ein TeamRepository eingelesen werden. Das Repository liest die Events des Streams und erzeugt das Team über `Team.fromEvents(events)`. Dabei wird für jedes Event die private Methode `#apply(event)` aufgerufen. |
| Team-Events abspielen | `#apply` prüft nicht: Ein gespeichertes Event ist eine Tatsache und lässt sich immer anwenden, auch wenn sich Regeln seitdem geändert haben. `#apply` übernimmt das Event in den Zustand und leitet nur fachliche Folgen ab (z. B. verfallene Bewertungen). |
| Geschäftsmethoden | Geschäftsmethoden (z. B. `team.ratePlayer(...)`) prüfen die Invarianten gegen den aktuellen Zustand und liefern ein Result-Objekt, welches im Fehlerfall ein `DomainError` zurückgibt. Ist die Operation zulässig, erzeugen sie ein Event über `#raise(event)`: Es wird über dasselbe `#apply` wie beim Einlesen angewendet und als Pending Event vorgemerkt. Ist sie unzulässig, entsteht kein Event und der Zustand bleibt unverändert. Ein neues Team entsteht über `Team.create(...)`. |
| Team speichern | Das Team-Aggregate soll auch über das TeamRepository gespeichert werden. Hierzu werden die Pending Events gelesen und in die Event-Datenbank geschrieben. Dabei wird die beim Laden gelesene Revision als erwarteter Stream-Stand übergeben (optimistisches Sperren, bei einem neuen Team `NO_STREAM`). Weicht die Revision ab, wird das Team einmal neu geladen und die Geschäftsmethode erneut gegen den neuen Zustand aufgerufen (höchstens ein weiterer Schreibversuch). Schlägt auch dieser mit einem Konflikt fehl, wird mit `409` abgelehnt. |
| Zugangsschlüssel pro Trainer | Jeder Trainer hat einen eigenen Zugangsschlüssel. Einzelne Trainer lassen sich so sperren, ohne dass alle anderen ihren Schlüssel ändern müssen. |
| Ablage der Zugangsschlüssel | Die Trainer-Konfiguration ist eine JSON-Datei, deren Pfad über die Umgebungsvariable `KADERBLICK_TRAINERS_FILE` übergeben wird. Die Schlüssel stehen bewusst im Klartext darin. Wer die Datei lesen kann, kann sich als jeder Trainer anmelden; das wird zugunsten der einfachen Verwaltung akzeptiert. |
| Anmeldung nur mit Zugangsschlüssel | Auf der Anmeldeseite wird nur der Zugangsschlüssel eingegeben, er identifiziert den Trainer allein. Zugangsschlüssel müssen deshalb eindeutig sein; das Backend prüft das beim Start. |
| Schutz vor Durchprobieren | Höchstens 5 fehlgeschlagene Anmeldungen pro IP-Adresse in 15 Minuten, danach `429` (`@fastify/rate-limit`). |
| Anmeldung über Session-Cookie | Der Zugangsschlüssel wird nur beim Login übertragen. Danach authentifiziert ein signiertes, verschlüsseltes Session-Cookie mit Ablaufzeit (`@fastify/secure-session`) die Anfragen. |
| Direkte Kommunikation mit dem Backend | Jede Änderung geht sofort an das Backend. Ohne Verbindung zum Backend zeigt das Frontend einen Hinweis. |
| ID-Vergabe | Alle IDs vergibt das Backend: Teams eine fortlaufende Nummer, Spieler und Termine (Spieltage und Trainings) eine zufällige UUID. |
| Einsatz im Spiel | Startelf, Eingewechselt oder Nicht dabei. Leistungswerte zählen nur bei Startelf oder Eingewechselt. Gespielte Minuten werden nicht erfasst; sie wurden in der Praxis kaum gepflegt und von keiner Auswertung außer der Minutensumme genutzt. |
| Teilnahme am Training | Leistungswerte einer Trainingsbewertung zählen nur bei Anwesend oder Verspätet, nicht bei Entschuldigt oder Unentschuldigt. |
| Fachlich feine Events | Je fachlicher Änderung ein Event (z. B. `PerformanceGraded`, `GoalsRecorded`, `TeamRenamed`), kein Event je Formular. Werte, die sich nicht geändert haben, erzeugen keine Events; so bleibt die Historie aussagekräftig. |
| Einsatz zuerst | Leistungswerte können erst erfasst werden, wenn Einsatz (Startelf, Eingewechselt) bzw. Anwesenheit (Anwesend, Verspätet) erfasst ist. Es gibt keine automatische Erfassung des Einsatzes. |
| Werte verfallen bei Nicht dabei | Wird ein Spieler auf Nicht dabei, Entschuldigt oder Unentschuldigt gesetzt, verfallen seine Leistungswerte für diesen Termin. Wird er danach wieder als Startelf, Eingewechselt, Anwesend oder Verspätet erfasst, beginnt die Erfassung leer. |
| Trainerangabe als Datei | Das optionale Feld Trainer eines Teams enthält Namen und wird als Datei `./data/team/{teamId}/coaches.txt` abgelegt. Das Event vermerkt nur die Änderung. |
| Doppelte Rückennummern | Erlaubt. Das Aggregate prüft nicht auf Eindeutigkeit, das Frontend zeigt nur einen Hinweis. |
| Profiländerungen sichtbar machen | Nach einer Profiländerung schreibt der Service ein inhaltsleeres `PlayerProfileChanged`-Event in jedes Team, in dessen Kader der Spieler ist. So erkennen andere Trainer die Änderung über das Polling. |
| Sammelaktionen | „Alle Startelf“ (Spieltag) und „Alle anwesend“ (Training) erfassen den Einsatz bzw. die Anwesenheit aller aktiven Kaderspieler, für die noch nichts erfasst ist. Bereits erfasste Spieler bleiben unverändert. |
| Bewertung ohne eigene ID | Eine Bewertung ist eindeutig durch Termin und Spieler bestimmt. Pro Termin und Spieler gibt es höchstens eine Bewertung. |
| Löschen bestätigen | Ein Team wird erst gelöscht, wenn der Trainer im Bestätigungsdialog den Teamnamen eintippt. Es gibt keinen Papierkorb. |
| Saison änderbar | Die Saison eines bestehenden Teams darf geändert werden (z. B. Tippfehler). Die Prüfung auf doppelten Namen und Saison gilt auch dabei. |
| Neues Team wird aktiv | Wer ein Team anlegt, hat es danach als aktives Team. Andere Trainer behalten ihr aktives Team. |
| Wappen im Frontend zuschneiden | Das Frontend schneidet das Wappen zu und schickt Original und Zuschnitt als JPEG (max. 5 MB je Bild). Das Backend prüft nur Typ und Größe und braucht keine Bildbibliothek. |
| Aktives Team pro Trainer | Das aktive Team wird pro Trainer im Backend gespeichert und gilt auf allen Endgeräten des Trainers. |
| Aktualität im Frontend | Schreibende Endpunkte antworten erst, wenn die Read-Models die neue Revision verarbeitet haben (höchstens 2 Sekunden). Änderungen anderer Trainer erkennt das Frontend per Polling (Ansichtswechsel, Fenster im Vordergrund, alle 30 Sekunden) mit der Team-Revision als `ETag`. Hat ein anderer Trainer ein Feld inzwischen geändert, wird das Speichern dieses Feldes mit `409 EditConflict` abgelehnt. Kein Push (Details siehe [7](#7-gemeinsamer-datenstand)). |
| Geburtsdatum Pflicht | Ein neuer Spieler braucht Vorname, Name und Geburtsdatum. So lassen sich gleichnamige Spieler unterscheiden. |
| Spieler endgültig löschen | Nur durch den Betreiber auf Anfrage (DSGVO), nicht in der App. Trainer entfernen Spieler aus dem Kader; Spieler ohne Team löscht der tägliche Aufräumjob. |
| Kader übernehmen | Spieler eines anderen Teams lassen sich gesammelt übernehmen, mit Rückennummer und Position, ohne Bewertungen. Das Profil wird über die `playerId` geteilt, nicht kopiert. |
| Termine ohne Uhrzeit | Termine (Spieltage und Trainings) haben nur ein Datum. |
| Speichern je Feld | Bestehende Daten (Team, Kaderspieler, Termin, Bewertung, Einstellungen) werden ohne Speichern-Button bearbeitet: Jede Änderung eines Feldes wird sofort einzeln an das Backend geschickt und gespeichert. Auswahlfelder, Zahlen, Sterne und Schalter speichern bei der Änderung, Textfelder beim Verlassen des Feldes, Bilder nach dem Zuschneiden. Ungültige Eingaben werden nicht geschickt, der Fehler steht am Feld. Jedes Feld zeigt, ob es gerade gespeichert wird, gespeichert ist oder ein Fehler auftrat. Entspricht der Wert dem aktuellen Stand, entsteht kein Event (Regel 12 in [5.2](#52-invarianten-und-regeln)). Nur das Anlegen (Team, Spieler, Spieltag, Training) hat einen Speichern-Button, weil die Pflichtfelder zusammen erfasst werden. |
| Bearbeitungskonflikt | Das Frontend schickt mit jedem Feld auch den Wert, den es zuletzt für dieses Feld geladen bzw. gespeichert hat. Weicht der aktuelle Wert im Backend davon ab, hat ein anderer Trainer das Feld inzwischen geändert: Der Service lehnt mit `409 EditConflict` ab und speichert nichts. Die Antwort enthält den aktuellen Wert; das Frontend zeigt ihn im Feld an mit dem Hinweis, dass ein anderer Trainer ihn geändert hat, und der Trainer kann seine Eingabe wiederholen. Änderungen an anderen Feldern lösen keinen Konflikt aus. Bilder sind ausgenommen. |
| Keine Trainingsserien | Trainings werden einzeln angelegt; „Wie letztes Training“ übernimmt Dauer, Thema und Schwerpunkte als Vorschlag. |
| Eigene Betriebsumgebung | Kaderblick läuft in einer eigenen Docker-Compose-Umgebung mit eigener KurrentDB, getrennt von anderen Anwendungen auf dem Server. Nur der Reverse Proxy SWAG wird gemeinsam genutzt. Adresse: `kaderblick.raspo1926.info` (siehe [8.1.1](#811-bereitstellung)). |
| REST-API nutzt Services | Der Controller oder Callback einer REST-API Methode soll niemals das TeamRepository direkt nutzen, sondern über Service-Klassen erfolgen, die die Verarbeitung von Anfragen orchestrieren. |

## 4. Fachliche Funktionen

### 4.1 Ersteinrichtung und Anmeldung

#### 4.1.1 Anmelden

1. Wer die Webanwendung ohne gültige Sitzung öffnet, sieht die Anmeldeseite. Sie enthält ein verdecktes Eingabefeld **Zugangsschlüssel** und den Button **Anmelden**.
2. Das Backend vergleicht den eingegebenen Schlüssel zeitkonstant mit den Schlüsseln aller Trainer aus der Trainer-Konfiguration. Der Schlüssel allein identifiziert den Trainer.
3. **Erfolg:** Das Backend setzt das Session-Cookie (siehe Begriff „Sitzung“) und das Frontend zeigt die Anwendung mit dem aktiven Team des Trainers.
4. **Falscher Schlüssel:** Das Frontend zeigt „Zugangsschlüssel ungültig“ (`401`). Das Feld bleibt gefüllt, damit Tippfehler korrigiert werden können.
5. **Zu viele Fehlversuche:** Nach 5 fehlgeschlagenen Anmeldungen innerhalb von 15 Minuten von derselben IP-Adresse lehnt das Backend weitere Versuche mit `429` ab (`@fastify/rate-limit`). Das Frontend zeigt „Zu viele Fehlversuche. Bitte in einigen Minuten erneut versuchen.“

#### 4.1.2 Aktives Team nach der Anmeldung

Nach der Anmeldung und bei jedem Start bzw. Neuladen der Webanwendung lädt das Frontend zuerst die Einstellungen des Trainers, bevor es Teamdaten abfragt. Das Backend bestimmt dabei das aktive Team:

- Ist ein Team hinterlegt und existiert es noch, bleibt es aktiv.
- Ist keins hinterlegt oder wurde es gelöscht, wird das nächste verfügbare Team aktiv (neueste Saison, bei Gleichstand alphabetisch nach Name) und gespeichert.
- Existiert noch kein Team (Ersteinrichtung), erscheint der Dialog „Team anlegen“ (siehe [4.5.1](#451-team-anlegen)). Er lässt sich nicht abbrechen; die Reiter sind erst danach nutzbar. Das neue Team wird automatisch das aktive Team des Trainers.

**Aktives Team ist inzwischen gelöscht**

Das aktive Team kann jederzeit von einem anderen Trainer gelöscht werden, auch während die Anwendung geöffnet ist. Damit dabei keine Fehler entstehen, gilt:

- Das Frontend kennt die `activeTeamId` nur aus der letzten Antwort von `GET /me/settings`. Es speichert sie nicht dauerhaft im Browser und nimmt sie nicht aus der Adresszeile; auch die Startseite bzw. ein Lesezeichen führt immer zuerst über die Einstellungen.
- Antwortet ein Endpunkt eines Teams mit `404 TeamDeleted` oder `404 TeamNotFound`, lädt das Frontend sofort die Einstellungen neu. Das Backend wählt dabei das nächste verfügbare Team (siehe oben). Das Frontend wechselt zur Startansicht dieses Teams und zeigt den Hinweis „Das bisherige Team wurde gelöscht. Aktiv ist jetzt {Name} {Saison}.“
- Gibt es kein Team mehr, erscheint der Dialog „Team anlegen“.
- Dieses Verhalten gilt für jede Ansicht, nicht nur für den Reiter `Team`. Die Fehlermeldungen in den einzelnen Abschnitten verweisen darauf.

#### 4.1.3 Sitzung beenden

- **Abmelden:** Über den Button **Abmelden** in den Einstellungen. Das Backend löscht das Session-Cookie, das Frontend zeigt die Anmeldeseite.
- **Ablauf:** Nach 30 Tagen ist die Sitzung abgelaufen. Die nächste Anfrage wird mit `401` beantwortet, und das Frontend zeigt die Anmeldeseite. Nach erneuter Anmeldung kehrt es zur zuletzt geöffneten Ansicht zurück.
- **Trainer entfernt:** Bei jeder Anfrage prüft das Backend, ob die `trainerId` der Sitzung noch in der Trainer-Konfiguration steht. Wurde der Trainer entfernt, ist seine Sitzung sofort ungültig (`401`).

#### 4.1.4 Voraussetzungen an die Trainer-Konfiguration

Weil der Schlüssel allein den Trainer identifiziert, prüft das Backend beim Start die Trainer-Konfiguration und bricht mit einer klaren Fehlermeldung ab, wenn

- zwei Trainer denselben Zugangsschlüssel haben oder
- ein Zugangsschlüssel kürzer als 32 Zeichen ist.

Änderungen an der Trainer-Konfiguration (Trainer hinzufügen, entfernen, Schlüssel ändern) werden beim Neustart des Backends wirksam.

### 4.2 Kader

Der Reiter `Kader` zeigt die Spieler des aktiven Teams und dient zum Hinzufügen, Bearbeiten und Entfernen von Kaderspielern.

**Kaderliste**

- Kopfzeile mit Anzahl der Spieler, z. B. „18 Spieler (16 aktiv)“, und den Buttons **Spieler hinzufügen** und **Aus anderem Team übernehmen**.
- Die aktiven Spieler sind nach Position gruppiert: TW, AB, MF, ST, AR (Allrounder), danach „Ohne Position“. Innerhalb einer Gruppe wird nach Name, dann Vorname sortiert.
- Inaktive Spieler stehen ausgegraut in einer eigenen Gruppe „Inaktiv“ am Ende der Liste, gleich sortiert.
- Jeder Eintrag zeigt Foto (zugeschnitten, sonst Platzhalter), Rückennummer, Vorname und Name, Jahrgang und starken Fuß.
- Haben mehrere Spieler dieselbe Rückennummer, zeigt die Liste bei ihnen einen Hinweis „Nummer doppelt vergeben“.
- Ein Klick auf einen Spieler öffnet den Dialog [Spieler bearbeiten](#423-spieler-bearbeiten).

Die Daten stammen aus dem Read-Model Kader ([5.5.5](#555-kader)), ergänzt um die Profildaten.

#### 4.2.1 Spieler hinzufügen

Der Dialog **Spieler hinzufügen** beginnt mit einem Suchfeld, damit Spieler aus anderen Teams (z. B. der Vorsaison) nicht doppelt angelegt werden.

**Bestehenden Spieler suchen**

- Ab 2 Zeichen sucht das Backend in Vorname und Name aller Spieler, die im Kader mindestens eines nicht gelöschten Teams sind. Groß- und Kleinschreibung spielen keine Rolle.
- Spieler, die bereits im Kader des aktiven Teams sind, erscheinen nicht.
- Jeder Treffer zeigt Foto, Vorname, Name, Geburtsdatum und die Teams, in denen der Spieler ist (Name und Saison).
- Nach Auswahl eines Treffers werden nur noch Rückennummer und Position abgefragt. **Speichern** fügt den Spieler mit seiner bestehenden `playerId` hinzu; sein Profil wird nicht kopiert.

**Neuen Spieler anlegen**

Findet die Suche den Spieler nicht, legt **Neuen Spieler anlegen** ihn an:

| Feld | Pflicht | Eingabe und Prüfung |
|---|---|---|
| Foto | nein | wie beim Wappen: im Frontend zuschneiden, Original und Zuschnitt als JPEG bis 5 MB |
| Vorname | ja | nach Entfernen von Leerzeichen am Rand 1–50 Zeichen |
| Name | ja | nach Entfernen von Leerzeichen am Rand 1–50 Zeichen |
| Geburtsdatum | ja | gültiges Datum, nicht in der Zukunft |
| Starker Fuß | nein | rechts, links, beide |
| Rückennummer | nein | ganze Zahl 1–99 |
| Position | nein | TW, AB, MF, ST, AR (Allrounder) |

Gibt es bereits einen Spieler mit gleichem Vorname, Name und Geburtsdatum, zeigt das Frontend einen Hinweis und bietet an, diesen stattdessen hinzuzufügen. Anlegen bleibt trotzdem möglich.

**Ablauf im Backend (neuer Spieler)**

1. Die Route prüft die Eingaben mit Zod (Felder als JSON, Fotos als Dateien in einem `multipart/form-data`-Request).
2. Der Service vergibt eine zufällige `playerId` und schreibt `profile.json` und die Fotos unter `player/{playerId}/`.
3. Danach lädt er das Team, ruft `addPlayer(...)` auf und speichert `PlayerAddedToSquad`.
4. Antwort: `201` mit der `playerId`.

Schlägt Schritt 3 fehl, bleibt ein Profil ohne Team zurück; der tägliche Aufräumjob löscht es (siehe [5.4.5](#545-aufräumjob-für-spieler)).

#### 4.2.2 Kader aus anderem Team übernehmen

Zum Saisonwechsel lässt sich der Kader eines anderen Teams ganz oder teilweise übernehmen.

1. Der Dialog **Aus anderem Team übernehmen** zeigt alle anderen nicht gelöschten Teams, sortiert wie in der Team-Übersicht.
2. Nach Auswahl eines Teams erscheint dessen Kader mit Kontrollkästchen. Aktive Spieler sind vorausgewählt, inaktive nicht. Spieler, die bereits im aktiven Team sind, sind ausgegraut mit dem Hinweis „bereits im Kader“.
3. **Übernehmen** fügt die ausgewählten Spieler dem aktiven Team hinzu, jeweils mit Rückennummer und Position aus dem Quellteam und als aktive Spieler. Bewertungen werden nicht übernommen.

Im Backend lädt der Service das aktive Team, ruft für jeden ausgewählten Spieler `addPlayer(...)` auf und speichert alle Events in einem Schreibvorgang. Das Quellteam bleibt unverändert. Spieler, die inzwischen bereits im Kader sind, werden übersprungen. Die Antwort nennt die Anzahl der hinzugefügten Spieler.

#### 4.2.3 Spieler bearbeiten

Der Dialog **Spieler bearbeiten** hat zwei Bereiche:

| Bereich | Felder | Gilt für |
|---|---|---|
| Profil | Foto, Vorname, Name, Geburtsdatum, starker Fuß (Prüfungen wie in 4.2.1) | alle Teams des Spielers. Der Dialog weist darauf hin: „Änderungen am Profil gelten in allen Teams.“ |
| Kader | Rückennummer, Position, Aktiv | nur das aktive Team |

- Jedes Feld wird sofort gespeichert (siehe „Speichern je Feld“ und „Bearbeitungskonflikt“). Ein vorhandenes Foto lässt sich entfernen, eine Rückennummer löschen. Eine Position lässt sich ändern und entfernen (`removePosition`); der Spieler steht dann unter „Ohne Position“. **Schließen** beendet den Dialog.
- **Profiländerungen:** Der Service schreibt den geänderten Wert in die Profildatei und danach `PlayerProfileChanged` in jedes Team, in dessen Kader der Spieler ist (siehe [5.3.2](#532-kader)).
- **Kaderänderungen:** Der Service ruft die passende Geschäftsmethode auf (`assignShirtNumber`, `removeShirtNumber`, `changePosition`, `removePosition`, `deactivatePlayer`, `reactivatePlayer`) und speichert das Event.
- **Inaktiv setzen:** Der Dialog weist darauf hin, dass für inaktive Spieler keine Bewertungen erfasst werden können und bereits erfasste erhalten bleiben.
- Antwort je Feld: `200` mit dem aktualisierten Kaderspieler.

#### 4.2.4 Aus dem Kader entfernen

Der Dialog **Spieler bearbeiten** enthält den Button **Aus dem Kader entfernen**. Er öffnet einen Bestätigungsdialog mit den Folgen:

- Alle Bewertungen des Spielers in diesem Team verfallen, seine Kommentare in diesem Team werden gelöscht. Das lässt sich nicht rückgängig machen; wird der Spieler erneut hinzugefügt, beginnt er ohne Bewertungen.
- Ist der Spieler danach in keinem Team mehr, wird sein Profil innerhalb eines Tages gelöscht.

**Entfernen** lädt das Team, ruft `removePlayer(...)` auf, speichert `PlayerRemovedFromSquad` und löscht danach die Kommentardateien des Spielers in diesem Team. Antwort: `204`. Wer einen Spieler nur pausieren will, setzt ihn inaktiv.

#### 4.2.5 Spieler endgültig löschen

Die App bietet keine Funktion, einen Spieler endgültig zu löschen. Verlangt eine Person die Löschung ihrer Daten (DSGVO), löscht der Betreiber sie (siehe [8.4](#84-spieler-auf-anfrage-löschen)). Für Trainer genügt im Alltag „Aus dem Kader entfernen“: Ein Spieler ohne Team wird automatisch gelöscht.

**Fehlermeldungen im Frontend**

| Fall | Meldung |
|---|---|
| `409 PlayerAlreadyInSquad` | „Der Spieler ist bereits im Kader.“ |
| `404 PlayerNotInSquad` | „Der Spieler wurde inzwischen aus dem Kader entfernt.“ Das Frontend lädt den Kader neu. |
| `422` ungültige Eingabe | Meldung am betroffenen Feld |
| `413` bzw. ungültiges Bild | „Das Foto muss ein JPEG-Bild bis 5 MB sein.“ |
| `404 TeamDeleted` / `TeamNotFound` | „Das bisherige Team wurde gelöscht.“ Das Frontend wechselt zum nächsten verfügbaren Team (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)). |
| `409 EditConflict` | „Dieser Wert wurde inzwischen von einem anderen Trainer geändert.“ Das Feld zeigt den aktuellen Wert; die Eingabe kann wiederholt werden. |
| `409 ConcurrencyConflict` | „Der Kader wurde gerade von einem anderen Trainer geändert. Bitte erneut versuchen.“ |

### 4.3 Termine

Der Reiter `Termine` hat zwei Unterreiter, **Spieltage** und **Trainings**. Das Frontend merkt sich den zuletzt gewählten Unterreiter. Ein Klick auf einen Termin öffnet seine [Bewertungsansicht](#433-bewertungsansicht).

Termine haben nur ein Datum, keine Uhrzeit. Die Daten der Listen stammen aus dem Read-Model Termine ([5.5.6](#556-termine)).

#### 4.3.1 Spieltage

**Liste**

- Sortiert nach Datum, neueste zuerst. Oben der Button **Spieltag anlegen**.
- Jeder Eintrag zeigt Datum, Spieltag-Nummer, Gegner, Ort (Heim, Auswärts, Neutral), Wettbewerb, Ergebnis aus Sicht des Teams (farblich als Sieg, Unentschieden oder Niederlage markiert, ohne Ergebnis `–:–`), den Erfassungsstand (z. B. „12 von 16 erfasst“) und ein Symbol, wenn eine Notiz vorhanden ist. Nicht belegte Angaben bleiben leer; ohne Gegner zeigt die Liste „Spieltag“.

**Spieltag anlegen**

| Feld | Pflicht | Eingabe und Prüfung | Vorbelegung |
|---|---|---|---|
| Datum | ja | gültiges Datum | heute |
| Spieltag-Nummer | nein | ganze Zahl ≥ 1 | – |
| Gegner | nein | nach Entfernen von Leerzeichen am Rand bis 100 Zeichen | – |
| Ort | nein | Heim, Auswärts, Neutral | – |
| Wettbewerb | nein | Liga, Pokal, Test, Turnier | – |
| Ergebnis | nein | Tore Team und Tore Gegner, je ganze Zahl ≥ 0; entweder beide oder keins | – |
| Notiz | nein | Freitext bis 2000 Zeichen | – |

Ablauf im Backend:

1. Die Route prüft die Eingaben mit Zod.
2. Der Service vergibt eine zufällige `matchId`. Ist eine Notiz angegeben, schreibt er zuerst `appointment/{matchId}/notes.txt`.
3. Er lädt das Team, ruft `scheduleMatch(...)` auf und je nach Eingabe `recordResult(...)` und `writeAppointmentNotes(...)`, und speichert alle Events in einem Schreibvorgang.
4. Antwort: `201` mit der `matchId`.

**Spieltag bearbeiten**

Der Dialog **Spieltag bearbeiten** wird aus der Bewertungsansicht geöffnet und enthält dieselben Felder, vorbelegt mit den aktuellen Werten. Jedes Feld wird sofort gespeichert; der Service ruft die passende Geschäftsmethode auf (`rescheduleAppointment`, `changeMatchday`, `removeMatchday`, `changeOpponent`, `removeOpponent`, `changeVenue`, `removeVenue`, `changeCompetition`, `removeCompetition`, `recordResult`, `clearResult`, `writeAppointmentNotes`, `removeAppointmentNotes`). Ein geleertes Feld gilt als Entfernen. Das Ergebnis wird erst gespeichert, wenn beide Werte eingetragen oder beide geleert sind. **Schließen** beendet den Dialog. Antwort je Feld: `200`.

**Spieltag löschen**

Der Dialog **Spieltag bearbeiten** enthält den Button **Löschen**. Der Bestätigungsdialog nennt die Folgen: Alle Bewertungen dieses Spieltags verfallen, Notiz und Kommentare werden gelöscht, ein Wiederherstellen ist nicht möglich. Der Service ruft `deleteAppointment(...)` auf, speichert `AppointmentDeleted` und löscht danach `appointment/{matchId}/`. Antwort: `204`.

#### 4.3.2 Trainings

**Liste**

- Sortiert nach Datum, neueste zuerst. Oben der Button **Training anlegen**.
- Jeder Eintrag zeigt Datum, Thema, Schwerpunkte, Dauer, die Teilnahme (z. B. „14 von 16 anwesend“, gezählt werden Anwesend und Verspätet) und ein Symbol, wenn eine Notiz vorhanden ist.

**Training anlegen**

| Feld | Pflicht | Eingabe und Prüfung | Vorbelegung |
|---|---|---|---|
| Datum | ja | gültiges Datum | heute |
| Dauer | ja | ganze Zahl 1–600 Minuten | Trainingszeit aus den Einstellungen des Trainers |
| Thema | nein | Freitext bis 200 Zeichen | – |
| Schwerpunkte | nein | Mehrfachauswahl aus der festen Liste (siehe [5.3.5](#535-trainings)) | – |
| Notiz | nein | Freitext bis 2000 Zeichen | – |

Der Button **Wie letztes Training** füllt Dauer, Thema und Schwerpunkte mit den Werten des zuletzt stattgefundenen Trainings vor. Trainings werden einzeln angelegt; Serien gibt es nicht.

Ablauf im Backend wie bei Spieltagen: zufällige `trainingId`, Notiz zuerst als Datei, dann `scheduleTraining(...)` und ggf. `writeAppointmentNotes(...)` in einem Schreibvorgang. Antwort: `201` mit der `trainingId`.

**Training bearbeiten und löschen**

Wie bei Spieltagen, mit den Geschäftsmethoden `rescheduleAppointment`, `changeTrainingDuration`, `changeTrainingTopic`, `changeTrainingFocus`, `writeAppointmentNotes`, `removeAppointmentNotes` bzw. `deleteAppointment`. Beim Löschen wird `appointment/{trainingId}/` mit Notiz und Kommentaren gelöscht.

#### 4.3.3 Bewertungsansicht

Die Bewertungsansicht zeigt einen Termin mit den Bewertungen aller Spieler. Grundlage ist das Read-Model Termin-Detail ([5.5.7](#557-termin-detail)).

**Kopf**

Termindaten wie in der Liste, dazu die Notiz und der Button **Bearbeiten** (Termin bearbeiten bzw. löschen).

**Spielerliste**

- Alle aktiven Kaderspieler, gruppiert und sortiert wie in der Kaderliste ([4.2](#42-kader)).
- Inaktive Spieler erscheinen nur, wenn für sie bereits etwas erfasst ist, ausgegraut und nur lesbar.
- Jede Zeile zeigt Foto, Name, Einsatz bzw. Anwesenheit (oder „nicht erfasst“), Leistungsnote und bei Spieltagen Tore und Karten.
- Einsatz bzw. Anwesenheit lassen sich direkt in der Zeile wählen und werden sofort gespeichert.
- **Alle Startelf** (Spieltag) bzw. **Alle anwesend** (Training) erfasst sofort alle aktiven Spieler, für die noch nichts erfasst ist (siehe [5.3.7](#537-spielbewertung) und [5.3.8](#538-trainingsbewertung)).
- Ein Klick auf einen Spieler öffnet den Dialog **Bewertung**.

**Dialog Bewertung (Spieltag)**

| Feld | Eingabe |
|---|---|
| Einsatz | Startelf, Eingewechselt, Nicht dabei |
| Leistungsnote | 1–6 in halben Schritten, leer möglich |
| Fairness | 1–6, leer möglich |
| Eigenschaften | je 0–5 Sterne: Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist |
| Tore, Vorlagen, Paraden | ganze Zahl ≥ 0 mit Plus- und Minus-Buttons |
| Karten | Gelb, Gelb-Rot, Rot je als Schalter |
| Kommentar | Freitext bis 2000 Zeichen |

**Dialog Bewertung (Training)**

| Feld | Eingabe |
|---|---|
| Anwesenheit | Anwesend, Verspätet, Entschuldigt, Unentschuldigt |
| Leistungsnote | 1–6 in halben Schritten, leer möglich |
| Fairness | 1–6, leer möglich |
| Eigenschaften | je 0–5 Sterne wie beim Spieltag |
| Kommentar | Freitext bis 2000 Zeichen |

Verhalten in beiden Dialogen:

- Solange kein Einsatz (Startelf, Eingewechselt) bzw. keine Anwesenheit (Anwesend, Verspätet) gewählt ist, sind die Leistungswerte gesperrt. Der Kommentar ist immer möglich.
- Wird Nicht dabei, Entschuldigt oder Unentschuldigt gewählt und sind bereits Leistungswerte erfasst, fragt der Dialog vorher nach, weil diese Werte dann verfallen.
- Jeder Wert wird sofort gespeichert. **Schließen** beendet den Dialog.
- **Vor/Zurück** wechselt zum nächsten bzw. vorherigen Spieler der Liste. Ein Textfeld, das gerade bearbeitet wird, wird vorher gespeichert; schlägt das fehl, bleibt der Dialog beim aktuellen Spieler.
- **Zurücksetzen** setzt die Bewertung nach Rückfrage auf „nicht erfasst“ zurück (`resetRating`); der Kommentar bleibt erhalten.

**Ablauf im Backend**

Je Anfrage wird genau ein Wert eines Spielers gespeichert, im Dialog oder als Einsatz bzw. Anwesenheit aus der Spielerliste:

1. Die Route prüft den Wert und den mitgeschickten zuletzt geladenen Wert mit Zod.
2. Der Service lädt das Team und prüft auf einen Bearbeitungskonflikt: Weicht der aktuelle Wert vom mitgeschickten ab, lehnt er mit `409 EditConflict` ab und liefert den aktuellen Wert. Beim Kommentar wird mit dem Text der Datei verglichen.
3. Beim Kommentar schreibt der Service danach die Kommentardatei. Ein geleerter Kommentar gilt als Entfernen; die Datei wird erst nach dem Event gelöscht.
4. Der Service ruft die passende Geschäftsmethode auf und speichert das Event. Geleerte Noten werden über die `withdraw…`-Methoden zurückgenommen, abgeschaltete Karten über `withdrawCard`.
5. Antwort: `200` mit der aktualisierten Bewertung.

Bewerten zwei Trainer gleichzeitig verschiedene Werte oder verschiedene Spieler, gibt es keinen Konflikt.

**Fehlermeldungen im Frontend**

| Fall | Meldung |
|---|---|
| `404 AppointmentNotFound` | „Dieser Termin wurde inzwischen gelöscht.“ Das Frontend wechselt zur Liste. |
| `404 PlayerNotInSquad` | „Der Spieler wurde inzwischen aus dem Kader entfernt.“ Das Frontend lädt die Ansicht neu. |
| `422 PlayerInactive` | „Der Spieler ist inaktiv und kann nicht bewertet werden.“ |
| `422 NotParticipating` | „Leistungswerte können erst nach Einsatz bzw. Anwesenheit erfasst werden.“ |
| `422` ungültige Eingabe | Meldung am betroffenen Feld |
| `404 TeamDeleted` / `TeamNotFound` | „Das bisherige Team wurde gelöscht.“ Das Frontend wechselt zum nächsten verfügbaren Team (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)). |
| `409 EditConflict` | „Dieser Wert wurde inzwischen von einem anderen Trainer geändert.“ Das Feld zeigt den aktuellen Wert; die Eingabe kann wiederholt werden. |
| `409 ConcurrencyConflict` | „Der Termin wurde gerade von einem anderen Trainer geändert. Bitte erneut versuchen.“ |

### 4.4 Auswertungen

Der Reiter `Auswertungen` fasst die Bewertungen des aktiven Teams zusammen. Er gliedert sich in fünf Ansichten: Teambilanz, Trainingsbilanz, Spielertabelle, Ranglisten und Spielerdetail.

**Filter**

| Filter | Wirkung | Standard |
|---|---|---|
| Zeitraum (Von, Bis) | Nur Termine im Zeitraum werden berücksichtigt. Gilt für alle Ansichten. | ganze Saison |
| Inaktive ausblenden | Inaktive Spieler erscheinen nicht in Spielertabelle, Ranglisten und „Spieler im Training“. Teamwerte (Bilanzen, Durchschnitte über das Team) bleiben unverändert. | ein |

Die Filter gelten für den ganzen Reiter und bleiben beim Wechsel zwischen den Ansichten erhalten.

#### 4.4.1 Rechenregeln

Diese Regeln gelten für alle Ansichten:

- Es zählen nur Bewertungen, deren Leistung zählt (Startelf, Eingewechselt, Anwesend, Verspätet). Verfallene Bewertungen zählen nie.
- Spiel- und Trainingswerte werden getrennt berechnet. Es gibt keinen gemeinsamen Durchschnitt.
- **Durchschnitte** (Ø-Note, Ø-Fairness, Ø-Sterne) sind arithmetische Mittel über alle Termine, an denen der Wert erfasst ist. Nicht erfasste Einzelwerte zählen nicht als 0. Angezeigt wird mit einer Nachkommastelle, daneben die Anzahl der Werte (z. B. `2,3 (7)`).
- **Notenskala:** Leistungsnote und Fairness sind Schulnoten, 1 ist die beste Note.
- **Einsatz** im Spiel heißt Startelf oder Eingewechselt.
- **Trainingsbeteiligung** eines Spielers: Anzahl Anwesend und Verspätet geteilt durch die Anzahl der Trainings, für die eine Anwesenheit des Spielers erfasst ist, in Prozent ohne Nachkommastelle.
- Ein Wert ohne Grundlage (z. B. Ø-Note ohne erfasste Note) wird als `–` angezeigt.

#### 4.4.2 Teambilanz

Kennzahlen aus den Spieltagen:

| Kennzahl | Berechnung |
|---|---|
| Spiele | Anzahl Spieltage im Zeitraum |
| Siege, Unentschieden, Niederlagen | aus dem Ergebnis; Spieltage ohne Ergebnis zählen nur bei „Spiele“ und werden als „ohne Ergebnis“ ausgewiesen |
| Tore, Gegentore, Tordifferenz | Summe über die Ergebnisse |
| Ø-Spielnote des Teams | Durchschnitt aller erfassten Spielnoten |

#### 4.4.3 Trainingsbilanz

| Kennzahl | Berechnung |
|---|---|
| Einheiten | Anzahl Trainings im Zeitraum |
| Stunden insgesamt | Summe der Trainingsdauer aller Trainings, in Stunden mit einer Nachkommastelle |
| Beteiligung | Anwesend und Verspätet geteilt durch alle erfassten Anwesenheiten, in Prozent |
| Ø-Teilnehmer | Anwesend und Verspätet je Training, gemittelt über Trainings mit mindestens einer erfassten Anwesenheit |
| Ø-Unentschuldigt | Unentschuldigt je Training, gemittelt über dieselben Trainings |
| Ø-Trainingsnote | Durchschnitt aller erfassten Trainingsnoten |

Diagramme:

- **Trainingsbeteiligung im Zeitverlauf:** Liniendiagramm, ein Punkt je Training (Datum) mit der Beteiligung dieses Trainings in Prozent.
- **Trainingsnote im Zeitverlauf:** Liniendiagramm, ein Punkt je Training mit der Ø-Note dieses Trainings. Trainings ohne Note haben keinen Punkt.
- **Trainingsschwerpunkte:** Balkendiagramm (Histogramm) mit der Anzahl Trainings je Schwerpunkt. Ein Training mit mehreren Schwerpunkten zählt bei jedem.

**Spieler im Training:** Tabelle mit einer Zeile je Spieler: Anwesend, Verspätet, Entschuldigt, Unentschuldigt (jeweils Anzahl), Beteiligung, Ø-Note, Ø-Fairness. Sortierbar nach jeder Spalte, Standard: Beteiligung absteigend.

#### 4.4.4 Spielertabelle

Eine Zeile je Spieler mit Rückennummer und Name. Die Tabelle hat zwei Spaltengruppen, zwischen denen umgeschaltet wird:

| Gruppe | Spalten |
|---|---|
| Spiel | Einsätze, davon Startelf, Tore, Vorlagen, Paraden, Gelb, Gelb-Rot, Rot, Ø-Note, Ø-Fairness, Ø-Sterne je Eigenschaft |
| Training | Beteiligung, Ø-Note, Ø-Fairness, Ø-Sterne je Eigenschaft |

Jede Spalte ist sortierbar, Standard ist Name, dann Vorname (alphabetisch). Ein Klick auf eine Zeile öffnet das Spielerdetail.

#### 4.4.5 Ranglisten

| Rangliste | Sortierung |
|---|---|
| Torschützen | Tore absteigend |
| Vorlagengeber | Vorlagen absteigend |
| Scorer | Tore plus Vorlagen absteigend |
| Ø-Spielnote | aufsteigend (beste zuerst) |
| Ø-Trainingsnote | aufsteigend |
| Ø-Fairness (Spiel) | aufsteigend |
| Trainingsbeteiligung | absteigend |

- Jede Rangliste zeigt die ersten 5 Plätze; „Alle anzeigen“ klappt die vollständige Liste auf.
- Gleiche Werte ergeben den gleichen Platz (z. B. 1, 2, 2, 4).
- Spieler mit dem Wert 0 bzw. ohne Grundlage erscheinen nicht.
- Es gibt keine Mindestanzahl an Bewertungen. Neben jedem Durchschnitt steht die Anzahl der Werte.

#### 4.4.6 Spielerdetail

Wird aus Spielertabelle, Ranglisten oder „Spieler im Training“ geöffnet und zeigt einen Spieler im gewählten Zeitraum:

- **Kopf:** Foto, Name, Rückennummer, Position, aktiv bzw. inaktiv.
- **Kennzahlen:** die Werte der Spielertabelle für Spiel und Training.
- **Notenverlauf:** Liniendiagramm mit je einer Linie für Spielnote und Trainingsnote, ein Punkt je Termin.
- **Eigenschaften:** Netzdiagramm mit den Ø-Sternen der fünf Eigenschaften, je eine Fläche für Spiel und Training.
- **Anwesenheit:** gestapelter Balken über die volle Breite mit je einem Abschnitt für Anwesend, Verspätet, Entschuldigt und Unentschuldigt (Anteil an allen Trainings mit erfasster Anwesenheit). Darunter je Kategorie Anzahl und Prozent. Kategorien ohne Trainings haben keinen Abschnitt, stehen aber mit 0 in der Aufstellung.
- **Termine:** Liste aller Termine mit erfasster Bewertung (Datum, Gegner bzw. Thema, Einsatz bzw. Anwesenheit, Note). Ein Klick öffnet die Bewertungsansicht des Termins.

#### 4.4.7 Ablauf im Backend

Die Auswertungen werden bei jeder Anfrage aus den Read-Models Termine und Termin-Detail berechnet, gefiltert nach dem Zeitraum (siehe [5.5.8](#558-auswertung)). Namen und Fotos ergänzt das Backend erst beim Ausliefern aus den Profildateien. Das Ausblenden inaktiver Spieler und das Sortieren übernimmt das Frontend. Die Antworten tragen die Team-Revision als `ETag` (siehe [7.2](#72-änderungen-anderer-trainer-erkennen)).

### 4.5 Team

Der Reiter `Team` zeigt das aktive Team und dient zum Wechseln, Anlegen und Verwalten von Teams.

**Aktives Team**

Oben steht eine Übersicht des aktiven Teams:

- Wappen (oder Platzhalterbild), Name, Saison (angezeigt als `2026/27`) und Spielklasse,
- Trainerangabe, sofern vorhanden,
- Kennzahlen: Anzahl Spieler im Kader, erfasste Spieltage und Trainings.

Darunter die Aktionen für das aktive Team:

| Aktion | Beschreibung |
|---|---|
| **Bearbeiten** | öffnet den Dialog [Team bearbeiten](#452-team-bearbeiten-und-löschen), dort auch Löschen |
| **Bewertungen als CSV** | öffnet den Export-Dialog ([4.5.3](#453-bewertungen-als-csv-exportieren)) |
| **Saisonbilanz teilen** | siehe [4.5.4](#454-saisonbilanz-teilen) |

**Alle Teams**

Darunter folgt die Liste aller nicht gelöschten Teams, sortiert nach Saison (neueste zuerst), dann Name. Jeder Eintrag zeigt Wappen, Name, Saison und Spielklasse; das aktive Team ist hervorgehoben.

- Ein Klick auf ein anderes Team macht es zum aktiven Team des Trainers. Das Backend speichert die Auswahl in seinen Einstellungen, und alle Reiter zeigen danach dieses Team.
- Der Button **Team anlegen** öffnet den Dialog [Team anlegen](#451-team-anlegen).

Die Daten stammen aus dem Read-Model Team-Übersicht ([5.5.3](#553-team-übersicht)).

#### 4.5.1 Team anlegen

Der Dialog **Team anlegen** wird über den Reiter `Team` geöffnet. Bei der Ersteinrichtung erscheint er automatisch und lässt sich nicht abbrechen (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)).

**Eingabefelder**

| Feld | Pflicht | Eingabe und Prüfung |
|---|---|---|
| Wappen | nein | Bild auswählen und im Frontend zuschneiden (siehe unten) |
| Name | ja | Freitext, nach Entfernen von Leerzeichen am Rand 1–100 Zeichen |
| Saison | ja | Freitext im Format `JJJJ_JJ`, `JJ` muss das Folgejahr von `JJJJ` sein (z. B. `2026_27`). Als Platzhalter wird die aktuelle Saison angezeigt (Saisonwechsel am 1. Juli). |
| Spielklasse | nein | Freitext bis 50 Zeichen mit Vorschlägen: Kreisklasse, Kreisliga, Bezirksliga, Landesliga, Oberliga |
| Trainer | nein | Freitext bis 500 Zeichen, z. B. „Max Muster, Erika Beispiel“ |

Das Frontend prüft die Felder bereits bei der Eingabe und zeigt Fehler direkt am Feld. Maßgeblich ist die Prüfung im Backend.

**Wappen**

- Das Frontend lässt ein Bild auswählen, zeigt einen quadratischen Zuschnitt zur Auswahl und erzeugt daraus das Originalbild und das zugeschnittene Bild.
- Beide Bilder werden als JPEG an das Backend geschickt. Andere Formate (z. B. PNG) wandelt das Frontend vorher in JPEG um.
- Das Backend nimmt nur JPEG bis 5 MB je Bild an und prüft Typ und Größe. Es bearbeitet die Bilder nicht.

**Buttons**

- **Abbrechen** verwirft alle Eingaben und schließt den Dialog. Bei der Ersteinrichtung gibt es keinen Abbrechen-Button.
- **Speichern** schickt die Eingaben an das Backend. Während des Speicherns ist der Button gesperrt.

**Ablauf im Backend**

1. Die Route prüft die Eingaben mit Zod (Felder als JSON, Bilder als Dateien in einem `multipart/form-data`-Request).
2. Der Service prüft über die Team-Übersicht, ob es bereits ein nicht gelöschtes Team mit gleichem Namen und gleicher Saison gibt. Wenn ja: `409 DuplicateTeam`.
3. Der Service vergibt die nächste `teamId` (siehe [5.1.3](#513-vergabe-der-team-nummer)), erzeugt das Team über `Team.create(...)` und speichert `TeamCreated`.
4. Erst danach, wenn die `teamId` feststeht, schreibt der Service Wappen und Trainerangabe als Dateien unter `team/{teamId}/` und speichert `CrestUploaded` bzw. `CoachesChanged`. So kann eine bei der Nummernvergabe verworfene `teamId` nie die Dateien eines anderen Teams überschreiben.
5. Der Service setzt das neue Team als aktives Team des anlegenden Trainers. Andere Trainer behalten ihr aktives Team.
6. Antwort: `201` mit der `teamId` und einem `Location`-Header.

Schlägt Schritt 4 fehl, bleibt das Team ohne Wappen bzw. Trainerangabe bestehen. Die Antwort ist trotzdem `201`, enthält aber einen Hinweis; das Frontend zeigt „Team angelegt, Wappen bzw. Trainer konnten nicht gespeichert werden“. Beides lässt sich unter [4.5.2](#452-team-bearbeiten-und-löschen) nachtragen.

**Fehlermeldungen im Frontend**

| Fall | Meldung |
|---|---|
| `409 DuplicateTeam` | „Ein Team mit diesem Namen und dieser Saison existiert bereits.“ |
| `422 InvalidName` / `InvalidSeason` | Meldung am betroffenen Feld |
| `413` bzw. ungültiges Bild | „Das Wappen muss ein JPEG-Bild bis 5 MB sein.“ |

#### 4.5.2 Team bearbeiten und löschen

**Bearbeiten**

Der Dialog **Team bearbeiten** enthält dieselben Felder und Prüfungen wie [Team anlegen](#451-team-anlegen), vorbelegt mit den aktuellen Werten. Zusätzlich lässt sich ein vorhandenes Wappen entfernen.

- Jedes Feld wird sofort gespeichert (siehe „Speichern je Feld“), ein neues Wappen nach dem Zuschneiden. Der Service ruft die passende Geschäftsmethode auf (`rename`, `changeSeason`, `changeTier`, `uploadCrest`, `removeCrest`, `changeCoaches`, `removeCoaches`) und speichert das Event.
- **Schließen** beendet den Dialog.
- Ändert sich Name oder Saison, prüft der Service über die Team-Übersicht, ob es bereits ein anderes nicht gelöschtes Team mit dem neuen Namen und der neuen Saison gibt. Wenn ja: `409 DuplicateTeam`, der Wert wird nicht gespeichert.
- Wappen und Trainerangabe: Beim Hochladen bzw. Ändern wird erst die Datei geschrieben, dann das Event. Beim Entfernen wird erst das Event geschrieben, dann die Datei gelöscht. Ein leeres Trainerfeld gilt als Entfernen.
- Antwort je Feld: `200` mit dem aktualisierten Team.

Für jedes Feld gilt die Konfliktprüfung (siehe „Bearbeitungskonflikt“).

**Löschen**

Der Dialog **Team bearbeiten** enthält zusätzlich den Button **Löschen**. Er öffnet einen Bestätigungsdialog:

- Der Dialog nennt die Folgen: Kader, Termine und Bewertungen des Teams sind danach nicht mehr verfügbar; Wappen, Trainerangabe, Notizen und Kommentare werden sofort gelöscht; Spieler, die in keinem anderen Team sind, werden innerhalb eines Tages gelöscht. Ein Wiederherstellen ist nicht möglich.
- Der Button **Endgültig löschen** wird erst aktiv, wenn der Name des Teams exakt eingetippt wurde.
- **Abbrechen** schließt den Dialog ohne Änderung.

Ablauf im Backend:

1. Der Service prüft über die Team-Übersicht, ob es das letzte nicht gelöschte Team ist. Wenn ja: `422 LastTeam`.
2. Das Team wird geladen, `delete()` aufgerufen und `TeamDeleted` gespeichert.
3. Der Service löscht `team/{teamId}/`.
4. Antwort: `204`.

War das gelöschte Team das aktive Team eines Trainers, wird beim nächsten Lesen seiner Einstellungen das nächste verfügbare Team aktiv (siehe Getroffene Entscheidungen). Das Frontend des löschenden Trainers lädt seine Einstellungen direkt nach dem Löschen neu.

**Fehlermeldungen im Frontend**

| Fall | Meldung |
|---|---|
| `409 DuplicateTeam` | „Ein Team mit diesem Namen und dieser Saison existiert bereits.“ |
| `422 LastTeam` | „Das letzte Team kann nicht gelöscht werden. Lege zuerst ein weiteres Team an.“ |
| `404 TeamDeleted` / `TeamNotFound` | „Das bisherige Team wurde gelöscht.“ Das Frontend wechselt zum nächsten verfügbaren Team (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)). |
| `409 EditConflict` | „Dieser Wert wurde inzwischen von einem anderen Trainer geändert.“ Das Feld zeigt den aktuellen Wert; die Eingabe kann wiederholt werden. |
| `409 ConcurrencyConflict` | „Das Team wurde gerade von einem anderen Trainer geändert. Bitte erneut versuchen.“ |

#### 4.5.3 Bewertungen als CSV exportieren

Der Export liefert die Bewertungen des aktiven Teams als CSV-Datei, z. B. zur eigenen Auswertung in Excel.

**Dialog**

| Feld | Eingabe | Standard |
|---|---|---|
| Art | Spieltage, Trainings oder beides | beides |
| Von | Datum, optional | ohne Untergrenze |
| Bis | Datum, optional | ohne Obergrenze |

- Ohne Datumsangaben wird die ganze Saison exportiert. Ist **Von** später als **Bis**, zeigt das Frontend den Fehler am Feld.
- Der Dialog weist darauf hin: „Die Datei enthält Namen und Kommentare der Spieler. Gib sie nicht weiter und lösche sie, wenn du sie nicht mehr brauchst.“
- **Exportieren** lädt die Datei herunter und schließt den Dialog. **Abbrechen** schließt den Dialog ohne Export.

**Inhalt**

Eine Zeile je Termin und Spieler mit erfasstem Einsatz bzw. erfasster Anwesenheit. Spieler mit Status „nicht erfasst“ erscheinen nicht, Spieler mit Nicht dabei, Entschuldigt oder Unentschuldigt schon (ohne Leistungswerte). Verfallene Bewertungen (gelöschte Termine, aus dem Kader entfernte Spieler) erscheinen nicht. Exportiert werden auch Bewertungen inaktiver Spieler.

Spieltage und Trainings stehen in derselben Datei; die Spalte **Art** unterscheidet sie. Spalten, die für die Art nicht gelten, bleiben leer. Sortiert wird nach Datum, dann Art (Spieltag vor Training), dann Rückennummer, dann Name.

| Spalte | Spieltag | Training |
|---|---|---|
| Art | `Spieltag` | `Training` |
| Datum | ✓ | ✓ |
| Spieltag-Nr. | ✓ | – |
| Gegner | ✓ | – |
| Ort | ✓ | – |
| Wettbewerb | ✓ | – |
| Tore Team | ✓ | – |
| Tore Gegner | ✓ | – |
| Dauer | – | ✓ |
| Thema | – | ✓ |
| Schwerpunkte | – | ✓ |
| Rückennummer | aktueller Stand im Kader | aktueller Stand im Kader |
| Position | aktueller Stand im Kader | aktueller Stand im Kader |
| Vorname | ✓ | ✓ |
| Name | ✓ | ✓ |
| Teilnahme | Startelf, Eingewechselt, Nicht dabei | Anwesend, Verspätet, Entschuldigt, Unentschuldigt |
| Leistungsnote | ✓ | ✓ |
| Fairness | ✓ | ✓ |
| Einsatz & Laufbereitschaft | ✓ | ✓ |
| Technik | ✓ | ✓ |
| Spielverständnis | ✓ | ✓ |
| Zweikampf | ✓ | ✓ |
| Teamgeist | ✓ | ✓ |
| Tore | ✓ | – |
| Vorlagen | ✓ | – |
| Paraden | ✓ | – |
| Gelb | Anzahl gezeigter Karten | – |
| Gelb-Rot | Anzahl gezeigter Karten | – |
| Rot | Anzahl gezeigter Karten | – |
| Kommentar | ✓ | ✓ |

- Zählt die Leistung nicht (Nicht dabei, Entschuldigt, Unentschuldigt), bleiben alle Leistungswerte leer. Nicht erfasste Einzelwerte bleiben ebenfalls leer.
- Tore Team und Tore Gegner stehen als Zahlen, damit Excel damit rechnen kann; ohne erfasstes Ergebnis bleiben beide leer. Schwerpunkte stehen als Liste, durch Komma getrennt (z. B. `Technik, Taktik`).
- Gelöschte Spieler erscheinen als Vorname leer, Name „Gelöschter Spieler“, ohne Kommentar.

**Format**

Die Datei ist für deutsches Excel ausgelegt und öffnet sich per Doppelklick korrekt:

| Eigenschaft | Festlegung |
|---|---|
| Zeichensatz | UTF-8 mit BOM |
| Trennzeichen | Semikolon |
| Zeilenende | CRLF |
| Kopfzeile | deutsche Spaltennamen wie in der Tabelle oben |
| Datum | `TT.MM.JJJJ` |
| Dezimalzahlen | Dezimalkomma, z. B. `2,5` |
| Maskierung | Felder mit Semikolon, Anführungszeichen oder Zeilenumbruch stehen in doppelten Anführungszeichen, enthaltene Anführungszeichen werden verdoppelt |
| Formelschutz | Freitexte (Name, Gegner, Thema, Kommentar), die mit `=`, `+`, `-` oder `@` beginnen, erhalten ein vorangestelltes `'`, damit Excel sie nicht als Formel ausführt |
| Dateiname | `Bewertungen_{Teamname}_{Saison}.csv`, z. B. `Bewertungen_D1-Junioren_2026_27.csv`; Zeichen, die in Dateinamen nicht erlaubt sind, werden durch `_` ersetzt |

**Ablauf im Backend**

1. Die Route prüft die Parameter (Art, Von, Bis) mit Zod; ist Von später als Bis: `400`.
2. Der Service setzt die Zeilen aus den Read-Models Termine ([5.5.6](#556-termine)), Termin-Detail ([5.5.7](#557-termin-detail)) und Kader ([5.5.5](#555-kader)) zusammen und ergänzt Namen und Kommentare aus den Dateien.
3. Antwort: `200` mit `Content-Type: text/csv; charset=utf-8` und `Content-Disposition: attachment` mit dem Dateinamen. Gibt es keine passenden Bewertungen, enthält die Datei nur die Kopfzeile.

Der Export schreibt keine Events. Protokolliert werden nur `teamId` und Parameter, nie Inhalte der Datei.

#### 4.5.4 Saisonbilanz teilen

Die Saisonbilanz ist ein Bild, das der Trainer mit Eltern und Mannschaft teilt, z. B. in einer Messenger-Gruppe. Sie zeigt Teamwerte und die erfolgreichsten Spieler, aber keine Noten oder Bewertungen einzelner Spieler, damit niemand bloßgestellt wird.

**Inhalt**

Grundlage ist immer die ganze Saison des aktiven Teams. Die Filter des Reiters `Auswertungen` gelten nicht.

| Bereich | Inhalt |
|---|---|
| Kopf | Wappen (oder Platzhalter), Name, Saison (`2026/27`), Spielklasse |
| Teambilanz | Spiele, Siege, Unentschieden, Niederlagen, Tore:Gegentore |
| Trainingsbilanz | Einheiten, Stunden insgesamt, Beteiligung |
| Top-Torschützen | Plätze 1–3 mit vollem Namen und Anzahl Tore |
| Top-Vorlagengeber | Plätze 1–3 mit vollem Namen und Anzahl Vorlagen |
| Trainingsfleiß | Plätze 1–3 mit vollem Namen und Trainingsbeteiligung in Prozent |
| Fußzeile | „Erstellt mit Kaderblick“ und Datum der Erstellung |

- Die Werte werden nach den Rechenregeln aus [4.4.1](#441-rechenregeln) berechnet; Ranglisten wie in [4.4.5](#445-ranglisten): Gleiche Werte ergeben den gleichen Platz, Spieler mit dem Wert 0 erscheinen nicht.
- In den Top-Listen erscheinen alle Spieler bis Platz 3, bei Gleichstand also auch mehr als drei, höchstens aber fünf Namen. Gibt es mehr Spieler mit gleichem Wert, steht nach dem fünften Namen „und weitere“.
- Inaktive Spieler werden berücksichtigt, Spieler mit gelöschtem Profil nicht.
- Hat das Team noch keine Spieltage bzw. Trainings, entfällt der jeweilige Bereich samt Top-Liste.

**Ablauf im Frontend**

1. Der Button **Saisonbilanz teilen** im Reiter `Team` lädt die Auswertung des aktiven Teams für die ganze Saison und zeigt eine Vorschau des Bildes in einem Dialog.
2. Der Dialog weist darauf hin: „Das Bild enthält die vollständigen Namen von Spielern. Teile es nur mit Eltern und Mannschaft.“
3. **Teilen** öffnet das Teilen-Menü des Geräts (Web Share API mit Datei). Bietet der Browser das nicht an, gibt es nur **Herunterladen**.
4. **Herunterladen** speichert das Bild als `Saisonbilanz_{Teamname}_{Saison}.png`; unzulässige Zeichen im Dateinamen werden durch `_` ersetzt.
5. **Schließen** beendet den Dialog.

Das Bild erzeugt das Frontend (PNG, 1080 × 1350 Pixel, Hochformat) mit eingebetteter Schrift, damit es auf allen Geräten gleich aussieht. Das Backend braucht dafür keinen eigenen Endpunkt: Es liefert die Auswertung wie für den Reiter `Auswertungen` (siehe [4.4.7](#447-ablauf-im-backend)). Das Bild wird nirgends gespeichert.

### 4.6 Einstellungen

Der Reiter `Einstellungen` hat drei Bereiche.

**Angemeldeter Trainer**

Zeigt Name und E-Mail des angemeldeten Trainers aus der Trainer-Konfiguration, nur lesbar. Darunter der Button **Abmelden** (siehe [4.1.3](#413-sitzung-beenden)). Änderungen an Name oder E-Mail erfolgen über die Trainer-Konfiguration ([8.1](#81-konfiguration)).

**Einstellungen des Trainers**

| Feld | Pflicht | Eingabe und Prüfung | Standard | Wirkung |
|---|---|---|---|---|
| Trainingszeit | ja | ganze Zahl 1–600 Minuten | 90 | Vorbelegung der Dauer beim Anlegen eines Trainings ([4.3.2](#432-trainings)) |
| Darstellung | ja | Hell, Dunkel, Wie System | Wie System | Farbschema des Frontends |

- Jeder Wert wird sofort gespeichert (siehe „Speichern je Feld“). Der Service schreibt ihn in `trainer/{trainerId}/settings.json`; die übrigen Werte und das aktive Team in derselben Datei bleiben unverändert. Antwort: `200`.
- Eine geänderte Darstellung wird sofort angewendet.
- Die Einstellungen gelten für den Trainer auf allen seinen Geräten. Die Trainingszeit wirkt nur auf neue Trainings; bereits gespeicherte Trainings ändern sich nicht.
- Vor der Anmeldung kennt das Frontend den Trainer nicht; die Anmeldeseite nutzt deshalb immer das Farbschema des Systems.
- Die Einstellungen gehören nur einem Trainer und erzeugen keine Events. Es gibt keine Konfliktprüfung: Speichert derselbe Trainer auf zwei Geräten, gilt der zuletzt gespeicherte Stand.
- Fehlt `settings.json` oder ein Wert darin, gelten die Standardwerte.

**Info**

Versionsnummer des Frontends und des Backends. Das Backend liefert seine Version über einen Endpunkt ohne Anmeldung (siehe [6](#6-api)).

## 5. Domänenmodell

### 5.1 Aggregates und Streams

#### 5.1.1 Ein Aggregate: `Team`

Kaderblick hat genau ein Aggregate, die Klasse `Team`. Es umfasst Teamdaten, Kader, Termine (Spieltage und Trainings) und Bewertungen eines Teams in einer Saison.

Der Schnitt folgt den Regeln aus [5.2](#52-invarianten-und-regeln): Fast jede Bewertungsregel braucht gleichzeitig den Kader (Spieler im Kader, aktiv), den Termin (existiert, nicht gelöscht) und die bisherige Bewertung (Einsatz erfasst, Karte schon gezeigt). Getrennte Aggregates für Kader, Spieltage oder Trainings würden diese Regeln auf mehrere Konsistenzgrenzen verteilen. Nebenläufigkeit spricht nicht dagegen: Wenige Trainer arbeiten gleichzeitig an einem Team, und Konflikte werden durch einmaliges Neuladen aufgelöst.

Bewusst **keine** Aggregates sind:

| Gegenstand | Grund | Ablage |
|---|---|---|
| Spieler (Profil) | Keine Invarianten; ausschließlich personenbezogene Daten, die löschbar sein müssen. | Datei `./data/player/{playerId}/` |
| Trainer-Einstellungen | Keine Invarianten, keine Historie nötig. | Datei `./data/trainer/{trainerId}/settings.json` |
| Team-übergreifende Regeln (doppelter Name, letztes Team) | Betreffen mehrere Teams; bewusst über die Team-Übersicht geprüft (siehe Getroffene Entscheidungen). | – |

**Aufbau des Aggregates**

Das Team enthält neben den Teamdaten den Kader und die Termine. Termine und Bewertungen sind als Klassenhierarchien innerhalb des Aggregates modelliert; sie sind keine eigenen Aggregates und werden nur über Geschäftsmethoden von `Team` verändert.

```
Team
├── Kader: Map<playerId, SquadMember>
└── Termine: Map<appointmentId, Appointment>

Appointment (abstrakt)          id, date, hasNotes, deleted, ratings: Map<playerId, Rating>
├── Match                       matchday, opponent, venue, competition, result
└── Training                    duration, topic, focus

Rating (abstrakt)               grade, fairness, attributes, hasComment, counts()
├── MatchRating                 participation, goals, assists, saves, cards
└── TrainingRating              attendance
```

- `counts()` beantwortet jede Unterklasse selbst: `MatchRating` bei Startelf oder Eingewechselt, `TrainingRating` bei Anwesend oder Verspätet. Alle gemeinsamen Regeln (Einsatz zuerst, Werte verfallen) nutzen nur `counts()`.
- Ein Termin erzeugt die passende Bewertungsart (`createRating()`), sodass gemeinsame Geschäftsmethoden nicht nach Spieltag und Training unterscheiden müssen.
- Read-Models und Auswertung nutzen dieselben Klassen bzw. dieselbe Logik für „Leistung zählt“ (siehe [5.5.1](#551-grundsätze)).

#### 5.1.2 Stream

| Eigenschaft | Festlegung |
|---|---|
| Name | `team-{teamId}`, z. B. `team-7` |
| Kategorie | `team` (KurrentDB leitet sie am ersten Bindestrich ab) |
| Inhalt | Alle Events aus [5.3](#53-geschäftsmethoden-und-events) eines Teams, beginnend mit `TeamCreated` |
| Event-Typ | Name des Events, z. B. `PerformanceGraded` |
| Event-Daten | JSON-Payload laut Zod-Schema des Events; beim Lesen wird jedes Event damit geprüft |
| Weitere Streams | Keine |

Der Stream ist durch die Saison begrenzt: Ein Team gehört zu genau einer Saison, für die nächste Saison wird ein neues Team angelegt. Grob geschätzt entstehen pro Saison einige zehntausend Events (z. B. 30 Spieltage und 80 Trainings mit je 20 Spielern und mehreren Werten pro Bewertung). Das Laden eines Teams bleibt damit ohne Snapshots schnell genug. Snapshots werden erst eingeführt, wenn Messungen das erfordern.

#### 5.1.3 Vergabe der Team-Nummer

Die `teamId` ist eine fortlaufende Nummer, die das Backend beim Anlegen vergibt:

1. Der Service nimmt die höchste bekannte `teamId` aus der Team-Übersicht (einschließlich gelöschter Teams) und addiert 1.
2. Das neue Team wird mit `NO_STREAM` gespeichert.
3. Ist die Nummer durch einen endgültig gelöschten Stream gesperrt (`StreamDeleted`), nimmt der Service die nächste Nummer, so lange, bis eine frei ist. Gesperrte Nummern zählen nicht als Fehlversuch.
4. Existiert der Stream bereits (gleichzeitiges Anlegen oder Projektion noch nicht aktuell), versucht der Service einmal die nächste Nummer. Schlägt auch das fehl, wird mit `409` abgelehnt.

Nummern werden nicht wiederverwendet: Der Aufräumjob löscht verwaiste Streams endgültig (Tombstone), sodass unter derselben Nummer kein neuer Stream entstehen kann. Nach dem Scavenge fehlen gelöschte Teams auch in der Team-Übersicht, Schritt 1 kann deshalb eine gesperrte Nummer liefern; Schritt 3 überspringt sie.

#### 5.1.4 Laden und Speichern

- **Laden:** Das `TeamRepository` liest alle Events von `team-{teamId}`, prüft sie mit ihren Zod-Schemas und erzeugt das Team über `Team.fromEvents(events)`. Es liefert das Team zusammen mit der gelesenen Revision. Existiert der Stream nicht, liefert es `TeamNotFound`.
- **Speichern:** Das Repository schreibt `team.pendingEvents` mit der gelesenen Revision als erwartetem Stream-Stand (bei einem neuen Team `NO_STREAM`). Eine abweichende Revision wird zu `ConcurrencyConflict` (siehe „Team speichern“ in den Getroffenen Entscheidungen).
- **Ein Schreibvorgang, ein Team:** Jeder Schreibvorgang verändert genau ein Team. Vorgänge, die mehrere Teams betreffen (z. B. `PlayerProfileChanged` für alle Teams eines Spielers), schreibt der Service nacheinander in jedes Team einzeln.

### 5.2 Invarianten und Regeln

Alle Regeln werden in der Klasse `Team` durchgesetzt. Die Zod-Schemas der Routen prüfen Formate zusätzlich am Eingang, maßgeblich sind aber die Regeln im Aggregate.

1. **Lebenszyklus:** Ein Team wird genau einmal über `Team.create(...)` angelegt. Nach `TeamDeleted` lehnt jede Geschäftsmethode mit `TeamDeleted` ab; nur ein erneutes Löschen liefert `Ok` ohne Event.
2. **Teamdaten:** Der Name ist nach Entfernen von Leerzeichen am Rand mindestens 1 Zeichen lang. Die Saison hat das Format `JJJJ_JJ`, wobei `JJ` die letzten beiden Ziffern von `JJJJ + 1` sind (z. B. `2026_27`, `2099_00`).
3. **Kader:** Ein Spieler ist höchstens einmal im Kader eines Teams (sonst `PlayerAlreadyInSquad`); in mehreren Teams darf er stehen. Nur Kaderspieler können bearbeitet und bewertet werden: Alle Methoden mit einer `playerId` außer `addPlayer` (Rückennummer, Position, Deaktivieren, Entfernen, alle Bewertungswerte) lehnen sonst mit `PlayerNotInSquad` ab. Doppelte Rückennummern sind erlaubt; das Frontend zeigt nur einen Hinweis.
4. **Inaktive Spieler:** Für inaktive Spieler können keine Bewertungswerte erfasst oder geändert werden. Bereits erfasste Werte bleiben erhalten.
5. **Termine:** Bewertungen gibt es nur für bestehende, nicht gelöschte Spieltage bzw. Trainings. Eine Termin-ID wird innerhalb eines Teams nur einmal vergeben.
6. **Einsatz zuerst:** Leistungswerte (Leistungsnote, Fairness, Eigenschaften, Tore, Vorlagen, Paraden, Karten) können nur erfasst werden, wenn der Spieler als Startelf oder Eingewechselt (Spieltag) bzw. Anwesend oder Verspätet (Training) erfasst ist. Sonst lehnt die Methode mit `NotParticipating` ab.
7. **Werte verfallen:** Wird ein Spieler auf Nicht dabei bzw. Entschuldigt oder Unentschuldigt gesetzt, verfallen seine Leistungswerte für diesen Termin. Wird er danach wieder auf Startelf, Eingewechselt, Anwesend oder Verspätet gesetzt, beginnt die Erfassung leer. Der Wechsel zwischen Startelf und Eingewechselt bzw. zwischen Anwesend und Verspätet lässt die Werte unverändert. Kommentare sind keine Leistungswerte und bleiben erhalten.
8. **Wertebereiche:** Leistungsnote 1–6 in halben Schritten, Fairness 1–6 ganzzahlig, Eigenschaften 0–5 Sterne ganzzahlig aus der festen Liste `effort` (Einsatz & Laufbereitschaft), `technique` (Technik), `gameIntelligence` (Spielverständnis), `duels` (Zweikampf), `teamSpirit` (Teamgeist). Tore, Vorlagen, Paraden und Ergebnis sind ganze Zahlen ≥ 0, die Spieltag-Nummer ist eine ganze Zahl ≥ 1, die Trainingsdauer eine ganze Zahl von 1 bis 600 Minuten.
9. **Karten:** Jede Kartenart (Gelb, Gelb-Rot, Rot) kann je Spieler und Spieltag höchstens einmal gezeigt werden.
10. **Verfallen beim Entfernen:** Wird ein Spieler aus dem Kader entfernt, verfallen alle seine Bewertungen in diesem Team. Wird ein Termin gelöscht, verfallen alle zugehörigen Bewertungen. Ein gelöschter Termin lässt sich nicht mehr ändern (`AppointmentNotFound`); ein erneutes Löschen liefert `Ok` ohne Event. Wird der Spieler später erneut hinzugefügt, beginnt er ohne Bewertungen.
11. **Zähler sind absolut:** Tore, Vorlagen und Paraden werden als absoluter Wert gesetzt („Tore = 2“), nicht als „+1“. Gleichzeitige Änderungen bleiben dadurch eindeutig.
12. **Keine leeren Änderungen:** Entspricht der neue Wert dem bestehenden, entsteht kein Event; die Methode liefert trotzdem `Ok`.

Regeln, die mehrere Teams betreffen (doppelter Name und Saison, letztes Team), prüft nicht das Aggregate, sondern der Service über die Team-Übersicht (siehe Getroffene Entscheidungen).

### 5.3 Geschäftsmethoden und Events

Alle Events gehören zum Stream `team-{teamId}`; `teamId` steht deshalb nur in `TeamCreated`. Payloads enthalten nur IDs und fachliche Werte, nie personenbezogene Daten. Wer eine Änderung vorgenommen hat, wird nicht im Event vermerkt, da die Trainer-Id (E-Mail) personenbezogen ist. Der Zeitpunkt ergibt sich aus den Metadaten des Events in KurrentDB.

Methoden, die eine Datei betreffen (Wappen, Trainerangabe, Notiz, Kommentar), erzeugen nur ein Event als Verweis. Die Datei schreibt der Service: beim Anlegen oder Ändern erst die Datei, dann das Event; beim Entfernen erst das Event, dann die Datei löschen.

In den Tabellen verweist die Spalte „Regeln“ auf die Nummern aus [5.2](#52-invarianten-und-regeln).

#### 5.3.1 Team

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `Team.create({ teamId, name, season, tier })` | `TeamCreated { teamId, name, season, tier }` | 2 |
| `rename(name)` | `TeamRenamed { name }` | 1, 2 |
| `changeSeason(season)` | `SeasonChanged { season }` | 1, 2 |
| `changeTier(tier)` | `TierChanged { tier }` | 1 |
| `uploadCrest()` | `CrestUploaded {}` (Bild als Datei) | 1 |
| `removeCrest()` | `CrestRemoved {}` | 1 |
| `changeCoaches()` | `CoachesChanged {}` (Text als Datei) | 1 |
| `removeCoaches()` | `CoachesRemoved {}` | 1 |
| `delete()` | `TeamDeleted {}` | 1 |

#### 5.3.2 Kader

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `addPlayer({ playerId, shirtNumber?, position? })` | `PlayerAddedToSquad { playerId, shirtNumber, position }` | 1, 3 |
| `assignShirtNumber(playerId, number)` | `ShirtNumberAssigned { playerId, number }` | 1, 3 |
| `removeShirtNumber(playerId)` | `ShirtNumberRemoved { playerId }` | 1, 3 |
| `changePosition(playerId, position)` | `PositionChanged { playerId, position }` (TW, AB, MF, ST, AR) | 1, 3 |
| `removePosition(playerId)` | `PositionRemoved { playerId }` | 1, 3 |
| `deactivatePlayer(playerId)` | `PlayerDeactivated { playerId }` | 1, 3 |
| `reactivatePlayer(playerId)` | `PlayerReactivated { playerId }` | 1, 3 |
| `removePlayer(playerId)` | `PlayerRemovedFromSquad { playerId }` | 1, 3, 10 |
| `noteProfileChanged(playerId)` | `PlayerProfileChanged { playerId }` (Inhalt in der Profildatei) | 1, 3 |

Änderungen am Spielerprofil (Name, Geburtsdatum, starker Fuß, Foto) schreibt der Service in die Profildatei. Danach ruft er `noteProfileChanged` für jedes Team auf, in dessen Kader der Spieler ist, und speichert jedes Team einzeln. Das Event enthält keine Profildaten; es erhöht nur die Revision des Teams, damit andere Trainer die Änderung über das Polling erkennen. Schlägt das Schreiben für ein Team fehl, ist die Profildatei trotzdem aktuell; dieses Team zeigt die Änderung dann erst beim nächsten vollständigen Neuladen.

#### 5.3.3 Termine (gemeinsam)

Diese Methoden gelten für Spieltage und Trainings gleichermaßen. Alle Events enthalten die `appointmentId`.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `rescheduleAppointment(appointmentId, date)` | `AppointmentRescheduled { appointmentId, date }` | 1, 5 |
| `writeAppointmentNotes(appointmentId)` | `AppointmentNotesWritten { appointmentId }` (Text als Datei) | 1, 5 |
| `removeAppointmentNotes(appointmentId)` | `AppointmentNotesRemoved { appointmentId }` | 1, 5 |
| `deleteAppointment(appointmentId)` | `AppointmentDeleted { appointmentId }` | 1, 5, 10 |

#### 5.3.4 Spieltage

Die Methoden für Spieltage lehnen mit `AppointmentNotFound` ab, wenn die ID zu einem Training gehört.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `scheduleMatch({ matchId, date, matchday?, opponent?, venue?, competition? })` | `MatchScheduled { appointmentId, date, matchday, opponent, venue, competition }` | 1, 5, 8 |
| `changeMatchday(matchId, matchday)` | `MatchdayChanged { appointmentId, matchday }` | 1, 5, 8 |
| `removeMatchday(matchId)` | `MatchdayRemoved { appointmentId }` | 1, 5 |
| `changeOpponent(matchId, opponent)` | `OpponentChanged { appointmentId, opponent }` | 1, 5 |
| `removeOpponent(matchId)` | `OpponentRemoved { appointmentId }` | 1, 5 |
| `changeVenue(matchId, venue)` | `VenueChanged { appointmentId, venue }` (Heim, Auswärts, Neutral) | 1, 5 |
| `removeVenue(matchId)` | `VenueRemoved { appointmentId }` | 1, 5 |
| `changeCompetition(matchId, competition)` | `CompetitionChanged { appointmentId, competition }` (Liga, Pokal, Test, Turnier) | 1, 5 |
| `removeCompetition(matchId)` | `CompetitionRemoved { appointmentId }` | 1, 5 |
| `recordResult(matchId, goalsFor, goalsAgainst)` | `MatchResultRecorded { appointmentId, goalsFor, goalsAgainst }` | 1, 5, 8 |
| `clearResult(matchId)` | `MatchResultCleared { appointmentId }` | 1, 5 |

Der Gegner ist der Name eines Vereins bzw. einer Mannschaft und gilt nicht als personenbezogen.

#### 5.3.5 Trainings

Die Methoden für Trainings lehnen mit `AppointmentNotFound` ab, wenn die ID zu einem Spieltag gehört.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `scheduleTraining({ trainingId, date, duration, topic, focus })` | `TrainingScheduled { appointmentId, date, duration, topic, focus }` | 1, 5, 8 |
| `changeTrainingDuration(trainingId, minutes)` | `TrainingDurationChanged { appointmentId, minutes }` | 1, 5, 8 |
| `changeTrainingTopic(trainingId, topic)` | `TrainingTopicChanged { appointmentId, topic }` | 1, 5 |
| `changeTrainingFocus(trainingId, focus)` | `TrainingFocusChanged { appointmentId, focus }` | 1, 5 |

Schwerpunkte (`focus`) stammen aus einer festen Liste: Technik, Taktik, Kondition, Torschuss, Spielform, Athletik, Standards, Torwart.

#### 5.3.6 Bewertungen (gemeinsam)

Diese Methoden gelten für Spiel- und Trainingsbewertungen gleichermaßen. Alle Methoden erhalten `appointmentId` und `playerId`; beide stehen auch in jedem Event.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `gradePerformance(appointmentId, playerId, grade)` | `PerformanceGraded { grade }` | 1, 3–6, 8 |
| `withdrawPerformanceGrade(appointmentId, playerId)` | `PerformanceGradeWithdrawn {}` | 1, 3–6 |
| `gradeFairness(appointmentId, playerId, grade)` | `FairnessGraded { grade }` | 1, 3–6, 8 |
| `withdrawFairnessGrade(appointmentId, playerId)` | `FairnessGradeWithdrawn {}` | 1, 3–6 |
| `rateAttribute(appointmentId, playerId, attribute, stars)` | `AttributeRated { attribute, stars }` | 1, 3–6, 8 |
| `writeRatingComment(appointmentId, playerId)` | `RatingCommentWritten {}` (Text als Datei) | 1, 3, 5 |
| `removeRatingComment(appointmentId, playerId)` | `RatingCommentRemoved {}` | 1, 3, 5 |
| `resetRating(appointmentId, playerId)` | `RatingReset {}` (zurück auf „nicht erfasst“, Werte verfallen, Kommentar bleibt) | 1, 3, 5 |

#### 5.3.7 Spielbewertung

Nur für Spieltage. Alle Methoden erhalten `matchId` und `playerId`; die Events enthalten `appointmentId` und `playerId`.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `recordParticipation(matchId, playerId, participation)` | `ParticipationRecorded { participation }` (`starting`, `substitute`, `absent`) | 1, 3, 4, 5, 7 |
| `recordGoals(matchId, playerId, count)` | `GoalsRecorded { count }` | 1, 3–6, 8, 11 |
| `recordAssists(matchId, playerId, count)` | `AssistsRecorded { count }` | 1, 3–6, 8, 11 |
| `recordSaves(matchId, playerId, count)` | `SavesRecorded { count }` | 1, 3–6, 8, 11 |
| `showCard(matchId, playerId, card)` | `CardShown { card }` (`yellow`, `yellowRed`, `red`) | 1, 3–6, 9 |
| `withdrawCard(matchId, playerId, card)` | `CardWithdrawn { card }` | 1, 3–6 |
| `markAllStarting(matchId)` | `ParticipationRecorded { playerId, participation: starting }` je aktivem Kaderspieler ohne erfassten Einsatz | 1, 5 |

#### 5.3.8 Trainingsbewertung

Nur für Trainings. Alle Methoden erhalten `trainingId` und `playerId`; die Events enthalten `appointmentId` und `playerId`.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `recordAttendance(trainingId, playerId, attendance)` | `AttendanceRecorded { attendance }` (`present`, `late`, `excused`, `unexcused`) | 1, 3, 4, 5, 7 |
| `markAllPresent(trainingId)` | `AttendanceRecorded { playerId, attendance: present }` je aktivem Kaderspieler ohne erfasste Anwesenheit | 1, 5 |

#### 5.3.9 Fachliche Fehler

Geschäftsmethoden liefern im `Err`-Fall einen der folgenden Fehler. Die Routen bilden sie auf HTTP-Statuscodes ab.

| Fehler (`type`) | Bedeutung | HTTP |
|---|---|---|
| `TeamDeleted` | Das Team ist gelöscht. | `404` |
| `InvalidName` | Name leer. | `422` |
| `InvalidSeason` | Saison nicht im Format `JJJJ_JJ` oder Folgejahr passt nicht. | `422` |
| `PlayerAlreadyInSquad` | Spieler ist bereits im Kader. | `409` |
| `PlayerNotInSquad` | Spieler ist nicht im Kader. | `404` |
| `PlayerInactive` | Spieler ist inaktiv. | `422` |
| `IdAlreadyUsed` | Termin-ID ist im Team bereits vergeben. | `409` |
| `AppointmentNotFound` | Termin existiert nicht, ist gelöscht oder hat die falsche Art (z. B. Spieltag-Methode für ein Training). | `404` |
| `NotParticipating` | Leistungswert ohne Einsatz bzw. Anwesenheit. | `422` |
| `InvalidValue` | Wert außerhalb des erlaubten Bereichs. | `422` |
| `CardAlreadyShown` / `CardNotShown` | Karte wurde bereits gezeigt bzw. nicht gezeigt. | `422` |

Dazu kommen die Fehler aus Repository und Service: `TeamNotFound` (`404`), `ConcurrencyConflict` (`409`), `EditConflict` (`409`, das Feld wurde inzwischen von einem anderen Trainer geändert), `DuplicateTeam` (`409`) und `LastTeam` (`422`).

### 5.4 Personenbezogene Daten (DSGVO)

#### 5.4.1 Was als personenbezogen gilt

| Daten | Betroffene Person |
|---|---|
| Name, Vorname, Geburtsdatum, starker Fuß, Fotos | Spieler |
| Kommentare zu Bewertungen | Spieler |
| Notizen zu Spieltagen und Trainings | Spieler (können Aussagen über Spieler enthalten) |
| Trainerangabe eines Teams | Trainer |
| E-Mail (Trainer-Id) und Name in der Trainer-Konfiguration | Trainer |

Diese Daten stehen nie in Events, Read-Models oder Logs. Events, Read-Models und Logs enthalten nur IDs (`playerId`, `teamId`, Termin-IDs). Die Trainer-Id wird nicht in Events geschrieben.

#### 5.4.2 Ablage

Alle Dateien liegen unterhalb des Datenverzeichnisses (Umgebungsvariable `DATA_DIR`, in dieser Spezifikation als `./data` geschrieben):

```
data/
  player/{playerId}/
    profile.json                    Name, Vorname, Geburtsdatum, starker Fuß
    photo.jpg                       Originalbild
    photo-cropped.jpg               zugeschnittenes Bild
  team/{teamId}/
    crest.jpg                       Wappen, Originalbild
    crest-cropped.jpg               Wappen, zugeschnitten
    coaches.txt                     Trainerangabe
    appointment/{appointmentId}/
      notes.txt                     Notiz zum Termin (Spieltag oder Training)
      comments/{playerId}.txt       Kommentar zur Bewertung
  trainer/{trainerId}/
    settings.json                   aktives Team, Trainingszeit, Darstellung
```

Das Wappen ist nicht personenbezogen, wird aber ebenfalls auf dem Dateisystem abgelegt, damit die Events klein bleiben. Events vermerken nur, dass ein Wappen hochgeladen oder entfernt wurde.

#### 5.4.3 Reihenfolge von Datei und Event

- **Anlegen oder Ändern:** erst die Datei schreiben, dann das Event. Schlägt das Event fehl, bleibt höchstens eine verwaiste Datei zurück, aber nie ein Event, das auf fehlenden Inhalt verweist.
- **Entfernen:** erst das Event schreiben, dann die Datei löschen. Schlägt das Löschen fehl, wird es protokolliert (nur mit IDs) und vom nächsten Aufräumjob nachgeholt.

#### 5.4.4 Löschen

| Anlass | Was passiert |
|---|---|
| Spieler löschen (auf Anfrage) | Der Betreiber löscht `player/{playerId}/` und alle `comments/{playerId}.txt` in allen Teams von Hand (siehe [8.4](#84-spieler-auf-anfrage-löschen)). Events und Kaderzugehörigkeit bleiben unverändert. |
| Spieler aus dem Kader entfernen | Nach `PlayerRemovedFromSquad` werden seine Kommentare in diesem Team gelöscht. Ist er danach in keinem Team mehr, löscht der tägliche Aufräumjob auch sein Profil. |
| Termin löschen | Nach `AppointmentDeleted` wird `appointment/{appointmentId}/` mit Notiz und Kommentaren gelöscht. |
| Team löschen | Nach `TeamDeleted` wird `team/{teamId}/` sofort gelöscht. Spieler, die danach in keinem Team mehr sind, löscht der tägliche Aufräumjob. |
| Trainer entfernen | Der Eintrag wird aus der Trainer-Konfiguration entfernt und `trainer/{trainerId}/` gelöscht. |

#### 5.4.5 Aufräumjob für Spieler

Der Job läuft täglich und löscht `player/{playerId}/` für alle Spieler, die laut Spielerverzeichnis in keinem nicht gelöschten Team im Kader sind. Damit ein gerade angelegter Spieler nicht gelöscht wird, bevor sein `PlayerAddedToSquad`-Event in der Projektion angekommen ist, werden nur Profile gelöscht, deren Datei älter als 24 Stunden ist. Der Job holt außerdem fehlgeschlagene Löschungen aus 5.4.3 nach.

#### 5.4.6 Lesen bei fehlenden Daten

Fehlende Dateien sind kein Fehler. Beim Ausliefern gelten diese Standardwerte:

| Fehlende Datei | Standardwert |
|---|---|
| `profile.json` | Name „Gelöschter Spieler“, kein Geburtsdatum, kein starker Fuß |
| Foto | Platzhalterbild im Frontend |
| Kommentar, Notiz, Trainerangabe | leer |
| Wappen | Platzhalterbild im Frontend |

#### 5.4.7 Backups

Event Store und Datenverzeichnis werden täglich zur selben Zeit gesichert und immer gemeinsam zurückgespielt (Archive vom selben Tag), damit Events und Dateien zusammenpassen. Gelöschte personenbezogene Daten bleiben in älteren Backups enthalten, bis diese turnusmäßig gelöscht werden. Die Aufbewahrungsdauer wird in [8.2](#82-backups) festgelegt.

### 5.5 Read-Models

Read-Models (Projektionen) beantworten alle lesenden Anfragen, die mehr als ein Team umfassen oder Felder brauchen, die das Team-Aggregate für seine Regeln nicht benötigt. Geschrieben wird immer über das Aggregate.

#### 5.5.1 Grundsätze

- **Speicherort:** Alle Read-Models liegen im Arbeitsspeicher des Backends. Es wird keine zusätzliche Datenbank eingesetzt.
- **Aufbau:** Beim Start liest das Backend über eine Subscription auf `$all` (Filter auf Streams mit Präfix `team-`) alle Team-Events und baut daraus die Read-Models auf. Danach bleibt die Subscription offen und aktualisiert die Read-Models laufend.
- **Bereitschaft:** Das Backend beantwortet fachliche Anfragen erst, wenn der Aufbau beim Start abgeschlossen ist. Bis dahin meldet der Health-Endpunkt „nicht bereit“.
- **Validierung:** Jedes gelesene Event wird mit seinem Zod-Schema geprüft. Ungültige Events werden protokolliert und übersprungen.
- **Neu aufbaubar:** Read-Models entstehen ausschließlich aus Events und lassen sich jederzeit durch einen Neustart neu aufbauen. Fehler in einer Berechnung werden durch Korrektur des Codes und Neustart behoben, nicht durch Datenmigration.
- **Revision je Team:** Für jedes Team merkt sich die Projektion die zuletzt verarbeitete Revision. Sie dient als `ETag` (siehe [7.2](#72-änderungen-anderer-trainer-erkennen)) und zum Warten auf die eigene Änderung (siehe [7.1](#71-eigene-änderungen-sofort-sehen)).
- **Keine personenbezogenen Daten:** Read-Models enthalten nur IDs und fachliche Werte. Namen, Geburtsdaten, Fotos, Kommentare und Notizen liest das Backend erst beim Ausliefern aus den Dateien. Fehlt eine Datei, werden Standardwerte eingesetzt (z. B. „Gelöschter Spieler“, kein Foto, kein Kommentar).
- **Gemeinsame Regeln:** Fachliche Ableitungen, die Aggregate und Read-Models gleichermaßen brauchen (z. B. „Leistung zählt nur bei Startelf, Eingewechselt, Anwesend oder Verspätet“, verfallene Bewertungen), sind einmal im Domänenmodell definiert und werden von beiden genutzt.
- **Gelöschte Teams:** Nach `TeamDeleted` verschwindet ein Team aus allen Read-Models außer der Team-Übersicht. Dort bleibt es mit Löschzeitpunkt erhalten, bis der Aufräumjob den Stream entfernt.

#### 5.5.2 Übersicht

| Read-Model | Schlüssel | Verwendung |
|---|---|---|
| Team-Übersicht | `teamId` | Teamauswahl, Teamverwaltung, Prüfung auf doppelte Namen, Prüfung „letztes Team“, Wahl des nächsten aktiven Teams, Aufräumjob verwaiste Streams |
| Spielerverzeichnis | `playerId` | Suche nach bestehenden Spielern beim Hinzufügen zum Kader, Aufräumjob verwaiste Spieler |
| Kader | `teamId` → `playerId` | Reiter `Kader`, Spielerauswahl in Bewertungen und Filtern |
| Termine | `teamId` → Termin-ID | Reiter `Termine` (Liste der Spieltage und Trainings) |
| Termin-Detail | `teamId` → Termin-ID → `playerId` | Bewertungsansicht eines Termins, CSV-Export |
| Auswertung | `teamId` | Reiter `Auswertungen`, Saisonbilanz teilen (berechnet aus Termine und Termin-Detail, kein eigener Speicher) |

#### 5.5.3 Team-Übersicht

Je Team:

| Feld | Bedeutung |
|---|---|
| `teamId` | fortlaufende Nummer |
| `name`, `season`, `tier` | Name, Saison, Spielklasse |
| `hasCrest` | Wappen vorhanden |
| `playerCount` | Anzahl Spieler im Kader (aktiv und inaktiv) |
| `matchCount`, `trainingCount` | Anzahl nicht gelöschter Spieltage bzw. Trainings |
| `deletedAt` | Zeitpunkt des `TeamDeleted`-Events, sonst `null` |

Abfragen:

- Alle nicht gelöschten Teams, sortiert nach Saison (neueste zuerst), dann Name. Diese Reihenfolge bestimmt auch das „nächste verfügbare Team“.
- Existiert ein nicht gelöschtes Team mit gleichem Namen und gleicher Saison? (bewusste Ausnahme, siehe Entscheidungen)
- Anzahl nicht gelöschter Teams (Prüfung „letztes Team“).
- Gelöschte Teams mit `deletedAt` älter als 30 Tage (Aufräumjob).

#### 5.5.4 Spielerverzeichnis

Je Spieler:

| Feld | Bedeutung |
|---|---|
| `playerId` | zufällige UUID |
| `teamIds` | Teams, in deren Kader der Spieler aktuell ist (ohne gelöschte Teams) |

Abfragen:

- Suche nach Spielern für „Spieler zum Kader hinzufügen“. Die Suche nach Name läuft über die Profildateien der Spieler im Verzeichnis.
- Spieler ohne Team (`teamIds` leer): Kandidaten für den täglichen Aufräumjob.

#### 5.5.5 Kader

Je Team und Spieler:

| Feld | Bedeutung |
|---|---|
| `playerId` | Verweis auf das Spielerprofil |
| `shirtNumber` | Rückennummer (optional) |
| `position` | TW, AB, MF, ST, AR (Allrounder), optional |
| `active` | aktiv bzw. inaktiv |

Beim Ausliefern ergänzt das Backend aus dem Profil: Name, Vorname, Geburtsdatum, starker Fuß und ob ein Foto vorhanden ist.

#### 5.5.6 Termine

Je Team und Termin:

| Feld | Bedeutung |
|---|---|
| `appointmentId`, `type` | Termin-ID, `match` oder `training` |
| `date` | Datum |
| Spieltag: `matchday`, `opponent`, `venue`, `competition` | Spieltag-Nummer, Gegner, Ort, Wettbewerb |
| Spieltag: `goalsFor`, `goalsAgainst`, `outcome` | Ergebnis und daraus abgeleitet Sieg, Unentschieden oder Niederlage |
| Training: `duration`, `topic`, `focus` | Dauer, Thema, Schwerpunkte |
| `ratedCount` | Anzahl Spieler mit erfasster Bewertung (Erfassungsstand) |
| `hasNotes` | Notiz vorhanden |

Gelöschte Termine erscheinen nicht. Sortierung nach Datum.

#### 5.5.7 Termin-Detail

Je Team, Termin und Spieler die Bewertung, bereits um verfallene Werte bereinigt:

| Feld | Bedeutung |
|---|---|
| Spieltag: `participation` | Startelf, Eingewechselt, Nicht dabei oder nicht erfasst |
| Training: `attendance` | Anwesend, Verspätet, Entschuldigt, Unentschuldigt oder nicht erfasst |
| `counts` | `true`, wenn die Leistung zählt (Startelf, Eingewechselt, Anwesend, Verspätet) |
| `grade`, `fairness`, `attributes` | Leistungsnote, Fairness, Eigenschaften (Sterne) |
| Spieltag: `goals`, `assists`, `saves`, `cards` | Tore, Vorlagen, Paraden, Karten |
| `hasComment` | Kommentar vorhanden |

Der Kommentartext wird beim Ausliefern aus der Datei ergänzt. Der CSV-Export (siehe 4.5.3) wird aus Termine und Termin-Detail zusammengesetzt und braucht kein eigenes Read-Model.

#### 5.5.8 Auswertung

Die Auswertung ist kein eigenes, vorberechnetes Read-Model. Weil der Zeitraum frei wählbar ist, berechnet der Service sie bei jeder Anfrage aus Termine ([5.5.6](#556-termine)) und Termin-Detail ([5.5.7](#557-termin-detail)). Die Datenmenge eines Teams ist klein (etwa 110 Termine mit je 20 Spielern), die Berechnung im Speicher deshalb schnell. Es zählen nur Bewertungen mit `counts = true`; Kennzahlen und Rechenregeln stehen in [4.4](#44-auswertungen).

Die Berechnung ist eine reine Funktion ohne I/O (Termine und Bewertungen rein, Kennzahlen raus) und wird von Auswertungen und Saisonbilanz gemeinsam genutzt.

## 6. API

Das Backend bietet eine REST-API für das Frontend. Frontend und Backend laufen unter derselben Domain (Session-Cookie mit `SameSite=Strict`).

### 6.1 Allgemeines

#### 6.1.1 Grundlagen

| Thema | Festlegung |
|---|---|
| Basis-Pfad | `/api/v1`. Eine neue Version (`/api/v2`) entsteht nur bei inkompatiblen Änderungen. |
| Adressierung | Teamdaten werden immer mit dem Team im Pfad adressiert, z. B. `/api/v1/teams/7/matches`. Das aktive Team ist nur eine Einstellung des Trainers, keine implizite Adresse. |
| Format | JSON (UTF-8), Feldnamen in camelCase. Bilder als `multipart/form-data` bzw. `image/jpeg`, CSV als `text/csv`. |
| Datum | `JJJJ-MM-TT` (z. B. `2026-09-12`), Zeitpunkte ISO 8601 in UTC. Die Saison wird im Format `JJJJ_JJ` übertragen. |
| IDs | `teamId` als Zahl, `playerId`, `matchId` und `trainingId` als UUID. |
| Validierung | Alle Eingaben (Pfad, Query, Body) und alle Antworten werden mit Zod geprüft (`fastify-type-provider-zod`). |
| Dokumentation | `@fastify/swagger` erzeugt die OpenAPI-Beschreibung aus den Zod-Schemas. Swagger UI und OpenAPI-Dokument sind nur in der Entwicklung erreichbar. |

#### 6.1.2 Authentifizierung

- Alle Endpunkte außer Anmeldung, Health und Version setzen eine gültige Sitzung voraus (Session-Cookie, siehe [4.1](#41-ersteinrichtung-und-anmeldung)). Ohne gültige Sitzung: `401 Unauthenticated`.
- Bei jeder Anfrage prüft das Backend, ob die `trainerId` der Sitzung noch in der Trainer-Konfiguration steht.
- Die Anmeldung ist durch `@fastify/rate-limit` geschützt (5 Fehlversuche pro IP in 15 Minuten, dann `429`).
- Schutz vor Cross-Site-Requests bietet das Cookie-Attribut `SameSite=Strict`. CORS ist nicht freigegeben.

#### 6.1.3 Einzelfeld-Änderungen

Bestehende Daten werden je Feld geändert (siehe „Speichern je Feld“ in den Getroffenen Entscheidungen). Dafür gibt es pro Ressource einen `PATCH`-Endpunkt, der genau ein Feld ändert:

```json
{ "field": "grade", "value": 2.5, "previous": 3 }
```

- `field` nennt das Feld; welche Felder es gibt, steht bei den Endpunkten. Zod prüft `value` und `previous` je nach Feld (Discriminated Union über `field`).
- `value: null` entfernt einen optionalen Wert (z. B. Rückennummer, Note, Kommentar).
- `previous` ist der zuletzt geladene Wert. Weicht der aktuelle Wert davon ab, antwortet das Backend mit `409 EditConflict` und dem aktuellen Wert in `currentValue`. Ausnahme: Einstellungen kennen kein `previous`.
- Antwort: `200` mit der aktualisierten Ressource.

Bilder werden nicht per `PATCH`, sondern über eigene Endpunkte hochgeladen (`PUT`, `multipart/form-data` mit den Teilen `original` und `cropped`, je JPEG bis 5 MB) und entfernt (`DELETE`).

#### 6.1.4 Revision, ETag und Polling

- Lesende Endpunkte eines Teams (alles unter `/teams/{teamId}`) liefern die Revision des Teams als `ETag`. Mit `If-None-Match` antwortet das Backend bei unverändertem Stand mit `304 Not Modified` (siehe [7.2](#72-änderungen-anderer-trainer-erkennen)).
- Die Team-Liste (`GET /teams`) und die Spielersuche liefern als `ETag` die zuletzt verarbeitete Position aller Team-Events.
- Der `ETag` wird als HTTP-Header in Anführungszeichen übertragen, z. B. `ETag: "42"`. Das Backend setzt ihn aus der Revision bzw. Position der Projektion, nicht aus einem Hash des Bodys.
- Alle Antworten unter `/api/v1` tragen `Cache-Control: no-store`. Der Browser speichert dadurch keine Antworten (keine personenbezogenen Daten im Browser-Cache, z. B. auf gemeinsam genutzten Geräten) und schickt kein eigenes `If-None-Match`. Das Frontend merkt sich je Ansicht den letzten `ETag` und die zugehörigen Daten im Speicher und schickt `If-None-Match` selbst; einen `304` sieht es so direkt.
- Schreibende Endpunkte warten, bis die Read-Models die geschriebene Revision verarbeitet haben (höchstens 2 Sekunden), und liefern die neue Revision als `ETag`. Läuft die Wartezeit ab, enthält die Antwort zusätzlich den Header `X-Projection-Pending: true` (siehe [7.1](#71-eigene-änderungen-sofort-sehen)).

#### 6.1.5 Fehlerformat

Fehler werden als Problem Details nach RFC 9457 geliefert (`Content-Type: application/problem+json`):

```json
{
  "type": "EditConflict",
  "title": "Der Wert wurde inzwischen geändert.",
  "status": 409,
  "detail": "Feld grade der Bewertung wurde von einem anderen Trainer geändert.",
  "currentValue": 2
}
```

| Feld | Inhalt |
|---|---|
| `type` | Name des Fehlers, z. B. `EditConflict`, `DuplicateTeam`, `ValidationError` (siehe [5.3.9](#539-fachliche-fehler)) |
| `title` | kurze, gleichbleibende Beschreibung des Fehlertyps |
| `status` | HTTP-Statuscode |
| `detail` | Beschreibung des konkreten Falls |
| `errors` | nur bei `ValidationError`: Liste aus `{ field, message }` |
| `currentValue` | nur bei `EditConflict`: aktueller Wert des Feldes |

Fehler außerhalb der Fachlogik:

| Fall | Antwort |
|---|---|
| unbekannter Endpunkt | `404 NotFound` |
| ungültiges JSON im Body | `400 ValidationError` mit leerem `errors` |
| Anfrage zu groß | `413 PayloadTooLarge` |
| Content-Type nicht unterstützt | `415 UnsupportedMediaType` |
| unerwarteter Fehler | `500 InternalError` |

Fehlerantworten enthalten nie personenbezogene Daten, Stacktraces oder interne Details. Das Frontend zeigt eigene Meldungen an (siehe Fehlertabellen in [4](#4-fachliche-funktionen)) und nutzt dafür `type`.

#### 6.1.6 Statuscodes

| Status | Bedeutung |
|---|---|
| `200` | Erfolg mit Antwort |
| `201` | Angelegt; `Location`-Header mit der neuen Ressource |
| `204` | Erfolg ohne Antwort (Löschen, Abmelden) |
| `304` | Unverändert (`If-None-Match`) |
| `400` | `ValidationError`: Eingabe entspricht nicht dem Schema |
| `401` | `Unauthenticated`: keine gültige Sitzung bzw. falscher Zugangsschlüssel |
| `404` | Ressource existiert nicht oder ist gelöscht (`TeamNotFound`, `TeamDeleted`, `PlayerNotInSquad`, `AppointmentNotFound`, …) |
| `409` | Konflikt (`EditConflict`, `ConcurrencyConflict`, `DuplicateTeam`, `PlayerAlreadyInSquad`, `IdAlreadyUsed`) |
| `413` | Bild größer als 5 MB |
| `415` | Bild ist kein JPEG |
| `422` | Fachlich unzulässig (`InvalidName`, `InvalidSeason`, `PlayerInactive`, `NotParticipating`, `InvalidValue`, `CardAlreadyShown`, `CardNotShown`, `LastTeam`) |
| `429` | Zu viele Anmeldeversuche |
| `503` | Backend noch nicht bereit (Read-Models werden aufgebaut) |
| `500` | Unerwarteter Fehler; wird protokolliert (nur mit IDs) |

### 6.2 Endpunkte

Alle Pfade sind relativ zu `/api/v1`. Die genauen Schemas von Anfragen und Antworten stehen als Zod-Schemas im Code und in der generierten OpenAPI-Beschreibung.

#### 6.2.1 System und Sitzung

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/health` | Bereitschaft, ohne Anmeldung | `200` bzw. `503` |
| `GET` | `/version` | Version des Backends, ohne Anmeldung ([4.6](#46-einstellungen)) | `200 { version }` |
| `POST` | `/session` | Anmelden mit `{ accessKey }` ([4.1.1](#411-anmelden)) | `204` mit Session-Cookie, `401`, `429` |
| `DELETE` | `/session` | Abmelden | `204` |
| `GET` | `/me` | Name und E-Mail des angemeldeten Trainers | `200` |
| `GET` | `/me/settings` | Einstellungen; bestimmt dabei das aktive Team ([4.1.2](#412-aktives-team-nach-der-anmeldung)) | `200 { activeTeamId, trainingDuration, theme }` |
| `PATCH` | `/me/settings` | ein Feld: `activeTeamId`, `trainingDuration`, `theme` (ohne `previous`) | `200`; `404` bei unbekanntem bzw. gelöschtem Team |

`activeTeamId` ist `null`, wenn es noch kein Team gibt; dann zeigt das Frontend den Dialog „Team anlegen“.

#### 6.2.2 Teams

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/teams` | alle nicht gelöschten Teams, sortiert ([4.5](#45-team)) | `200` |
| `POST` | `/teams` | Team anlegen, `multipart/form-data` mit Teil `data` (JSON: `name`, `season`, `tier`, `coaches`) und optional `crestOriginal`, `crestCropped` ([4.5.1](#451-team-anlegen)) | `201 { teamId }` |
| `GET` | `/teams/{teamId}` | Teamdaten inkl. Trainerangabe und Kennzahlen | `200` |
| `PATCH` | `/teams/{teamId}` | ein Feld: `name`, `season`, `tier`, `coaches` ([4.5.2](#452-team-bearbeiten-und-löschen)) | `200` |
| `DELETE` | `/teams/{teamId}` | Team löschen | `204` |
| `GET` | `/teams/{teamId}/crest?variant=cropped\|original` | Wappen | `200 image/jpeg`, `404` ohne Wappen |
| `PUT` | `/teams/{teamId}/crest` | Wappen hochladen | `200` |
| `DELETE` | `/teams/{teamId}/crest` | Wappen entfernen | `204` |
| `GET` | `/teams/{teamId}/statistics?from=&to=` | Auswertung ([4.4](#44-auswertungen), [4.5.4](#454-saisonbilanz-teilen)) | `200` |
| `GET` | `/teams/{teamId}/ratings.csv?types=match,training&from=&to=` | CSV-Export ([4.5.3](#453-bewertungen-als-csv-exportieren)) | `200 text/csv` |

#### 6.2.3 Kader und Spieler

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/teams/{teamId}/squad` | Kaderliste mit Profildaten ([4.2](#42-kader)) | `200` |
| `POST` | `/teams/{teamId}/squad` | bestehenden Spieler hinzufügen: `{ playerId, shirtNumber?, position? }` | `201` |
| `POST` | `/teams/{teamId}/squad/player` | neuen Spieler anlegen und hinzufügen, `multipart/form-data` mit Teil `data` (JSON: `firstName`, `lastName`, `birthDate`, `strongFoot`, `shirtNumber`, `position`) und optional `photoOriginal`, `photoCropped` ([4.2.1](#421-spieler-hinzufügen)) | `201 { playerId }` |
| `POST` | `/teams/{teamId}/squad/import` | Kader übernehmen: `{ sourceTeamId, playerIds }` ([4.2.2](#422-kader-aus-anderem-team-übernehmen)) | `200 { added }` |
| `PATCH` | `/teams/{teamId}/squad/{playerId}` | ein Feld: `shirtNumber`, `position`, `active` ([4.2.3](#423-spieler-bearbeiten)) | `200` |
| `DELETE` | `/teams/{teamId}/squad/{playerId}` | aus dem Kader entfernen ([4.2.4](#424-aus-dem-kader-entfernen)) | `204` |
| `GET` | `/players?search=&excludeTeamId=` | Spielersuche, ab 2 Zeichen ([4.2.1](#421-spieler-hinzufügen)) | `200` |
| `PATCH` | `/players/{playerId}` | ein Profilfeld: `firstName`, `lastName`, `birthDate`, `strongFoot` | `200` |
| `GET` | `/players/{playerId}/photo?variant=cropped\|original` | Foto | `200 image/jpeg`, `404` ohne Foto |
| `PUT` | `/players/{playerId}/photo` | Foto hochladen | `200` |
| `DELETE` | `/players/{playerId}/photo` | Foto entfernen | `204` |

Profiländerungen (`PATCH /players/…` und Foto) schreiben zusätzlich `PlayerProfileChanged` in alle Teams des Spielers (siehe [5.3.2](#532-kader)).

#### 6.2.4 Spieltage

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/teams/{teamId}/matches` | Liste der Spieltage ([4.3.1](#431-spieltage)) | `200` |
| `POST` | `/teams/{teamId}/matches` | Spieltag anlegen: `{ date, matchday?, opponent?, venue?, competition?, result?, notes? }` | `201 { matchId }` |
| `GET` | `/teams/{teamId}/matches/{matchId}` | Bewertungsansicht: Spieltag, Notiz und Bewertungen aller Spieler mit Namen und Kommentaren ([4.3.3](#433-bewertungsansicht)) | `200` |
| `PATCH` | `/teams/{teamId}/matches/{matchId}` | ein Feld: `date`, `matchday`, `opponent`, `venue`, `competition`, `result` (`{ goalsFor, goalsAgainst }`), `notes` | `200` |
| `DELETE` | `/teams/{teamId}/matches/{matchId}` | Spieltag löschen | `204` |
| `PATCH` | `/teams/{teamId}/matches/{matchId}/ratings/{playerId}` | ein Feld der Spielbewertung: `participation`, `grade`, `fairness`, `attributes.effort`, `attributes.technique`, `attributes.gameIntelligence`, `attributes.duels`, `attributes.teamSpirit`, `goals`, `assists`, `saves`, `cards.yellow`, `cards.yellowRed`, `cards.red`, `comment` | `200` |
| `DELETE` | `/teams/{teamId}/matches/{matchId}/ratings/{playerId}` | Bewertung zurücksetzen, Kommentar bleibt | `204` |
| `POST` | `/teams/{teamId}/matches/{matchId}/mark-all-starting` | „Alle Startelf“ | `200 { marked }` |

#### 6.2.5 Trainings

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/teams/{teamId}/trainings` | Liste der Trainings ([4.3.2](#432-trainings)) | `200` |
| `POST` | `/teams/{teamId}/trainings` | Training anlegen: `{ date, duration, topic?, focus?, notes? }` | `201 { trainingId }` |
| `GET` | `/teams/{teamId}/trainings/{trainingId}` | Bewertungsansicht des Trainings | `200` |
| `PATCH` | `/teams/{teamId}/trainings/{trainingId}` | ein Feld: `date`, `duration`, `topic`, `focus`, `notes` | `200` |
| `DELETE` | `/teams/{teamId}/trainings/{trainingId}` | Training löschen | `204` |
| `PATCH` | `/teams/{teamId}/trainings/{trainingId}/ratings/{playerId}` | ein Feld der Trainingsbewertung: `attendance`, `grade`, `fairness`, `attributes.*` wie beim Spieltag, `comment` | `200` |
| `DELETE` | `/teams/{teamId}/trainings/{trainingId}/ratings/{playerId}` | Bewertung zurücksetzen, Kommentar bleibt | `204` |
| `POST` | `/teams/{teamId}/trainings/{trainingId}/mark-all-present` | „Alle anwesend“ | `200 { marked }` |

#### 6.2.6 Feldwerte

| Feld | Werte in der API |
|---|---|
| `position` | `TW`, `AB`, `MF`, `ST`, `AR` (Allrounder); die üblichen Kürzel der Fachsprache |
| `strongFoot` | `right`, `left`, `both` |
| `venue` | `home`, `away`, `neutral` |
| `competition` | `league`, `cup`, `friendly`, `tournament` |
| `participation` | `starting`, `substitute`, `absent` |
| `attendance` | `present`, `late`, `excused`, `unexcused` |
| `focus` | Liste aus `technique`, `tactics`, `fitness`, `shooting`, `smallSidedGames`, `athletics`, `setPieces`, `goalkeeping` |
| `theme` | `light`, `dark`, `system` |

Dieselben Werte stehen in den Events (siehe [5.3](#53-geschäftsmethoden-und-events)) und sind einmal zentral als Zod-Schemas definiert. Die Anzeige auf Deutsch übernimmt das Frontend.

## 7. Gemeinsamer Datenstand

Alle Endgeräte lesen und schreiben direkt den gemeinsamen Datenstand im Backend. Gleichzeitige Änderungen am selben Team werden über optimistisches Sperren erkannt (siehe „Team speichern“).

### 7.1 Eigene Änderungen sofort sehen

Read-Models sind eventual consistent. Damit ein Trainer nach dem Speichern trotzdem sofort seinen eigenen Stand sieht, antwortet ein schreibender Endpunkt erst, wenn die Projektionen im Speicher das neue Event verarbeitet haben (Warten auf die geschriebene Revision, höchstens 2 Sekunden). Die Antwort enthält die neue Revision des Teams. Läuft die Wartezeit ab, ist die Änderung trotzdem gespeichert; die Antwort kennzeichnet das, und das Frontend lädt die Ansicht kurz darauf neu.

### 7.2 Änderungen anderer Trainer erkennen

Das Frontend fragt den Stand des aktiven Teams regelmäßig ab (Polling):

- beim Öffnen bzw. Wechseln einer Ansicht,
- wenn das Browserfenster wieder in den Vordergrund kommt,
- alle 30 Sekunden, solange das Fenster sichtbar ist.

Lesende Endpunkte eines Teams liefern als `ETag` die Revision des Teams, bis zu der die Projektion aktuell ist. Das Frontend schickt sie als `If-None-Match` mit. Hat sich nichts geändert, antwortet das Backend mit `304 Not Modified` ohne Body. Das Polling ist dadurch billig.

Erkennt das Frontend eine neue Revision, lädt es die aktuelle Ansicht neu. Ein Feld, in dem der Trainer gerade tippt, wird dabei nicht überschrieben.

### 7.3 Gleichzeitige Änderungen

- Gleichzeitige Änderungen am selben Team erkennt das Backend über optimistisches Sperren und löst sie durch einmaliges Neuladen und erneutes Aufrufen der Geschäftsmethode (siehe „Team speichern“).
- Jedes Feld wird einzeln gespeichert. Hat ein anderer Trainer genau dieses Feld geändert, seit es geladen wurde, wird das Speichern mit `409 EditConflict` abgelehnt; das Frontend zeigt den aktuellen Wert, und der Trainer kann seine Eingabe wiederholen. So wird keine Änderung unbemerkt überschrieben.
- Wurde das aktive Team gelöscht, lädt das Frontend die Einstellungen neu und wechselt zum nächsten verfügbaren Team (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)).
- Wird eine Änderung fachlich abgelehnt, weil sich der Stand inzwischen geändert hat (z. B. Spieler wurde von einem anderen Trainer aus dem Kader entfernt), zeigt das Frontend die Fehlermeldung und lädt die Ansicht neu.

### 7.4 Bewusst nicht vorgesehen

Push-Benachrichtigungen (Server-Sent Events oder WebSockets) sind vorerst nicht vorgesehen. Bei wenigen gleichzeitig arbeitenden Trainern reicht Polling aus. Sollte eine sofortige Aktualisierung später nötig werden, lässt sich Polling durch Server-Sent Events ersetzen, ohne das Domänenmodell zu ändern.

## 8. Betrieb

### 8.1 Konfiguration

| Variable | Bedeutung |
|---|---|
| `KADERBLICK_TRAINERS_FILE` | Pfad zur Trainer-Konfiguration (JSON). Die Datei liegt außerhalb des Repositorys und wird nie eingecheckt. |
| `KADERBLICK_SESSION_KEY` | Schlüssel zum Signieren und Verschlüsseln des Session-Cookies: 64 Hex-Zeichen (32 Byte), erzeugt z. B. mit `openssl rand -hex 32`. |

Aufbau der Trainer-Konfiguration (siehe [Begriffe](#2-begriffe)). Die Schlüssel unter `Trainer` sind die Trainer-IDs und müssen gültige E-Mail-Adressen sein. Die Zugangsschlüssel stehen bewusst im Klartext in der Datei; sie ist deshalb mit restriktiven Dateirechten zu schützen.

```json
{
    "Trainer": {
        "max.muster@web.de": {
            "Zugangsschlüssel": "643fea7f776e4cd182d895c7717b9eb19aa96d18eebd2af0e1cef06828569c0f",
            "Name": "Max Muster"
        }
    }
}
```

Weitere Umgebungsvariablen:

| Variable | Bedeutung | Standard |
|---|---|---|
| `KADERBLICK_KURRENTDB_URL` | Verbindungs-URL zu KurrentDB, z. B. `kurrentdb://kaderblick-kurrentdb:2113?tls=false` | – (Pflicht) |
| `KADERBLICK_KURRENTDB_HTTP_URL` | HTTP-Adresse von KurrentDB für den Scavenge (siehe [8.5](#85-wiederkehrende-jobs)) | – (Pflicht) |
| `DATA_DIR` | Datenverzeichnis für personenbezogene Daten, Wappen und Einstellungen (siehe [5.4.2](#542-ablage)) | `/data` |
| `PORT` | Port des HTTP-Servers | `8080` |
| `TRUST_PROXY` | `true`, wenn das Backend hinter einem Reverse Proxy läuft (für die IP-Adresse beim Rate-Limit) | `false` |
| `LOG_LEVEL` | Pino-Log-Level | `info` |
| `NODE_ENV` | `development`, `production` oder `test`; nur bei `development` sind Swagger UI und OpenAPI-Dokument unter `/api/v1/docs` erreichbar | `production` |

Alle Variablen werden beim Start mit einem Zod-Schema geprüft; bei ungültiger Konfiguration bricht der Start mit einer klaren Fehlermeldung ab.

#### 8.1.1 Bereitstellung

Kaderblick läuft in einer eigenen Docker-Compose-Umgebung, getrennt von anderen Anwendungen auf dem Server, mit eigener KurrentDB. Erreichbar ist es unter `https://kaderblick.raspo1926.info`.

| Dienst | Aufgabe |
|---|---|
| `kaderblick-frontend` | Webserver, liefert das Frontend aus |
| `kaderblick-backend` | Fastify-Backend |
| `kaderblick-kurrentdb` | eigene KurrentDB (ein Knoten) nur für Kaderblick |
| `kaderblick-backup-kurrentdb`, `kaderblick-backup-data` | Backup-Jobs (siehe [8.2](#82-backups)) |

**Netzwerke und Reverse Proxy**

- Der Reverse Proxy SWAG läuft in der bestehenden Compose-Umgebung und wird von allen Anwendungen auf dem Server gemeinsam genutzt. Er terminiert HTTPS (Zertifikat von Let's Encrypt, `kaderblick.raspo1926.info` ist dort als Domain eingetragen).
- `kaderblick-frontend` und `kaderblick-backend` hängen zusätzlich im Netzwerk von SWAG. Es wird in der Kaderblick-Compose als `external` mit seinem tatsächlichen Namen eingebunden (z. B. `server_proxy-net`).
- SWAG leitet für `kaderblick.raspo1926.info` den Pfad `/api/` an `kaderblick-backend:8080` und alles andere an `kaderblick-frontend` weiter. Frontend und Backend liegen damit unter derselben Domain.
- `kaderblick-backend` und `kaderblick-kurrentdb` kommunizieren über ein internes Netzwerk (`kaderblick-net`). KurrentDB ist nicht im Netzwerk von SWAG und nach außen nicht erreichbar. Die Oberfläche von KurrentDB ist nur auf `127.0.0.1:2113` des Servers freigegeben und wird bei Bedarf per SSH-Tunnel genutzt.
- KurrentDB läuft ohne TLS (`KURRENTDB_INSECURE=true`), weil sie nur im internen Netzwerk erreichbar ist, und ohne Projektionen (`KURRENTDB_RUN_PROJECTIONS=None`), weil Kaderblick sie nicht braucht.

**Volumes und Dateien**

| Volume bzw. Datei | Inhalt | Eingebunden in |
|---|---|---|
| `kaderblick-kurrentdb-data` | Event Store | `kaderblick-kurrentdb` |
| `kaderblick-data` | Datenverzeichnis (`DATA_DIR=/data`) | `kaderblick-backend` |
| `./config/trainers.json` | Trainer-Konfiguration, nur lesend | `kaderblick-backend` |
| `./.env` | Secrets wie `KADERBLICK_SESSION_KEY` | Compose |

Trainer-Konfiguration und `.env` liegen nur auf dem Server, mit Dateirechten nur für den Betreiber, und werden nie eingecheckt.

### 8.2 Backups

Event Store und Datenverzeichnis werden in der Kaderblick-Compose mit zwei getrennten Jobs gesichert (`offen/docker-volume-backup`):

| Job | Inhalt | Zeitplan | Dateiname | Während des Backups gestoppt |
|---|---|---|---|---|
| `kaderblick-backup-kurrentdb` | Volume `kaderblick-kurrentdb-data` | täglich 03:17 | `kaderblick-kurrentdb-%Y-%m-%d_%H-%M-%S.tar.gz` | `kaderblick-kurrentdb` |
| `kaderblick-backup-data` | Volume `kaderblick-data` | täglich 03:17 | `kaderblick-data-%Y-%m-%d_%H-%M-%S.tar.gz` | `kaderblick-backend` |

- Beide Jobs laufen zur selben Zeit, damit Events und Dateien möglichst genau zusammenpassen. Jeder Job räumt nur seine eigenen Archive auf (`BACKUP_PRUNING_PREFIX`).
- **Aufbewahrung:** 14 Tage. Gelöschte personenbezogene Daten (Spieler, Kommentare, Notizen) sind damit spätestens 14 Tage nach dem Löschen auch aus den Backups verschwunden.
- Die Archive liegen auf dem Server im Verzeichnis `./backups` der Kaderblick-Compose. Eine Kopie außerhalb des Servers ist nicht vorgesehen.
- Während der Backups (wenige Sekunden bis Minuten) ist Kaderblick nicht erreichbar; das Frontend zeigt den Hinweis aus „Direkte Kommunikation mit dem Backend“.

**Wiederherstellen**

1. `kaderblick-backend` und `kaderblick-kurrentdb` stoppen.
2. Beide Volumes aus den Archiven **desselben Tages** zurückspielen.
3. `kaderblick-kurrentdb` und danach `kaderblick-backend` starten. Das Backend baut die Read-Models beim Start neu auf.

Kleine Abweichungen zwischen Events und Dateien sind unkritisch: Fehlende Dateien werden durch Standardwerte ersetzt (siehe [5.4.6](#546-lesen-bei-fehlenden-daten)), überzählige Spielerprofile räumt der tägliche Aufräumjob auf.

### 8.3 Migration von Bestandsdaten

Bestandsdaten stammen aus der Exportdatei der bisherigen Kaderblick-App (z. B. `Kaderblick_Backup_20261110.json`). Ein Import-Skript liest sie einmalig ein.

#### 8.3.1 Aufbau der Exportdatei

```
{
  app: "kaderblick", exported: <Zeitpunkt>,
  db: {
    version: 1,
    teams:    [ { id, name, season, league, coach, matchLength, photo } ],
    players:  [ { id, teamId, first, last, nr, pos, birth, foot, active, notes, photo, crop } ],
    matches:  [ { id, teamId, type?, date, notes,
                  md, opp, venue, comp, gf, ga,          (Spieltag, ohne type)
                  dur, topic, focus } ],                 (Training, type = "training")
    ratings:  { <matchId>: { <playerId>: { status, min, grade, fair, attrs, goals, assists, saves,
                                            yel, yr, red, comment } } },
    current:  <teamId>
  },
  images: { <playerId>: <JPEG als Data-URL>, <playerId>_orig: …, <teamId>: … }
}
```

Die IDs der alten App sind kurze Zeichenketten. Sie werden nur während des Imports zur Zuordnung genutzt; das neue System vergibt eigene IDs.

#### 8.3.2 Zuordnung der Felder

**Team**

| Alt | Neu |
|---|---|
| `name` | Name |
| `season` (`2026/27`) | Saison `2026_27` |
| `league` | Spielklasse |
| `coach` | Trainerangabe (`coaches.txt`), leer = keine |
| `images[<teamId>]` | Wappen; dasselbe Bild wird als Original und Zuschnitt gespeichert |
| `matchLength`, `photo` | entfallen |

**Spieler**

| Alt | Neu |
|---|---|
| `first`, `last` | Vorname, Name |
| `birth` (`JJJJ-MM-TT`, evtl. leer) | Geburtsdatum; leer bleibt leer und wird in der App nachgetragen |
| `foot`: `rechts`, `links`, `beide` | starker Fuß `right`, `left`, `both` |
| `nr` (Text, evtl. leer) | Rückennummer als Zahl, leer = keine |
| `pos`: `TW`, `AB`, `MF`, `ST`, leer | Position, leer = keine |
| `active` | aktiv bzw. inaktiv |
| `images[<playerId>_orig]`, `images[<playerId>]` | `photo.jpg` (Original) und `photo-cropped.jpg` (Zuschnitt) |
| `notes` | entfällt; das neue Modell kennt keine Notizen zu Spielern |
| `crop`, `photo` | entfallen (der Zuschnitt liegt bereits als Bild vor) |

**Spieltage** (Einträge ohne `type`)

| Alt | Neu |
|---|---|
| `date` | Datum |
| `md` | Spieltag-Nummer |
| `opp` | Gegner |
| `venue`: `H`, `A`, `N` | Ort `home`, `away`, `neutral` |
| `comp`: `Liga`, `Pokal`, `Test`, `Turnier` | Wettbewerb `league`, `cup`, `friendly`, `tournament` |
| `gf`, `ga` | Ergebnis, nur wenn beide gesetzt |
| `notes` | Notiz, leer = keine |

**Trainings** (`type = "training"`)

| Alt | Neu |
|---|---|
| `date`, `dur`, `topic` | Datum, Dauer, Thema |
| `focus` (deutsche Namen) | Schwerpunkte, z. B. `Technik` → `technique`, `Taktik` → `tactics`, `Spielform` → `smallSidedGames` (siehe [6.2.6](#626-feldwerte)) |
| `notes` | Notiz, leer = keine |

**Bewertungen** (`ratings[<terminId>][<spielerId>]`)

| Alt | Neu |
|---|---|
| `status` bei Spieltagen: `start`, `sub`, `out` | Einsatz `starting`, `substitute`, `absent` |
| `status` bei Trainings: `present`, `late`, `excused`, `absent` | Anwesenheit `present`, `late`, `excused`, `unexcused` |
| `min` | entfällt; gespielte Minuten werden nicht mehr erfasst |
| `grade`, `fair` (`null` = nicht erfasst) | Leistungsnote, Fairness |
| `attrs`: `eff`, `tech`, `iq`, `duel`, `team` | Eigenschaften `effort`, `technique`, `gameIntelligence`, `duels`, `teamSpirit`; fehlende Schlüssel = nicht erfasst |
| `goals`, `assists`, `saves` | Tore, Vorlagen, Paraden; nur Spieltage, `0` wird nicht als Event übernommen |
| `yel`, `yr`, `red` | Karten Gelb, Gelb-Rot, Rot; nur Spieltage, nur `true` wird übernommen |
| `comment` | Kommentar, leer = keiner |

Leistungswerte werden nur übernommen, wenn die Leistung zählt (Startelf, Eingewechselt, Anwesend, Verspätet). Werte bei anderen Status sowie Tore, Karten usw. bei Trainings werden verworfen.

`current` (aktives Team der alten App) entfällt; jeder Trainer wählt nach dem Import sein aktives Team selbst bzw. erhält das nächste verfügbare (siehe [4.1.2](#412-aktives-team-nach-der-anmeldung)).

#### 8.3.3 Ablauf

1. Die Exportdatei in den Backend-Container kopieren, z. B. `docker cp Kaderblick_Backup_20261110.json kaderblick-backend:/tmp/`.
2. Das Import-Skript starten: `docker exec kaderblick-backend node cli/import.js /tmp/Kaderblick_Backup_20261110.json`.
3. Das Skript prüft die ganze Datei mit einem Zod-Schema (`app = "kaderblick"`, `version = 1`, Felder und Werte wie oben). Bei Fehlern bricht es ab, ohne etwas zu schreiben, und nennt die fehlerhaften Stellen ohne personenbezogene Inhalte.
4. Gibt es für ein Team der Datei bereits ein nicht gelöschtes Team mit gleichem Namen und gleicher Saison, bricht das Skript vor dem Schreiben ab. So kann eine Datei nicht versehentlich doppelt importiert werden.
5. Je Team:
   1. neue `teamId` vergeben (siehe [5.1.3](#513-vergabe-der-team-nummer)), `Team.create` und `TeamCreated` speichern;
   2. Wappen und Trainerangabe als Dateien schreiben;
   3. für jeden Spieler eine neue `playerId` vergeben, Profil und Fotos schreiben;
   4. über die normalen Geschäftsmethoden Kader, Termine und Bewertungen erzeugen (`addPlayer`, `scheduleMatch`, `recordResult`, `scheduleTraining`, `recordParticipation`, `recordAttendance`, `gradePerformance`, …) und Notizen bzw. Kommentare zuerst als Dateien schreiben. Spieler mit `active = false` werden erst danach inaktiv gesetzt, weil inaktive Spieler nicht bewertet werden können;
   5. alle Events des Teams in einem Schreibvorgang speichern.
6. Verstößt ein Datensatz gegen eine Regel aus [5.2](#52-invarianten-und-regeln) (z. B. Note außerhalb des Bereichs), bricht der Import des Teams ab und nennt Termin- und Spieler-ID der alten App.
7. Am Ende nennt das Skript je Team die neue `teamId` und die Anzahl importierter Spieler, Spieltage, Trainings und Bewertungen.
8. Die Exportdatei im Container und überall sonst löschen: Sie enthält personenbezogene Daten.

Schlägt der Import eines Teams nach Schritt 5.1 fehl, wird das unvollständige Team in der App gelöscht und die Datei nach Korrektur erneut importiert. Verwaiste Dateien räumen die Aufräumjobs auf.

### 8.4 Spieler auf Anfrage löschen

Verlangt eine Person die Löschung ihrer Daten (DSGVO), entfernt ein Admin sie von Hand auf dem Server. Die App bietet dafür keine Funktion (siehe [4.2.5](#425-spieler-endgültig-löschen)).

#### 8.4.1 Was gelöscht wird und was bleibt

| Gelöscht | Bleibt |
|---|---|
| `player/{playerId}/` mit `profile.json`, `photo.jpg` und `photo-cropped.jpg` | Events in KurrentDB (enthalten nur die `playerId`) |
| `comments/{playerId}.txt` in allen Spieltagen und Trainings aller Teams | Kaderzugehörigkeit, Rückennummer, Position |
| Erwähnungen in Notizen zu Spieltagen und Trainings (von Hand bereinigt) | Zahlenwerte der Bewertungen (Noten, Tore, Anwesenheit …), ohne Bezug zur Person |

Danach erscheint der Spieler in allen Teams als „Gelöschter Spieler“ ohne Foto und Kommentare (siehe [5.4.6](#546-lesen-bei-fehlenden-daten)), und die Spielersuche findet ihn nicht mehr. Ein Neustart des Backends ist nicht nötig, weil Profile und Kommentare erst beim Ausliefern aus den Dateien gelesen werden.

#### 8.4.2 Voraussetzungen

- SSH-Zugang zum Server mit dem Recht, Docker-Befehle auszuführen.
- Vor- und Nachname der Person, möglichst auch das Geburtsdatum, um Namensgleichheiten auszuschließen.
- Die Anfrage ist schriftlich festgehalten (wer, wann, über welchen Weg).

#### 8.4.3 Ablauf

1. **Am Server anmelden** und eine Shell im Backend-Container öffnen. Das Backend läuft dabei weiter.

   ```sh
   ssh <server>
   docker exec -it kaderblick-backend sh
   cd /data
   ```

2. **Spieler finden.** Die Suche ignoriert Groß- und Kleinschreibung; der Verzeichnisname eines Treffers ist die `playerId`.

   ```sh
   grep -il "Nachname" player/*/profile.json
   ```

   Für jeden Treffer das Profil anzeigen und Vorname, Name und Geburtsdatum vergleichen:

   ```sh
   cat player/<playerId>/profile.json
   ```

   Gibt es keinen Treffer, mit einem Teil des Namens oder dem Vornamen erneut suchen. Bleibt die Suche erfolglos, wurde das Profil bereits gelöscht (z. B. vom täglichen Aufräumjob, weil der Spieler in keinem Team mehr war); dann weiter mit Schritt 4.

3. **Umfang prüfen.** Anzeigen, welche Dateien gelöscht werden:

   ```sh
   ls -l player/<playerId>
   find team -path "*/comments/<playerId>.txt"
   ```

4. **Notizen prüfen.** Notizen zu Spieltagen und Trainings können die Person erwähnen. Mit Vor- und Nachnamen suchen:

   ```sh
   find team -name notes.txt -exec grep -il "Nachname" {} +
   find team -name notes.txt -exec grep -il "Vorname" {} +
   ```

   Jeden Treffer öffnen (`vi <datei>`) und nur die Stellen über die Person entfernen. Betrifft die Notiz ausschließlich diese Person, kann die Datei ganz gelöscht werden; die App zeigt die Notiz dann als leer an.

5. **Löschen.**

   ```sh
   rm -r player/<playerId>
   find team -path "*/comments/<playerId>.txt" -delete
   ```

6. **Kontrollieren.** Alle drei Befehle dürfen nichts mehr ausgeben (außer Treffern zu anderen Personen mit gleichem Namen):

   ```sh
   ls player/<playerId>
   find team -path "*/comments/<playerId>.txt"
   grep -ril "Nachname" player team
   ```

   Danach die Shell mit `exit` verlassen.

7. **Dokumentieren.** Datum, `playerId` und Bezug zur Anfrage festhalten, ohne Namen der Person.

8. **Trainer informieren.** Die Trainer der betroffenen Teams sehen den Spieler danach als „Gelöschter Spieler“. Wer ihn nicht mehr im Kader sehen möchte, entfernt ihn dort (siehe [4.2.4](#424-aus-dem-kader-entfernen)).

#### 8.4.4 Hinweise

- **Backups:** Die Daten bleiben in den Backups der letzten 14 Tage enthalten und verschwinden mit deren turnusmäßiger Löschung (siehe [8.2](#82-backups)). Wird in dieser Zeit ein Backup zurückgespielt, muss die Löschung danach wiederholt werden; deshalb wird sie dokumentiert.
- **Daten außerhalb von Kaderblick:** Exportierte CSV-Dateien und geteilte Saisonbilanzen liegen bei den Trainern. Sie werden gebeten, solche Dateien ebenfalls zu löschen.
- **Erneutes Anlegen:** Wird die Person später wieder einem Kader hinzugefügt, wird sie als neuer Spieler mit neuer `playerId` angelegt.

### 8.5 Wiederkehrende Jobs

Die Jobs laufen im Backend-Prozess. Zeitpunkte liegen außerhalb der Backup-Zeit.

| Job | Zeitplan | Aufgabe |
|---|---|---|
| Verwaiste Spieler | täglich 04:00 | löscht Spielerprofile ohne Team (siehe [5.4.5](#545-aufräumjob-für-spieler)) und holt fehlgeschlagene Dateilöschungen nach |
| Verwaiste Streams | 04:30 am 1. Tag jedes zweiten Monats | löscht die Streams von Teams, deren `TeamDeleted` älter als 30 Tage ist, endgültig (Tombstone) und startet danach einen Scavenge |

**Scavenge**

- Der Job startet den Scavenge nur, wenn er mindestens einen Stream gelöscht hat, über die HTTP-Admin-Schnittstelle von KurrentDB (`POST /admin/scavenge` an `KADERBLICK_KURRENTDB_HTTP_URL`, z. B. `http://kaderblick-kurrentdb:2113`).
- Der Scavenge läuft im Hintergrund der Kaderblick-eigenen KurrentDB und gibt den Speicherplatz der gelöschten Events frei; Kaderblick bleibt währenddessen nutzbar.
- Start und Ergebnis werden protokolliert (nur mit `teamId`s). Schlägt der Start fehl, wird das protokolliert; die Streams sind trotzdem gelöscht, und der Betreiber kann den Scavenge in der Oberfläche von KurrentDB nachholen.

## 9. Offene Punkte

Keine. Neue offene Punkte, die bei der Umsetzung entstehen, werden hier gesammelt.
