import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

/** Problem Details nach RFC 9457 (Spezifikation 6.1.5). */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: { field: string; message: string }[];
  currentValue?: unknown;
};

const VALIDATION_ERROR = { type: 'ValidationError', title: 'Die Eingabe ist ungültig.' };
const NOT_FOUND = { type: 'NotFound', title: 'Die Ressource existiert nicht.' };
const INTERNAL_ERROR = { type: 'InternalError', title: 'Ein unerwarteter Fehler ist aufgetreten.' };

/** Fehler, die Fastify selbst vor dem Handler erzeugt (z. B. zu großer Body, falscher Content-Type). */
const requestErrors = new Map([
  [404, NOT_FOUND],
  [413, { type: 'PayloadTooLarge', title: 'Die Anfrage ist zu groß.' }],
  [415, { type: 'UnsupportedMediaType', title: 'Das Format der Anfrage wird nicht unterstützt.' }],
]);
const OTHER_REQUEST_ERROR = { type: 'RequestError', title: 'Die Anfrage kann nicht verarbeitet werden.' };

export function sendProblem(reply: FastifyReply, problem: ProblemDetails): FastifyReply {
  return reply.code(problem.status).type('application/problem+json').send(problem);
}

function fieldOf(instancePath: string, validationContext: string | undefined): string {
  const path = instancePath.replace(/^\//, '').replaceAll('/', '.');
  return path || (validationContext ?? '');
}

async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return sendProblem(reply, {
        ...VALIDATION_ERROR,
        status: 400,
        detail: `Die Anfrage entspricht nicht dem Schema (${error.validationContext ?? 'request'}).`,
        errors: error.validation.map((issue) => ({
          field: fieldOf(issue.instancePath, error.validationContext),
          message: issue.message ?? 'ungültig',
        })),
      });
    }

    const status = error.statusCode ?? 500;
    if (status === 400) {
      // z. B. ungültiges JSON im Body
      return sendProblem(reply, { ...VALIDATION_ERROR, status, detail: error.message, errors: [] });
    }
    if (status >= 400 && status < 500) {
      return sendProblem(reply, { ...(requestErrors.get(status) ?? OTHER_REQUEST_ERROR), status, detail: error.message });
    }

    // Keine internen Details nach außen; protokolliert wird mit Request-ID.
    request.log.error({ err: error }, 'Unerwarteter Fehler');
    return sendProblem(reply, {
      ...INTERNAL_ERROR,
      status: 500,
      detail: 'Die Anfrage konnte nicht verarbeitet werden.',
    });
  });

  fastify.setNotFoundHandler((request, reply) =>
    sendProblem(reply, { ...NOT_FOUND, status: 404, detail: `Kein Endpunkt für ${request.method} ${request.url}.` }),
  );
}

export default fp(errorHandler, { name: 'kaderblick-error-handler' });
