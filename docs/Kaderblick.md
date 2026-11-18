# Kaderblick – Spezifikation

> Status: Entwurf. Abschnitte mit _TODO_ werden gemeinsam ausgearbeitet.

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
| **Trainer** | Sind Nutzer der App. Jeder Trainer ist in der Trainer-Konfiguration (siehe [8.1](#81-konfiguration)) mit Trainer-Id (E-Mail), Name und eigenem Zugangsschlüssel hinterlegt. E-Mail und Name sind personenbezogene Daten und stehen deshalb nie in Events. Mit dem Zugangsschlüssel authentifiziert sich ein Trainer im Backend. Die Einstellungen eines Trainers werden unter `./data/trainer/{trainerId}/settings.json` abgelegt. Dort werden das aktive Team, die Trainingszeit (Default 90 min) und die Standard-Spielzeit (Default 12 min, Vorbelegung der gespielten Minuten in der Spielbewertung) hinterlegt. |
| **Zugangsschlüssel** | Ein persönliches Geheimnis je Trainer, mit dem er sich am Backend anmeldet. Beim Login prüft das Backend den Schlüssel gegen die Trainer-Konfiguration und setzt bei Erfolg ein Session-Cookie (siehe Sitzung). Der Schlüssel selbst wird danach nicht mehr übertragen. |
| **Sitzung** | Ein signiertes und verschlüsseltes Session-Cookie (`@fastify/secure-session`) mit `trainerId` und Ablaufzeit. Cookie-Attribute: `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age` von 30 Tagen. Die Ablaufzeit wird serverseitig geprüft; nach Ablauf oder Abmelden ist eine erneute Anmeldung nötig. `Secure` setzt HTTPS voraus. |
| **Spieltag** | Ein Spieltag ist ein bewertbares Ereignis in der Anwendung. Es legt ein Datum fest, optional außerdem Spieltag-Nummer, Gegner, Ort (Heim, Auswärts, Neutral), Wettbewerb (Liga, Pokal, Test, Turnier), Notizen und Ergebnis (Tore Team, Tore Gegner). |
| **Training** | Eine Trainingseinheit ist ein weiteres, bewertbares Ereignis in der Anwendung. Es legt Datum, Dauer, Thema und Schwerpunkte (z. B. Technik, Taktik, Kondition) sowie Notizen fest. |
| **Bewertung** | Es werden zwei Arten von Bewertungen unterschieden: Trainingsbewertung und Spielbewertung. Eine Trainingsbewertung erfasst die Leistung eines Spielers bei einer Trainingseinheit (Training). Eine Spielbewertung erfasst die Leistung eines Spielers an einem Spieltag. Eine Bewertung ist eindeutig durch Termin und Spieler bestimmt und hat keine eigene ID. Eine Spielbewertung enthält den Einsatz (Startelf, Eingewechselt, Nicht dabei), die gespielten Minuten (vorbelegt mit der Standard-Spielzeit des Trainers), Leistungsnote (1–6 in halben Schritten), Fairness (1–6), Eigenschaften mit 0–5 Sternen (Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist), Tore, Vorlagen, Paraden und Karten (Gelb, Gelb-Rot, Rot) sowie einen optionalen Kommentar. Minuten und Leistungswerte zählen nur bei Startelf oder Eingewechselt. Leistungswerte einer Trainingsbewertung zählen nur bei Anwesend oder Verspätet. Eine Trainingsbewertung enthält Leistungsnote (1–6 in halben Schritten), Fairness (1–6), Eigenschaften mit 0–5 Sternen (Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist), Anwesenheit (Anwesend, Verspätet, Entschuldigt und Unentschuldigt) und einen optionalen Kommentar. |
| **Kommentar / Notiz** | Freitext zu einer Bewertung oder Spieltag/Training. Freitexte gelten als personenbezogen. Daher werden sie nicht in Events gespeichert, sondern auf dem Dateisystem. Kommentare zu Bewertungen werden je Termin und Spieler unter `./data/team/{teamId}/match/{matchId}/comments/{playerId}.txt` bzw. `./data/team/{teamId}/training/{trainingId}/comments/{playerId}.txt` gespeichert. Notizen zu Spieltagen oder Trainings werden hingegen unter `./data/team/{teamId}/match/{matchId}/notes.txt` oder `./data/team/{teamId}/training/{trainingId}/notes.txt` gespeichert. |
| **Event** | Eine im Event Store gespeicherte fachliche Tatsache, z. B. `TeamCreated`. Events sind unveränderlich und enthalten keine personenbezogenen Daten. |

## 3. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Team als Aggregate | Teams sollen als Aggregates betrachtet werden. Für jedes neues Team wird deshalb ein eigener Stream `team-{teamId}` angelegt. Ein Team besteht aus Kader (zugewiesene Spieler), Spieltage, Trainings und Bewertungen. |
| Gleicher Name + Saison eines Teams | Bewusste Ausnahme von der Regel „Read-Models nie für Invarianten“: Die Prüfung erfolgt über eine Projektion. Wegen eventual consistency kann es in seltenen Fällen zu Duplikaten kommen; das ist fachlich akzeptiert. |
| Kaderspieler löschen | Wird ein Spieler aus dem Kader entfernt, so verfallen auch alle Bewertungen des Spielers in diesem Team: Die Events bleiben unverändert, Aggregate und Read-Models ignorieren die Bewertungen ab diesem Zeitpunkt. Die zugehörigen Kommentardateien werden gelöscht. |
| Kaderspieler inaktiv | Wird ein Spieler im Kader inaktiv gesetzt, dann können keine Bewertungen mehr erfasst werden bis der Spieler wieder aktiviert wird. |
| Kaderspieler hinzufügen | Ein bereits existierender Spieler (z. B. aus einem Team der Vorsaison) wird beim Hinzufügen per Suche ausgewählt und über seine `playerId` übernommen. Wird ein neuer Spieler einem Kader hinzugefügt, dann erhält er eine neue zufällige `playerId` und es wird ein Eintrag auf dem Dateisystem für ihn angelegt. Dabei wird erst die Profildatei geschrieben, dann das Event. |
| Verwaiste Spieler | Verwaiste Spieler (Spieler auf dem Dateisystem, die keinem Kader mehr zugewiesen sind) müssen über einen Aufräumjob identifiziert und gelöscht werden. Der Job läuft täglich. |
| Spieler löschen (DSGVO) | Wird ein Spieler gelöscht, werden nur seine Dateien auf dem Dateisystem entfernt: Profil, Fotos und die Kommentare zu seinen Bewertungen in allen Teams. Die Events bleiben unverändert, der Spieler bleibt einem Team weiterhin zugewiesen und verweist nur noch auf eine `playerId` ohne Personenbezug. |
| Fehlende personenbezogene Daten beim Lesen | Read-Models und Antworten ersetzen fehlende Dateien durch sinnvolle Standardwerte, z. B. Name „Gelöschter Spieler“, kein Foto, kein Kommentar. Fehlende Dateien sind kein Fehler. |
| Team löschen | Beim Löschen eines Teams wird ein `TeamDeleted`-Event geschrieben, der Stream bleibt bestehen. Die Dateien unter `./data/team/{teamId}/` (Wappen, Notizen, Kommentare) werden sofort gelöscht. Auf ein gelöschtes Team werden keine weiteren Geschäftsmethoden angewendet, und es erscheint in keiner Übersicht mehr. |
| Verwaiste Streams | Der Stream eines gelöschten Teams gilt 30 Tage nach dem `TeamDeleted`-Event als verwaist. Ein wiederkehrender Job räumt verwaiste Streams auf; er läuft alle 2 Monate. Ein gelöschtes Team wird dadurch frühestens 30 Tage und spätestens etwa 90 Tage nach dem Löschen aus dem Event Store entfernt. |
| Aktives Team nach dem Löschen | Ist das gelöschte Team bei einem Trainer als aktives Team hinterlegt, wird sein aktives Team auf das nächste verfügbare Team gewechselt: das Team mit der neuesten Saison, bei Gleichstand alphabetisch nach Name. Die Umstellung erfolgt beim nächsten Lesen der Einstellungen: Das Backend prüft, ob das hinterlegte Team noch existiert, wählt sonst das nächste Team und speichert es. Beim Löschen eines Teams werden keine Einstellungsdateien angefasst. |
| Immer ein aktives Team | In der Anwendung muss immer ein Team aktiv sein. Das letzte noch vorhandene Team kann deshalb nicht gelöscht werden; der Versuch wird mit `422` abgelehnt. Geprüft wird über die Projektion der Team-Übersicht. Das ist wie bei doppelten Namen eine bewusste Ausnahme von der Regel „Read-Models nie für Invarianten“, weil die Regel mehrere Teams betrifft. In seltenen Fällen (zwei Trainer löschen gleichzeitig die letzten beiden Teams) können dadurch kurzzeitig keine Teams vorhanden sein; dann erzwingt das Frontend den Dialog „Team anlegen“. |
| Sichtbarkeit von Teams | Alle Trainer sehen und bearbeiten alle Teams. Es gibt keine Zuordnung von Trainern zu Teams. |
| Spieltag gelöscht | Wird ein Spieltag gelöscht, dann verfallen auch alle zugehörigen Bewertungen: Die Events bleiben unverändert, Aggregate und Read-Models ignorieren die Bewertungen. Die zugehörigen Kommentar- und Notizdateien werden gelöscht. |
| Training gelöscht | Wird ein Training gelöscht, dann verfallen auch alle zugehörigen Bewertungen: Die Events bleiben unverändert, Aggregate und Read-Models ignorieren die Bewertungen. Die zugehörigen Kommentar- und Notizdateien werden gelöscht. |
| Team als Klasse | Das Team-Aggregate wird als Klasse `Team` umgesetzt (objektorientierter Stil). Der Zustand ist privat und nur über Geschäftsmethoden änderbar. |
| Team (Aggregate) einlesen | Ein Team soll nur über ein TeamRepository eingelesen werden. Das Repository liest die Events des Streams und erzeugt das Team über `Team.fromEvents(events)`. Dabei wird für jedes Event die private Methode `#apply(event)` aufgerufen. |
| Team-Events abspielen | `#apply` prüft nicht: Ein gespeichertes Event ist eine Tatsache und lässt sich immer anwenden, auch wenn sich Regeln seitdem geändert haben. `#apply` übernimmt das Event in den Zustand und leitet nur fachliche Folgen ab (z. B. verfallene Bewertungen). |
| Geschäftsmethoden | Geschäftsmethoden (z. B. `team.ratePlayer(...)`) prüfen die Invarianten gegen den aktuellen Zustand und liefern `Result<void, DomainError>`. Ist die Operation zulässig, erzeugen sie ein Event über `#raise(event)`: Es wird über dasselbe `#apply` wie beim Einlesen angewendet und als Pending Event vorgemerkt. Ist sie unzulässig, entsteht kein Event und der Zustand bleibt unverändert. Ein neues Team entsteht über `Team.create(...)`. |
| Team speichern | Das Team-Aggregate soll auch über das TeamRepository gespeichert werden. Hierzu werden die Pending Events gelesen und in die Event-Datenbank geschrieben. Dabei wird die beim Laden gelesene Revision als erwarteter Stream-Stand übergeben (optimistisches Sperren, bei einem neuen Team `NO_STREAM`). Weicht die Revision ab, wird das Team einmal neu geladen und die Geschäftsmethode erneut gegen den neuen Zustand aufgerufen (höchstens ein weiterer Schreibversuch). Schlägt auch dieser mit einem Konflikt fehl, wird mit `409` abgelehnt. |
| Zugangsschlüssel pro Trainer | Jeder Trainer hat einen eigenen Zugangsschlüssel. Einzelne Trainer lassen sich so sperren, ohne dass alle anderen ihren Schlüssel ändern müssen. |
| Ablage der Zugangsschlüssel | Die Trainer-Konfiguration ist eine JSON-Datei, deren Pfad über die Umgebungsvariable `KADERBLICK_TRAINERS_FILE` übergeben wird. Die Schlüssel stehen bewusst im Klartext darin. Wer die Datei lesen kann, kann sich als jeder Trainer anmelden; das wird zugunsten der einfachen Verwaltung akzeptiert. |
| Anmeldung nur mit Zugangsschlüssel | Auf der Anmeldeseite wird nur der Zugangsschlüssel eingegeben, er identifiziert den Trainer allein. Zugangsschlüssel müssen deshalb eindeutig sein; das Backend prüft das beim Start. |
| Schutz vor Durchprobieren | Höchstens 5 fehlgeschlagene Anmeldungen pro IP-Adresse in 15 Minuten, danach `429` (`@fastify/rate-limit`). |
| Anmeldung über Session-Cookie | Der Zugangsschlüssel wird nur beim Login übertragen. Danach authentifiziert ein signiertes, verschlüsseltes Session-Cookie mit Ablaufzeit (`@fastify/secure-session`) die Anfragen. |
| Direkte Kommunikation mit dem Backend | Jede Änderung geht sofort an das Backend. Ohne Verbindung zum Backend zeigt das Frontend einen Hinweis. |
| ID-Vergabe | Alle IDs vergibt das Backend: Teams eine fortlaufende Nummer, Spieler, Spieltage und Trainings eine zufällige UUID. |
| Einsatz im Spiel | Startelf, Eingewechselt oder Nicht dabei, dazu die gespielten Minuten (vorbelegt mit der Standard-Spielzeit des Trainers). Minuten und Leistungswerte zählen nur bei Startelf oder Eingewechselt. |
| Teilnahme am Training | Leistungswerte einer Trainingsbewertung zählen nur bei Anwesend oder Verspätet, nicht bei Entschuldigt oder Unentschuldigt. |
| Fachlich feine Events | Je fachlicher Änderung ein Event (z. B. `MatchPerformanceGraded`, `GoalsRecorded`, `TeamRenamed`), kein Event je Formular. Werte, die sich nicht geändert haben, erzeugen keine Events; so bleibt die Historie aussagekräftig. |
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
| Aktualität im Frontend | Schreibende Endpunkte antworten erst, wenn die Read-Models die neue Revision verarbeitet haben (höchstens 2 Sekunden). Änderungen anderer Trainer erkennt das Frontend per Polling (Ansichtswechsel, Fenster im Vordergrund, alle 30 Sekunden) mit der Team-Revision als `ETag`. Hat ein anderer Trainer die Daten eines Formulars inzwischen geändert, wird das Speichern mit `409 EditConflict` abgelehnt. Kein Push (Details siehe [7](#7-gemeinsamer-datenstand)). |
| Geburtsdatum Pflicht | Ein neuer Spieler braucht Vorname, Name und Geburtsdatum. So lassen sich gleichnamige Spieler unterscheiden. |
| Spieler endgültig löschen | Nur durch den Betreiber auf Anfrage (DSGVO), nicht in der App. Trainer entfernen Spieler aus dem Kader; Spieler ohne Team löscht der tägliche Aufräumjob. |
| Kader übernehmen | Spieler eines anderen Teams lassen sich gesammelt übernehmen, mit Rückennummer und Position, ohne Bewertungen. Das Profil wird über die `playerId` geteilt, nicht kopiert. |
| Termine ohne Uhrzeit | Spieltage und Trainings haben nur ein Datum. |
| Bewerten mit Speichern-Button | Bewertungen werden im Dialog bzw. in der Spielerliste gesammelt und mit **Speichern** übertragen. Der Service erzeugt daraus die feinen Events in einem Schreibvorgang. |
| Vollständige Formulare, Abgleich im Backend | Das Frontend schickt beim Speichern immer alle Werte eines Formulars, nicht nur die geänderten. Der Service vergleicht jeden Wert mit dem aktuellen Zustand und ruft nur für abweichende Werte die Geschäftsmethode auf; gleiche Werte erzeugen kein Event (Regel 12 in [5.2](#52-invarianten-und-regeln)). Ausnahme sind Bilder (Wappen, Foto): Sie werden nur geschickt, wenn ein neues Bild gewählt wurde; das Entfernen wird ausdrücklich angegeben. Damit dabei keine Änderung eines anderen Trainers überschrieben wird, gilt die Konfliktprüfung (siehe „Bearbeitungskonflikt“). |
| Bearbeitungskonflikt | Das Frontend schickt beim Speichern neben den neuen Werten auch die Werte, die es beim Öffnen des Formulars geladen hat. Weicht der aktuelle Stand im Backend in irgendeinem Wert des Formulars davon ab, lehnt der Service die ganze Anfrage mit `409 EditConflict` ab und speichert nichts. Der Trainer muss neu laden und seine Eingaben wiederholen. Verglichen wird nur, was zum Formular gehört (z. B. die Bewertung eines Spielers), nicht das ganze Team. Bilder sind ausgenommen. Bei wenigen gleichzeitig arbeitenden Trainern kommt das selten vor. |
| Keine Trainingsserien | Trainings werden einzeln angelegt; „Wie letztes Training“ übernimmt Dauer, Thema und Schwerpunkte als Vorschlag. |
| REST-API nutzt Services | Der Controller oder Callback einer REST-API Methode soll niemals das TeamRepository direkt nutzen, sondern über Service-Klassen erfolgen, die die Verarbeitung von Anfragen orchestrieren. |

_TODO: Weitere Entscheidungen ergänzen._

## 4. Fachliche Funktionen

### 4.1 Ersteinrichtung und Anmeldung

#### 4.1.1 Anmelden

1. Wer die Webanwendung ohne gültige Sitzung öffnet, sieht die Anmeldeseite. Sie enthält ein verdecktes Eingabefeld **Zugangsschlüssel** und den Button **Anmelden**.
2. Das Backend vergleicht den eingegebenen Schlüssel zeitkonstant mit den Schlüsseln aller Trainer aus der Trainer-Konfiguration. Der Schlüssel allein identifiziert den Trainer.
3. **Erfolg:** Das Backend setzt das Session-Cookie (siehe Begriff „Sitzung“) und das Frontend zeigt die Anwendung mit dem aktiven Team des Trainers.
4. **Falscher Schlüssel:** Das Frontend zeigt „Zugangsschlüssel ungültig“ (`401`). Das Feld bleibt gefüllt, damit Tippfehler korrigiert werden können.
5. **Zu viele Fehlversuche:** Nach 5 fehlgeschlagenen Anmeldungen innerhalb von 15 Minuten von derselben IP-Adresse lehnt das Backend weitere Versuche mit `429` ab (`@fastify/rate-limit`). Das Frontend zeigt „Zu viele Fehlversuche. Bitte in einigen Minuten erneut versuchen.“

#### 4.1.2 Aktives Team nach der Anmeldung

Nach der Anmeldung lädt das Frontend die Einstellungen des Trainers. Das Backend bestimmt dabei das aktive Team:

- Ist ein Team hinterlegt und existiert es noch, bleibt es aktiv.
- Ist keins hinterlegt oder wurde es gelöscht, wird das nächste verfügbare Team aktiv (neueste Saison, bei Gleichstand alphabetisch nach Name) und gespeichert.
- Existiert noch kein Team (Ersteinrichtung), erscheint der Dialog „Team anlegen“ (siehe [4.5.1](#451-team-anlegen)). Er lässt sich nicht abbrechen; die Reiter sind erst danach nutzbar. Das neue Team wird automatisch das aktive Team des Trainers.

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

- **Speichern** schickt alle Felder; das Backend gleicht sie mit dem aktuellen Stand ab (siehe Getroffene Entscheidungen). Ein vorhandenes Foto lässt sich entfernen, eine Rückennummer löschen. Eine Position lässt sich ändern und entfernen (`removePosition`); der Spieler steht dann unter „Ohne Position“.
- **Profiländerungen:** Weicht das Profil vom gespeicherten ab, schreibt der Service die Profildatei und danach `PlayerProfileChanged` in jedes Team, in dessen Kader der Spieler ist (siehe [5.3.2](#532-kader)).
- **Kaderänderungen:** Der Service ruft für jedes abweichende Feld die passende Geschäftsmethode auf (`assignShirtNumber`, `removeShirtNumber`, `changePosition`, `removePosition`, `deactivatePlayer`, `reactivatePlayer`) und speichert alle Events in einem Schreibvorgang.
- **Inaktiv setzen:** Der Dialog weist darauf hin, dass für inaktive Spieler keine Bewertungen erfasst werden können und bereits erfasste erhalten bleiben.
- Antwort: `200` mit dem aktualisierten Kaderspieler.

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
| `409 EditConflict` | „Die Daten wurden inzwischen von einem anderen Trainer geändert. Bitte neu laden und die Eingaben wiederholen.“ Der Button **Neu laden** lädt den aktuellen Stand in den Dialog. |
| `409 ConcurrencyConflict` | „Der Kader wurde gerade von einem anderen Trainer geändert. Bitte erneut speichern.“ |

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
2. Der Service vergibt eine zufällige `matchId`. Ist eine Notiz angegeben, schreibt er zuerst `match/{matchId}/notes.txt`.
3. Er lädt das Team, ruft `scheduleMatch(...)` auf und je nach Eingabe `recordResult(...)` und `writeMatchNotes(...)`, und speichert alle Events in einem Schreibvorgang.
4. Antwort: `201` mit der `matchId`.

**Spieltag bearbeiten**

Der Dialog **Spieltag bearbeiten** wird aus der Bewertungsansicht geöffnet und enthält dieselben Felder, vorbelegt mit den aktuellen Werten. **Speichern** schickt alle Felder; der Service vergleicht sie mit dem aktuellen Stand und ruft für abweichende Felder die passenden Geschäftsmethoden auf (`rescheduleMatch`, `changeMatchday`, `removeMatchday`, `changeOpponent`, `removeOpponent`, `changeVenue`, `removeVenue`, `changeCompetition`, `removeCompetition`, `recordResult`, `clearResult`, `writeMatchNotes`, `removeMatchNotes`) und speichert alle Events in einem Schreibvorgang. Ein geleertes Feld gilt als Entfernen. Antwort: `200`.

**Spieltag löschen**

Der Dialog **Spieltag bearbeiten** enthält den Button **Löschen**. Der Bestätigungsdialog nennt die Folgen: Alle Bewertungen dieses Spieltags verfallen, Notiz und Kommentare werden gelöscht, ein Wiederherstellen ist nicht möglich. Der Service ruft `deleteMatch(...)` auf, speichert `MatchDeleted` und löscht danach `match/{matchId}/`. Antwort: `204`.

#### 4.3.2 Trainings

**Liste**

- Sortiert nach Datum, neueste zuerst. Oben der Button **Training anlegen**.
- Jeder Eintrag zeigt Datum, Thema, Schwerpunkte, Dauer, die Teilnahme (z. B. „14 von 16 anwesend“, gezählt werden Anwesend und Verspätet) und ein Symbol, wenn eine Notiz vorhanden ist.

**Training anlegen**

| Feld | Pflicht | Eingabe und Prüfung | Vorbelegung |
|---|---|---|---|
| Datum | ja | gültiges Datum | heute |
| Dauer | ja | ganze Zahl 1–600 Minuten | Trainingszeit aus den Einstellungen des Trainers |
| Thema | nein | Freitext bis 100 Zeichen | – |
| Schwerpunkte | nein | Mehrfachauswahl aus der festen Liste (siehe [5.3.4](#534-trainings)) | – |
| Notiz | nein | Freitext bis 2000 Zeichen | – |

Der Button **Wie letztes Training** füllt Dauer, Thema und Schwerpunkte mit den Werten des zuletzt stattgefundenen Trainings vor. Trainings werden einzeln angelegt; Serien gibt es nicht.

Ablauf im Backend wie bei Spieltagen: zufällige `trainingId`, Notiz zuerst als Datei, dann `scheduleTraining(...)` und ggf. `writeTrainingNotes(...)` in einem Schreibvorgang. Antwort: `201` mit der `trainingId`.

**Training bearbeiten und löschen**

Wie bei Spieltagen, mit den Geschäftsmethoden `rescheduleTraining`, `changeTrainingDuration`, `changeTrainingTopic`, `changeTrainingFocus`, `writeTrainingNotes`, `removeTrainingNotes` bzw. `deleteTraining`. Beim Löschen werden `training/{trainingId}/` mit Notiz und Kommentaren gelöscht.

#### 4.3.3 Bewertungsansicht

Die Bewertungsansicht zeigt einen Termin mit den Bewertungen aller Spieler. Grundlage ist das Read-Model Termin-Detail ([5.5.7](#557-termin-detail)).

**Kopf**

Termindaten wie in der Liste, dazu die Notiz und der Button **Bearbeiten** (Termin bearbeiten bzw. löschen).

**Spielerliste**

- Alle aktiven Kaderspieler, gruppiert und sortiert wie in der Kaderliste ([4.2](#42-kader)).
- Inaktive Spieler erscheinen nur, wenn für sie bereits etwas erfasst ist, ausgegraut und nur lesbar.
- Jede Zeile zeigt Foto, Name, Einsatz bzw. Anwesenheit (oder „nicht erfasst“), Leistungsnote und bei Spieltagen Tore und Karten.
- Einsatz bzw. Anwesenheit lassen sich direkt in der Zeile wählen. Die Änderungen werden gesammelt und erst mit **Speichern** übertragen; **Verwerfen** setzt sie zurück. Wer die Ansicht mit ungespeicherten Änderungen verlässt, wird gefragt, ob sie verworfen werden sollen.
- **Alle Startelf** (Spieltag) bzw. **Alle anwesend** (Training) erfasst sofort alle aktiven Spieler, für die noch nichts erfasst ist (siehe [5.3.5](#535-spielbewertung) und [5.3.6](#536-trainingsbewertung)). Bei ungespeicherten Änderungen in der Liste ist der Button gesperrt.
- Ein Klick auf einen Spieler öffnet den Dialog **Bewertung**.

**Dialog Bewertung (Spieltag)**

| Feld | Eingabe |
|---|---|
| Einsatz | Startelf, Eingewechselt, Nicht dabei |
| Minuten | ganze Zahl ≥ 0; wird mit der Standard-Spielzeit des Trainers vorbelegt, sobald Startelf oder Eingewechselt gewählt ist und noch keine Minuten erfasst sind |
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

- Solange kein Einsatz (Startelf, Eingewechselt) bzw. keine Anwesenheit (Anwesend, Verspätet) gewählt ist, sind Minuten und Leistungswerte gesperrt. Der Kommentar ist immer möglich.
- Wird Nicht dabei, Entschuldigt oder Unentschuldigt gewählt, weist der Dialog darauf hin, dass die erfassten Leistungswerte beim Speichern verfallen.
- **Speichern** überträgt alle Werte des Dialogs, **Abbrechen** verwirft die Eingaben.
- **Vor/Zurück** wechselt zum nächsten bzw. vorherigen Spieler der Liste. Ungespeicherte Änderungen werden vorher gespeichert.
- **Zurücksetzen** setzt die Bewertung nach Rückfrage auf „nicht erfasst“ zurück (`resetMatchRating` bzw. `resetTrainingRating`); der Kommentar bleibt erhalten.

**Ablauf im Backend**

1. Die Route prüft die übertragenen Werte mit Zod.
2. Weicht der Kommentar vom gespeicherten Text ab, schreibt der Service zuerst die Kommentardatei. Ein geleerter Kommentar gilt als Entfernen; die Datei wird erst nach dem Event gelöscht.
3. Der Service lädt das Team, vergleicht jeden Wert mit dem aktuellen Zustand und ruft nur für abweichende Werte die Geschäftsmethoden auf, in fester Reihenfolge: zuerst Einsatz bzw. Anwesenheit, dann Minuten und Leistungswerte, zuletzt der Kommentar. Geleerte Noten werden über die `withdraw…`-Methoden zurückgenommen, abgeschaltete Karten über `withdrawCard`.
4. Alle Events werden in einem Schreibvorgang gespeichert. Lehnt eine Methode ab, wird nichts gespeichert und der Fehler gemeldet.
5. Antwort: `200` mit der aktualisierten Bewertung.

Die Spielerliste schickt Einsatz bzw. Anwesenheit aller Spieler der Liste und wird auf dieselbe Weise abgeglichen, mit einem Schreibvorgang für alle Spieler.

Vor dem Aufruf der Geschäftsmethoden prüft der Service auf einen Bearbeitungskonflikt: Weicht die aktuelle Bewertung von den Werten ab, die das Frontend beim Öffnen geladen hat, wird mit `409 EditConflict` abgelehnt (bei der Spielerliste: Einsatz bzw. Anwesenheit irgendeines Spielers der Liste). Bewerten zwei Trainer gleichzeitig verschiedene Spieler im Dialog, gibt es keinen Konflikt.

**Fehlermeldungen im Frontend**

| Fall | Meldung |
|---|---|
| `404 MatchNotFound` / `TrainingNotFound` | „Dieser Termin wurde inzwischen gelöscht.“ Das Frontend wechselt zur Liste. |
| `404 PlayerNotInSquad` | „Der Spieler wurde inzwischen aus dem Kader entfernt.“ Das Frontend lädt die Ansicht neu. |
| `422 PlayerInactive` | „Der Spieler ist inaktiv und kann nicht bewertet werden.“ |
| `422 NotParticipating` | „Leistungswerte können erst nach Einsatz bzw. Anwesenheit erfasst werden.“ |
| `422` ungültige Eingabe | Meldung am betroffenen Feld |
| `409 EditConflict` | „Die Daten wurden inzwischen von einem anderen Trainer geändert. Bitte neu laden und die Eingaben wiederholen.“ Der Button **Neu laden** lädt den aktuellen Stand in den Dialog. |
| `409 ConcurrencyConflict` | „Der Termin wurde gerade von einem anderen Trainer geändert. Bitte erneut speichern.“ |

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
| Spiel | Einsätze, davon Startelf, Minuten, Tore, Vorlagen, Paraden, Gelb, Gelb-Rot, Rot, Ø-Note, Ø-Fairness, Ø-Sterne je Eigenschaft |
| Training | Beteiligung, Ø-Note, Ø-Fairness, Ø-Sterne je Eigenschaft |

Jede Spalte ist sortierbar, Standard ist Name, dann Vorname (alphabetisch). Ein Klick auf eine Zeile öffnet das Spielerdetail.

#### 4.4.5 Ranglisten

| Rangliste | Sortierung |
|---|---|
| Torschützen | Tore absteigend |
| Vorlagengeber | Vorlagen absteigend |
| Scorer | Tore plus Vorlagen absteigend |
| Einsatzminuten | Minuten absteigend |
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
- **Anwesenheit:** Aufteilung der Trainings nach Anwesend, Verspätet, Entschuldigt und Unentschuldigt.
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

- **Abbrechen** verwirft alle Änderungen.
- **Speichern** schickt alle Felder an das Backend (Wappen nur, wenn ein neues gewählt wurde). Der Service vergleicht sie mit dem aktuellen Stand und ruft für jedes abweichende Feld die passende Geschäftsmethode auf (`rename`, `changeSeason`, `changeTier`, `uploadCrest`, `removeCrest`, `changeCoaches`, `removeCoaches`) und speichert alle entstandenen Events in einem Schreibvorgang. Unveränderte Felder erzeugen keine Events.
- Ändert sich Name oder Saison, prüft der Service über die Team-Übersicht, ob es bereits ein anderes nicht gelöschtes Team mit dem neuen Namen und der neuen Saison gibt. Wenn ja: `409 DuplicateTeam`, es wird nichts gespeichert.
- Wappen und Trainerangabe: Beim Hochladen bzw. Ändern wird erst die Datei geschrieben, dann das Event. Beim Entfernen wird erst das Event geschrieben, dann die Datei gelöscht. Ein leeres Trainerfeld gilt als Entfernen.
- Antwort: `200` mit dem aktualisierten Team.

Hat ein anderer Trainer die Teamdaten geändert, seit der Dialog geöffnet wurde, lehnt der Service mit `409 EditConflict` ab (siehe „Bearbeitungskonflikt“).

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
| `404 TeamDeleted` / `TeamNotFound` | „Dieses Team wurde inzwischen gelöscht.“ Das Frontend lädt danach die Einstellungen neu. |
| `409 EditConflict` | „Die Daten wurden inzwischen von einem anderen Trainer geändert. Bitte neu laden und die Eingaben wiederholen.“ Der Button **Neu laden** lädt den aktuellen Stand in den Dialog. |
| `409 ConcurrencyConflict` | „Das Team wurde gerade von einem anderen Trainer geändert. Bitte erneut speichern.“ |

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
| Spieltag-Nr., Gegner, Ort, Wettbewerb, Ergebnis | ✓ | – |
| Dauer, Thema, Schwerpunkte | – | ✓ |
| Rückennummer, Position | aktueller Stand im Kader | aktueller Stand im Kader |
| Vorname, Name | ✓ | ✓ |
| Einsatz | Startelf, Eingewechselt, Nicht dabei | – |
| Anwesenheit | – | Anwesend, Verspätet, Entschuldigt, Unentschuldigt |
| Minuten | ✓ | – |
| Leistungsnote, Fairness | ✓ | ✓ |
| Einsatz & Laufbereitschaft, Technik, Spielverständnis, Zweikampf, Teamgeist | ✓ | ✓ |
| Tore, Vorlagen, Paraden | ✓ | – |
| Gelb, Gelb-Rot, Rot | je Kartenart eine Spalte mit der Anzahl gezeigter Karten | – |
| Kommentar | ✓ | ✓ |

- Zählt die Leistung nicht (Nicht dabei, Entschuldigt, Unentschuldigt), bleiben Minuten und alle Leistungswerte leer. Nicht erfasste Einzelwerte bleiben ebenfalls leer.
- Das Ergebnis steht als `3:1` aus Sicht des Teams, Schwerpunkte durch Komma getrennt.
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

Der Reiter `Einstellungen` hat vier Bereiche.

**Angemeldeter Trainer**

Zeigt Name und E-Mail des angemeldeten Trainers aus der Trainer-Konfiguration, nur lesbar. Darunter der Button **Abmelden** (siehe [4.1.3](#413-sitzung-beenden)). Änderungen an Name oder E-Mail erfolgen über die Trainer-Konfiguration ([8.1](#81-konfiguration)).

**Vorgaben**

| Feld | Pflicht | Eingabe und Prüfung | Standard | Wirkung |
|---|---|---|---|---|
| Trainingszeit | ja | ganze Zahl 1–600 Minuten | 90 | Vorbelegung der Dauer beim Anlegen eines Trainings ([4.3.2](#432-trainings)) |
| Standard-Spielzeit | ja | ganze Zahl 1–120 Minuten | 12 | Vorbelegung der gespielten Minuten in der Spielbewertung ([4.3.3](#433-bewertungsansicht)) |

- **Speichern** schickt beide Werte an das Backend, wie bei allen Formularen vollständig. Der Service schreibt sie in `trainer/{trainerId}/settings.json`; das aktive Team in derselben Datei bleibt unverändert. Antwort: `200`.
- **Verwerfen** setzt die Felder auf den gespeicherten Stand zurück.
- Die Vorgaben gelten für den Trainer auf allen seinen Geräten und wirken nur auf neue Eingaben; bereits gespeicherte Trainings und Bewertungen ändern sich nicht.
- Die Einstellungen gehören nur einem Trainer und erzeugen keine Events. Es gibt keine Konfliktprüfung: Speichert derselbe Trainer auf zwei Geräten, gilt der zuletzt gespeicherte Stand.
- Fehlt `settings.json`, gelten die Standardwerte.

**Darstellung**

Auswahl **Hell**, **Dunkel** oder **Wie System** (Standard). Die Auswahl wird nur im Browser des Geräts gespeichert und sofort angewendet; das Backend ist nicht beteiligt.

**Info**

- Versionsnummer des Frontends und des Backends (das Backend liefert seine Version über einen Endpunkt ohne Anmeldung, siehe [6](#6-api)).
- Link zur Datenschutzerklärung. Ihre Adresse wird beim Bereitstellen des Frontends festgelegt.

## 5. Domänenmodell

### 5.1 Aggregates und Streams

#### 5.1.1 Ein Aggregate: `Team`

Kaderblick hat genau ein Aggregate, die Klasse `Team`. Es umfasst Teamdaten, Kader, Spieltage, Trainings und Bewertungen eines Teams in einer Saison.

Der Schnitt folgt den Regeln aus [5.2](#52-invarianten-und-regeln): Fast jede Bewertungsregel braucht gleichzeitig den Kader (Spieler im Kader, aktiv), den Termin (existiert, nicht gelöscht) und die bisherige Bewertung (Einsatz erfasst, Karte schon gezeigt). Getrennte Aggregates für Kader, Spieltage oder Trainings würden diese Regeln auf mehrere Konsistenzgrenzen verteilen. Nebenläufigkeit spricht nicht dagegen: Wenige Trainer arbeiten gleichzeitig an einem Team, und Konflikte werden durch einmaliges Neuladen aufgelöst.

Bewusst **keine** Aggregates sind:

| Gegenstand | Grund | Ablage |
|---|---|---|
| Spieler (Profil) | Keine Invarianten; ausschließlich personenbezogene Daten, die löschbar sein müssen. | Datei `./data/player/{playerId}/` |
| Trainer-Einstellungen | Keine Invarianten, keine Historie nötig. | Datei `./data/trainer/{trainerId}/settings.json` |
| Team-übergreifende Regeln (doppelter Name, letztes Team) | Betreffen mehrere Teams; bewusst über die Team-Übersicht geprüft (siehe Getroffene Entscheidungen). | – |

#### 5.1.2 Stream

| Eigenschaft | Festlegung |
|---|---|
| Name | `team-{teamId}`, z. B. `team-7` |
| Kategorie | `team` (KurrentDB leitet sie am ersten Bindestrich ab) |
| Inhalt | Alle Events aus [5.3](#53-geschäftsmethoden-und-events) eines Teams, beginnend mit `TeamCreated` |
| Event-Typ | Name des Events, z. B. `MatchPerformanceGraded` |
| Event-Daten | JSON-Payload laut Zod-Schema des Events; beim Lesen wird jedes Event damit geprüft |
| Weitere Streams | Keine |

Der Stream ist durch die Saison begrenzt: Ein Team gehört zu genau einer Saison, für die nächste Saison wird ein neues Team angelegt. Grob geschätzt entstehen pro Saison einige zehntausend Events (z. B. 30 Spieltage und 80 Trainings mit je 20 Spielern und mehreren Werten pro Bewertung). Das Laden eines Teams bleibt damit ohne Snapshots schnell genug. Snapshots werden erst eingeführt, wenn Messungen das erfordern.

#### 5.1.3 Vergabe der Team-Nummer

Die `teamId` ist eine fortlaufende Nummer, die das Backend beim Anlegen vergibt:

1. Der Service nimmt die höchste bekannte `teamId` aus der Team-Übersicht (einschließlich gelöschter Teams) und addiert 1.
2. Das neue Team wird mit `NO_STREAM` gespeichert.
3. Existiert der Stream bereits (gleichzeitiges Anlegen oder Projektion noch nicht aktuell) oder wurde er früher gelöscht, versucht der Service einmal die nächste Nummer. Schlägt auch das fehl, wird mit `409` abgelehnt.

Nummern werden nicht wiederverwendet: Der Aufräumjob löscht verwaiste Streams endgültig (Tombstone), sodass unter derselben Nummer kein neuer Stream entstehen kann.

#### 5.1.4 Laden und Speichern

- **Laden:** Das `TeamRepository` liest alle Events von `team-{teamId}`, prüft sie mit ihren Zod-Schemas und erzeugt das Team über `Team.fromEvents(events)`. Es liefert das Team zusammen mit der gelesenen Revision. Existiert der Stream nicht, liefert es `TeamNotFound`.
- **Speichern:** Das Repository schreibt `team.pendingEvents` mit der gelesenen Revision als erwartetem Stream-Stand (bei einem neuen Team `NO_STREAM`). Eine abweichende Revision wird zu `ConcurrencyConflict` (siehe „Team speichern“ in den Getroffenen Entscheidungen).
- **Ein Schreibvorgang, ein Team:** Jeder Schreibvorgang verändert genau ein Team. Vorgänge, die mehrere Teams betreffen (z. B. `PlayerProfileChanged` für alle Teams eines Spielers), schreibt der Service nacheinander in jedes Team einzeln.

### 5.2 Invarianten und Regeln

Alle Regeln werden in der Klasse `Team` durchgesetzt. Die Zod-Schemas der Routen prüfen Formate zusätzlich am Eingang, maßgeblich sind aber die Regeln im Aggregate.

1. **Lebenszyklus:** Ein Team wird genau einmal über `Team.create(...)` angelegt. Nach `TeamDeleted` lehnt jede Geschäftsmethode mit `TeamDeleted` ab.
2. **Teamdaten:** Der Name ist nach Entfernen von Leerzeichen am Rand mindestens 1 Zeichen lang. Die Saison hat das Format `JJJJ_JJ`, wobei `JJ` die letzten beiden Ziffern von `JJJJ + 1` sind (z. B. `2026_27`, `2099_00`).
3. **Kader:** Ein Spieler ist höchstens einmal im Kader eines Teams. Alle kader- und bewertungsbezogenen Methoden setzen voraus, dass der Spieler im Kader ist. Doppelte Rückennummern sind erlaubt; das Frontend zeigt nur einen Hinweis.
4. **Inaktive Spieler:** Für inaktive Spieler können keine Bewertungswerte erfasst oder geändert werden. Bereits erfasste Werte bleiben erhalten.
5. **Termine:** Bewertungen gibt es nur für bestehende, nicht gelöschte Spieltage bzw. Trainings. Eine Termin-ID wird innerhalb eines Teams nur einmal vergeben.
6. **Einsatz zuerst:** Leistungswerte (Leistungsnote, Fairness, Eigenschaften, Tore, Vorlagen, Paraden, Karten, Minuten) können nur erfasst werden, wenn der Spieler als Startelf oder Eingewechselt (Spieltag) bzw. Anwesend oder Verspätet (Training) erfasst ist. Sonst lehnt die Methode mit `NotParticipating` ab.
7. **Werte verfallen:** Wird ein Spieler auf Nicht dabei bzw. Entschuldigt oder Unentschuldigt gesetzt, verfallen seine Leistungswerte für diesen Termin. Wird er danach wieder auf Startelf, Eingewechselt, Anwesend oder Verspätet gesetzt, beginnt die Erfassung leer. Der Wechsel zwischen Startelf und Eingewechselt bzw. zwischen Anwesend und Verspätet lässt die Werte unverändert. Kommentare sind keine Leistungswerte und bleiben erhalten.
8. **Wertebereiche:** Leistungsnote 1–6 in halben Schritten, Fairness 1–6 ganzzahlig, Eigenschaften 0–5 Sterne ganzzahlig aus der festen Liste `effort` (Einsatz & Laufbereitschaft), `technique` (Technik), `gameIntelligence` (Spielverständnis), `duels` (Zweikampf), `teamSpirit` (Teamgeist). Tore, Vorlagen, Paraden, gespielte Minuten, Ergebnis und Trainingsdauer sind ganze Zahlen ≥ 0, die Spieltag-Nummer ist eine ganze Zahl ≥ 1.
9. **Karten:** Jede Kartenart (Gelb, Gelb-Rot, Rot) kann je Spieler und Spieltag höchstens einmal gezeigt werden.
10. **Verfallen beim Entfernen:** Wird ein Spieler aus dem Kader entfernt, verfallen alle seine Bewertungen in diesem Team. Wird ein Spieltag bzw. Training gelöscht, verfallen alle zugehörigen Bewertungen. Wird der Spieler später erneut hinzugefügt, beginnt er ohne Bewertungen.
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

#### 5.3.3 Spieltage

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `scheduleMatch({ matchId, date, matchday?, opponent?, venue?, competition? })` | `MatchScheduled { matchId, date, matchday, opponent, venue, competition }` | 1, 5, 8 |
| `rescheduleMatch(matchId, date)` | `MatchRescheduled { matchId, date }` | 1, 5 |
| `changeMatchday(matchId, matchday)` | `MatchdayChanged { matchId, matchday }` | 1, 5, 8 |
| `removeMatchday(matchId)` | `MatchdayRemoved { matchId }` | 1, 5 |
| `changeOpponent(matchId, opponent)` | `OpponentChanged { matchId, opponent }` | 1, 5 |
| `removeOpponent(matchId)` | `OpponentRemoved { matchId }` | 1, 5 |
| `changeVenue(matchId, venue)` | `VenueChanged { matchId, venue }` (Heim, Auswärts, Neutral) | 1, 5 |
| `removeVenue(matchId)` | `VenueRemoved { matchId }` | 1, 5 |
| `changeCompetition(matchId, competition)` | `CompetitionChanged { matchId, competition }` (Liga, Pokal, Test, Turnier) | 1, 5 |
| `removeCompetition(matchId)` | `CompetitionRemoved { matchId }` | 1, 5 |
| `recordResult(matchId, goalsFor, goalsAgainst)` | `MatchResultRecorded { matchId, goalsFor, goalsAgainst }` | 1, 5, 8 |
| `clearResult(matchId)` | `MatchResultCleared { matchId }` | 1, 5 |
| `writeMatchNotes(matchId)` | `MatchNotesWritten { matchId }` (Text als Datei) | 1, 5 |
| `removeMatchNotes(matchId)` | `MatchNotesRemoved { matchId }` | 1, 5 |
| `deleteMatch(matchId)` | `MatchDeleted { matchId }` | 1, 5, 10 |

Der Gegner ist der Name eines Vereins bzw. einer Mannschaft und gilt nicht als personenbezogen.

#### 5.3.4 Trainings

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `scheduleTraining({ trainingId, date, duration, topic, focus })` | `TrainingScheduled { trainingId, date, duration, topic, focus }` | 1, 5, 8 |
| `rescheduleTraining(trainingId, date)` | `TrainingRescheduled { trainingId, date }` | 1, 5 |
| `changeTrainingDuration(trainingId, minutes)` | `TrainingDurationChanged { trainingId, minutes }` | 1, 5, 8 |
| `changeTrainingTopic(trainingId, topic)` | `TrainingTopicChanged { trainingId, topic }` | 1, 5 |
| `changeTrainingFocus(trainingId, focus)` | `TrainingFocusChanged { trainingId, focus }` | 1, 5 |
| `writeTrainingNotes(trainingId)` | `TrainingNotesWritten { trainingId }` (Text als Datei) | 1, 5 |
| `removeTrainingNotes(trainingId)` | `TrainingNotesRemoved { trainingId }` | 1, 5 |
| `deleteTraining(trainingId)` | `TrainingDeleted { trainingId }` | 1, 5, 10 |

Schwerpunkte (`focus`) stammen aus einer festen Liste: Technik, Taktik, Kondition, Torschuss, Spielform, Athletik, Standards, Torwart.

#### 5.3.5 Spielbewertung

Alle Methoden erhalten `matchId` und `playerId`; beide stehen auch in jedem Event.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `recordParticipation(matchId, playerId, participation)` | `ParticipationRecorded { participation }` (`starting`, `substitute`, `absent`) | 1, 3, 4, 5, 7 |
| `recordMinutesPlayed(matchId, playerId, minutes)` | `MinutesPlayedRecorded { minutes }` | 1, 3–6, 8 |
| `gradeMatchPerformance(matchId, playerId, grade)` | `MatchPerformanceGraded { grade }` | 1, 3–6, 8 |
| `withdrawMatchPerformanceGrade(matchId, playerId)` | `MatchPerformanceGradeWithdrawn {}` | 1, 3–6 |
| `gradeMatchFairness(matchId, playerId, grade)` | `MatchFairnessGraded { grade }` | 1, 3–6, 8 |
| `withdrawMatchFairnessGrade(matchId, playerId)` | `MatchFairnessGradeWithdrawn {}` | 1, 3–6 |
| `rateMatchAttribute(matchId, playerId, attribute, stars)` | `MatchAttributeRated { attribute, stars }` | 1, 3–6, 8 |
| `recordGoals(matchId, playerId, count)` | `GoalsRecorded { count }` | 1, 3–6, 8, 11 |
| `recordAssists(matchId, playerId, count)` | `AssistsRecorded { count }` | 1, 3–6, 8, 11 |
| `recordSaves(matchId, playerId, count)` | `SavesRecorded { count }` | 1, 3–6, 8, 11 |
| `showCard(matchId, playerId, card)` | `CardShown { card }` (`yellow`, `yellowRed`, `red`) | 1, 3–6, 9 |
| `withdrawCard(matchId, playerId, card)` | `CardWithdrawn { card }` | 1, 3–6 |
| `writeMatchComment(matchId, playerId)` | `MatchCommentWritten {}` (Text als Datei) | 1, 3, 5 |
| `removeMatchComment(matchId, playerId)` | `MatchCommentRemoved {}` | 1, 3, 5 |
| `resetMatchRating(matchId, playerId)` | `MatchRatingReset {}` (zurück auf „nicht erfasst“, Werte verfallen) | 1, 3, 5 |
| `markAllStarting(matchId)` | `ParticipationRecorded { playerId, participation: starting }` je aktivem Kaderspieler ohne erfassten Einsatz | 1, 5 |

Die gespielten Minuten werden im Frontend mit der Standard-Spielzeit des Trainers vorbelegt und wie jeder andere Wert über `recordMinutesPlayed` gespeichert.

#### 5.3.6 Trainingsbewertung

Alle Methoden erhalten `trainingId` und `playerId`; beide stehen auch in jedem Event.

| Geschäftsmethode | Event | Regeln |
|---|---|---|
| `recordAttendance(trainingId, playerId, attendance)` | `AttendanceRecorded { attendance }` (`present`, `late`, `excused`, `unexcused`) | 1, 3, 4, 5, 7 |
| `gradeTrainingPerformance(trainingId, playerId, grade)` | `TrainingPerformanceGraded { grade }` | 1, 3–6, 8 |
| `withdrawTrainingPerformanceGrade(trainingId, playerId)` | `TrainingPerformanceGradeWithdrawn {}` | 1, 3–6 |
| `gradeTrainingFairness(trainingId, playerId, grade)` | `TrainingFairnessGraded { grade }` | 1, 3–6, 8 |
| `withdrawTrainingFairnessGrade(trainingId, playerId)` | `TrainingFairnessGradeWithdrawn {}` | 1, 3–6 |
| `rateTrainingAttribute(trainingId, playerId, attribute, stars)` | `TrainingAttributeRated { attribute, stars }` | 1, 3–6, 8 |
| `writeTrainingComment(trainingId, playerId)` | `TrainingCommentWritten {}` (Text als Datei) | 1, 3, 5 |
| `removeTrainingComment(trainingId, playerId)` | `TrainingCommentRemoved {}` | 1, 3, 5 |
| `resetTrainingRating(trainingId, playerId)` | `TrainingRatingReset {}` (zurück auf „nicht erfasst“, Werte verfallen) | 1, 3, 5 |
| `markAllPresent(trainingId)` | `AttendanceRecorded { playerId, attendance: present }` je aktivem Kaderspieler ohne erfasste Anwesenheit | 1, 5 |

#### 5.3.7 Fachliche Fehler

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
| `MatchNotFound` / `TrainingNotFound` | Termin existiert nicht oder ist gelöscht. | `404` |
| `NotParticipating` | Leistungswert ohne Einsatz bzw. Anwesenheit. | `422` |
| `InvalidValue` | Wert außerhalb des erlaubten Bereichs. | `422` |
| `CardAlreadyShown` / `CardNotShown` | Karte wurde bereits gezeigt bzw. nicht gezeigt. | `422` |

Dazu kommen die Fehler aus Repository und Service: `TeamNotFound` (`404`), `ConcurrencyConflict` (`409`), `EditConflict` (`409`, Daten des Formulars wurden inzwischen geändert), `DuplicateTeam` (`409`) und `LastTeam` (`422`).

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
    match/{matchId}/
      notes.txt                     Notiz zum Spieltag
      comments/{playerId}.txt       Kommentar zur Spielbewertung
    training/{trainingId}/
      notes.txt                     Notiz zum Training
      comments/{playerId}.txt       Kommentar zur Trainingsbewertung
  trainer/{trainerId}/
    settings.json                   aktives Team, Trainingszeit, Standard-Spielzeit
```

Das Wappen ist nicht personenbezogen, wird aber ebenfalls auf dem Dateisystem abgelegt, damit die Events klein bleiben. Events vermerken nur, dass ein Wappen hochgeladen oder entfernt wurde.

#### 5.4.3 Reihenfolge von Datei und Event

- **Anlegen oder Ändern:** erst die Datei schreiben, dann das Event. Schlägt das Event fehl, bleibt höchstens eine verwaiste Datei zurück, aber nie ein Event, das auf fehlenden Inhalt verweist.
- **Entfernen:** erst das Event schreiben, dann die Datei löschen. Schlägt das Löschen fehl, wird es protokolliert (nur mit IDs) und vom nächsten Aufräumjob nachgeholt.

#### 5.4.4 Löschen

| Anlass | Was passiert |
|---|---|
| Spieler löschen (auf Anfrage) | `player/{playerId}/` und alle `comments/{playerId}.txt` in allen Teams werden gelöscht. Die Fundorte liefert das Spielerverzeichnis. Events und Kaderzugehörigkeit bleiben unverändert. |
| Spieler aus dem Kader entfernen | Nach `PlayerRemovedFromSquad` werden seine Kommentare in diesem Team gelöscht. Ist er danach in keinem Team mehr, löscht der tägliche Aufräumjob auch sein Profil. |
| Spieltag bzw. Training löschen | Nach `MatchDeleted` bzw. `TrainingDeleted` wird das Verzeichnis des Termins mit Notiz und Kommentaren gelöscht. |
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

Event Store und Datenverzeichnis werden immer gemeinsam gesichert, damit Events und Dateien zusammenpassen. Gelöschte personenbezogene Daten bleiben in älteren Backups enthalten, bis diese turnusmäßig gelöscht werden. Die Aufbewahrungsdauer wird in [8.2](#82-backups) festgelegt.

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
| Spielerverzeichnis | `playerId` | Suche nach bestehenden Spielern beim Hinzufügen zum Kader, Aufräumjob verwaiste Spieler, Löschen eines Spielers (DSGVO) |
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
| `commentLocations` | Termine (Team, Spieltag bzw. Training), zu denen ein Kommentar über den Spieler existiert |

Abfragen:

- Suche nach Spielern für „Spieler zum Kader hinzufügen“. Die Suche nach Name läuft über die Profildateien der Spieler im Verzeichnis.
- Spieler ohne Team (`teamIds` leer): Kandidaten für den täglichen Aufräumjob.
- Ablageorte der Kommentare eines Spielers: zum vollständigen Löschen seiner Dateien.

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
| `id`, `type` | Termin-ID, `match` oder `training` |
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
| Spieltag: `minutes` | gespielte Minuten |
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

### 6.1 Allgemeines

_TODO: Authentifizierung, Versionierung, Fehlerformat, Statuscodes._

### 6.2 Endpunkte

_TODO_

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

Erkennt das Frontend eine neue Revision, lädt es die aktuelle Ansicht neu. Ungespeicherte Eingaben in einem offenen Dialog bleiben dabei erhalten.

### 7.3 Gleichzeitige Änderungen

- Gleichzeitige Änderungen am selben Team erkennt das Backend über optimistisches Sperren und löst sie durch einmaliges Neuladen und erneutes Aufrufen der Geschäftsmethode (siehe „Team speichern“).
- Hat ein anderer Trainer die Daten eines Formulars geändert, seit es geöffnet wurde (z. B. die Bewertung desselben Spielers), wird das Speichern mit `409 EditConflict` abgelehnt. Der Trainer lädt neu und wiederholt seine Eingaben. So wird keine Änderung unbemerkt überschrieben.
- Wird eine Änderung fachlich abgelehnt, weil sich der Stand inzwischen geändert hat (z. B. Spieler wurde von einem anderen Trainer aus dem Kader entfernt), zeigt das Frontend die Fehlermeldung und lädt die Ansicht neu.

### 7.4 Bewusst nicht vorgesehen

Push-Benachrichtigungen (Server-Sent Events oder WebSockets) sind vorerst nicht vorgesehen. Bei wenigen gleichzeitig arbeitenden Trainern reicht Polling aus. Sollte eine sofortige Aktualisierung später nötig werden, lässt sich Polling durch Server-Sent Events ersetzen, ohne das Domänenmodell zu ändern.

## 8. Betrieb

### 8.1 Konfiguration

| Variable | Bedeutung |
|---|---|
| `KADERBLICK_TRAINERS_FILE` | Pfad zur Trainer-Konfiguration (JSON). Die Datei liegt außerhalb des Repositorys und wird nie eingecheckt. |
| `KADERBLICK_SESSION_KEY` | Schlüssel zum Signieren und Verschlüsseln des Session-Cookies. |

Aufbau der Trainer-Konfiguration (siehe [Begriffe](#2-begriffe)). Die Zugangsschlüssel stehen bewusst im Klartext in der Datei; sie ist deshalb mit restriktiven Dateirechten zu schützen.

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

_TODO_

### 8.2 Backups

_TODO_

### 8.3 Migration von Bestandsdaten

_TODO_

### 8.4 Spieler auf Anfrage löschen

_TODO: Wie der Betreiber einen Spieler findet und löscht (Umfang siehe [5.4.4](#544-löschen))._

## 9. Offene Punkte


- Keine. Weitere offene Punkte ergeben sich beim Ausarbeiten der Abschnitte mit _TODO_.
