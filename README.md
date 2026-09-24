# Tempo Parado — Monitoramento de Tempo Parado em Roteiros (MVP)

Sistema web para empresas de logística acompanharem **onde** e **por quanto tempo** motoristas e motoboys
ficam parados durante o roteiro diário. O gerente monta o roteiro, o motorista registra chegada e saída
em cada ponto pelo celular e o sistema calcula tempo parado, distância e custo estimado, com histórico e dashboard.

> 🚧 Em implementação — este README é atualizado a cada etapa do plano (Seção 16 da especificação).

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Back-end | Node.js 24, TypeScript 6, Express 5 |
| Front-end | React 19, Vite 8 |
| Banco de dados | PostgreSQL 17 |
| Infraestrutura | Docker + Docker Compose, Nginx (alpine) |

## Pré-requisitos

- Docker 29+ com Docker Compose v2 (testado com Docker 29.7 e Compose 5.2).
- Node.js 24 — apenas para rodar fora do Docker.

## Como executar com Docker (caminho principal)

```bash
git clone <url-do-repositorio>
cd <pasta>
cp .env.example .env        # ajustar senhas se quiser
docker compose up --build
```

- Front-end: <http://localhost:8080>
- API: <http://localhost:3000/api/health>
- Parar: `docker compose down` · Zerar o banco: `docker compose down -v`

## Usuários de teste

> ⚠️ Criados pelo seed **somente para desenvolvimento**. Troque as senhas (ou desative o seed) em produção.

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@mvp.local` | `admin123` | ADMIN |
| `gerente@mvp.local` | `gerente123` | GERENTE |
| `joao@mvp.local` | `motorista123` | MOTORISTA |
| `maria@mvp.local` | `motorista123` | MOTORISTA |
| `carlos@mvp.local` | `motorista123` | MOTORISTA |

## Variáveis de ambiente

| Variável | Descrição | Padrão (`.env.example`) |
|---|---|---|
| `POSTGRES_USER` | Usuário do PostgreSQL | `mvp` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `mvp_senha_dev` |
| `POSTGRES_DB` | Nome do banco | `mvp_tempo_parado` |
| `JWT_SECRET` | Segredo para assinar os tokens de login | `troque-este-segredo-em-producao` |
| `SEED_ON_START` | Carrega dados de exemplo na primeira subida | `true` |
| `DB_PORT` | Porta do PostgreSQL no host | `5432` |
| `API_PORT` | Porta da API no host | `3000` |
| `WEB_PORT` | Porta do front-end no host | `8080` |

## Como executar sem Docker (desenvolvimento)

Requer Node.js 24. O banco continua no Docker:

```bash
cp .env.example .env
docker compose up -d db

cd api
npm install
cp ../.env .env   # a API lê DATABASE_URL e JWT_SECRET do .env da pasta api/
echo "DATABASE_URL=postgresql://mvp:mvp_senha_dev@localhost:5432/mvp_tempo_parado" >> .env
npx prisma migrate dev
npm run seed
npm run dev        # API em http://localhost:3000

cd ../web
npm install
npm run dev        # front em http://localhost:5173 (o Vite encaminha /api para http://localhost:3000)
```

## Testes

Com o banco do Docker rodando (`docker compose up -d db`):

```bash
cd api && npm test   # unitários (domínio) + integração (Supertest)
cd web && npm test   # unitários do front-end
```

Os testes de integração recriam do zero um banco separado, `<POSTGRES_DB>_test` (ex.: `mvp_tempo_parado_test`),
no mesmo PostgreSQL, usando as credenciais e a porta (`DB_PORT`) do `.env` da raiz. Para usar outro banco,
defina `TEST_DATABASE_URL` (o nome do banco precisa terminar em `_test`).

## Documentação

- `docs/ESPECIFICACAO.md` — especificação completa do MVP.
- `docs/DECISOES.md` — decisões tomadas durante a implementação.
- `docs/diagramas/*.drawio` — diagramas UML.
