# Fehlerbehandlung mit Result-Types (neverthrow)

- Erwartbare Fehler werden über Result-Types kommuniziert, nicht über Exceptions. Dafür wird [neverthrow](https://github.com/supermacro/neverthrow) verwendet.
- Funktionen, die fachlich fehlschlagen können, geben `Result<T, E>` zurück, asynchrone Funktionen `ResultAsync<T, E>`. Kein `throw` für Fälle wie „nicht gefunden“, „ungültiger Zustand“ oder „Zugriff verweigert“.
- Fehler sind getypte, unterscheidbare Objekte (Discriminated Unions mit einem `type`-Feld), keine generischen `Error`-Instanzen oder Strings. Jedes Modul definiert seine eigenen Fehlertypen.
- Code, der Exceptions werfen kann (Bibliotheken, I/O, `JSON.parse`, DB-Clients), wird an der Grenze mit `Result.fromThrowable` bzw. `ResultAsync.fromPromise` eingewickelt und in einen getypten Fehler übersetzt.
- Verkettung über `map`, `mapErr`, `andThen` und `orElse` statt verschachtelter `if (result.isErr())`-Blöcke. Für mehrere unabhängige Results `Result.combine` verwenden.
- `_unsafeUnwrap()` und `_unsafeUnwrapErr()` sind nur in Tests erlaubt.
- Ein zurückgegebenes `Result` darf nie ignoriert werden. Das wird über `eslint-plugin-neverthrow` (Regel `must-use-result`) abgesichert.
- `throw` bleibt Programmierfehlern und nicht behebbaren Zuständen vorbehalten (z. B. ungültige Konfiguration beim Start).
