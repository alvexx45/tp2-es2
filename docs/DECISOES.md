# Registro de decisões de implementação

Decisões tomadas durante a implementação do MVP que complementam ou ajustam `docs/ESPECIFICACAO.md`.
Formato: data · contexto · decisão · motivo.

## D01 — Tecnologias adicionais da Seção 2.2 aprovadas
- **Data:** 2026-09-24
- **Decisão:** o usuário aprovou todas as tecnologias da Seção 2.2 (TypeScript, Express 5, Prisma 6, Zod,
  jsonwebtoken + bcrypt, Vite, React Router, TanStack Query, Recharts, Nginx, Vitest + Supertest).
- **Versões usadas:** ver `api/package.json` e `web/package.json`.

## D02 — TypeScript executado nativamente pelo Node 24 (sem `ts-node`/`tsx`)
- **Decisão:** a API é ESM (`"type": "module"`) e os imports relativos usam a extensão `.ts`.
  Em desenvolvimento o Node 24 executa os `.ts` diretamente (*type stripping* nativo);
  no build o `tsc` reescreve as extensões para `.js` (`rewriteRelativeImportExtensions`).
  O `tsconfig` usa `erasableSyntaxOnly` (sem `enum` do TypeScript nem *parameter properties*).
- **Motivo:** evita introduzir mais uma ferramenta (`tsx`/`ts-node`) fora da Seção 2.

## D03 — Portas do host configuráveis no `docker-compose.yml`
- **Decisão:** os mapeamentos de porta usam `${DB_PORT:-5432}`, `${API_PORT:-3000}` e `${WEB_PORT:-8080}`.
  Os valores padrão são os da Seção 4.1.
- **Motivo:** é comum já existir um PostgreSQL local na porta 5432; assim basta mudar o `.env`.

## D04 — CORS implementado sem biblioteca
- **Decisão:** middleware próprio de CORS que aceita apenas as origens em `CORS_ORIGIN`
  (lista separada por vírgula; padrão `http://localhost:8080,http://localhost:5173`).
- **Motivo:** Seção 11 exige CORS restrito; o pacote `cors` não está na Seção 2.
