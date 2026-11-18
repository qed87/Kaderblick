# Validierung mit Zod

- Sämtliche Input-Validierung (`body`, `querystring`, `params`, `headers`) erfolgt über [Zod](https://zod.dev/) – keine handgeschriebenen JSON-Schemas, kein Ajv direkt, keine manuelle Prüfung im Handler.
- Zod wird über [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod) an Fastify angebunden: `validatorCompiler` und `serializerCompiler` werden einmalig beim Aufbau der App gesetzt, Zod-Schemas stehen direkt im `schema`-Objekt der Route.
- Auch `response`-Schemas werden mit Zod definiert. Sie sind Pflicht, damit keine internen Felder nach außen gelangen.
- Wiederverwendbare Schemas liegen in `src/schemas/`; Typen werden per `z.infer<...>` abgeleitet statt doppelt gepflegt.
- Validierungsfehler werden im zentralen Error-Handler einheitlich als `400` mit verständlicher Fehlerbeschreibung zurückgegeben.
- Außerhalb von Routen (z. B. Nachrichten aus Queues, externe API-Antworten) wird mit `schema.safeParse()` validiert und das Ergebnis in ein `Result` überführt, nie mit `parse()` und Exception.
