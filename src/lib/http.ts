import { ZodError } from 'zod';

/** Error with an HTTP status, turned into a JSON problem response by `run`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:4318')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Echoes the Origin only when it is in CORS_ORIGINS. */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins().includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function json(req: Request, data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function noContent(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/** Answer for CORS preflight requests: export it as OPTIONS from every route. */
export function preflight(req: Request): Response {
  return noContent(req);
}

/** Runs a route handler body and maps thrown errors to JSON responses with CORS headers. */
export async function run(req: Request, handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) return json(req, { title: error.message, status: error.status }, error.status);
    if (error instanceof ZodError) {
      const errors = error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return json(req, { title: 'Datos inválidos.', status: 400, errors }, 400);
    }
    // PostgreSQL constraint errors that slipped past validation (e.g. two requests racing for a slug).
    const code = (error as { code?: string }).code;
    if (code === '23505') return json(req, { title: 'Ya existe un registro con esos datos.', status: 409 }, 409);
    if (code === '23514' || code === '22001') {
      return json(req, { title: 'Algún valor no cumple las reglas de la base de datos.', status: 400 }, 400);
    }
    console.error(error);
    return json(req, { title: 'Error interno del servidor.', status: 500 }, 500);
  }
}

/** Parses the JSON body, answering 400 instead of 500 when it is malformed. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'El cuerpo de la petición no es JSON válido.');
  }
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido.');
  return id;
}
