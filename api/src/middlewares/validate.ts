import type { RequestHandler } from 'express';
import type { z } from 'zod';

interface Esquemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/** Valida body/query/params com Zod. O body validado substitui `req.body`; a query vai para `req.consulta`. */
export function validar(esquemas: Esquemas): RequestHandler {
  return (req, _res, next) => {
    if (esquemas.params) Object.assign(req.params, esquemas.params.parse(req.params));
    if (esquemas.query) req.consulta = esquemas.query.parse(req.query);
    if (esquemas.body) req.body = esquemas.body.parse(req.body ?? {});
    next();
  };
}
