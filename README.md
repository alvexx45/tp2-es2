# Tauko — Monitoramento de Tempo Parado em Roteiros (MVP)

Sistema web para empresas de logística acompanharem **onde** e **por quanto tempo** motoristas e motoboys
ficam parados durante o roteiro diário. O gerente monta o roteiro, o motorista registra chegada e saída
em cada ponto pelo celular e o sistema calcula tempo parado, distância e custo estimado, com histórico,
exportação CSV e dashboard por dia, mês e período.

## Tecnologias

| Camada | Tecnologia (versão usada) |
|---|---|
| Back-end | Node.js 24 LTS, TypeScript 6.0, Express 5.2, Prisma 6.19, Zod 4.6, jsonwebtoken 9 + bcrypt 6 |
| Front-end | React 19.3, Vite 8.3, React Router 7.18, TanStack Query 5, Recharts 3.10 |
| Banco de dados | PostgreSQL 17 (`postgres:17-alpine`) |
| Infraestrutura | Docker + Docker Compose, Nginx (`nginx:alpine`) |
| Testes | Vitest 5, Supertest 7 |

## Pré-requisitos

- **Docker** com **Docker Compose v2** (testado com Docker 29.7 e Compose 5.2). É tudo o que precisa para rodar.
- **Node.js 24** — apenas para rodar fora do Docker ou executar os testes.

## Como executar com Docker (caminho principal)

```bash
git clone <url-do-repositorio>
cd <pasta>
cp .env.example .env        # ajustar senhas se quiser
docker compose up --build
```

Na primeira subida a API aplica as migrations e carrega os dados de exemplo (leva cerca de 1 minuto para
construir as imagens). Quando aparecer `API ouvindo na porta 3000` no log:

- Front-end: <http://localhost:8080>
- API: <http://localhost:3000/api/health>

Parar: `docker compose down` · **Zerar o banco** (apaga todos os dados e roda o seed de novo na próxima subida):
`docker compose down -v`

## Usuários de teste

> ⚠️ Criados pelo seed **somente para desenvolvimento**. Em produção, use `SEED_ON_START=false` e crie usuários reais.

| E-mail | Senha | Perfil | O que vê |
|---|---|---|---|
| `admin@mvp.local` | `admin123` | ADMIN | tudo, inclusive gerentes, usuários e auditoria |
| `gerente@mvp.local` | `gerente123` | GERENTE | dashboard, roteiros, histórico e cadastros da própria equipe |
| `joao@mvp.local` | `motorista123` | MOTORISTA | roteiro do dia (tela de celular) e os próprios roteiros |
| `maria@mvp.local` | `motorista123` | MOTORISTA | idem |
| `carlos@mvp.local` | `motorista123` | MOTORISTA | idem |

O seed cria também os roteiros A, B e C do exemplo da especificação (data de ontem) e 90 dias de histórico
aleatório para o dashboard. Para testar a tela do motorista, entre como gerente, crie um roteiro para hoje em
**Roteiros → Novo roteiro** e depois entre como o motorista.

## Variáveis de ambiente

Arquivo `.env` na raiz (copiado de `.env.example`), lido pelo `docker-compose.yml`:

| Variável | Descrição | Padrão |
|---|---|---|
| `POSTGRES_USER` | Usuário do PostgreSQL | `mvp` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `mvp_senha_dev` |
| `POSTGRES_DB` | Nome do banco | `mvp_tempo_parado` |
| `JWT_SECRET` | Segredo que assina os tokens de login — **troque em produção** | `troque-este-segredo-em-producao` |
| `SEED_ON_START` | Carrega os dados de exemplo na subida da API (só na primeira vez) | `true` |
| `DB_PORT` | Porta do PostgreSQL no computador | `5432` |
| `API_PORT` | Porta da API no computador | `3000` |
| `WEB_PORT` | Porta do front-end no computador | `8080` |

Para rodar a API fora do Docker há também `api/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`).

## Como executar sem Docker (desenvolvimento)

Requer Node.js 24. O banco continua no Docker:

```bash
cp .env.example .env
docker compose up -d db

cd api
npm install
cp .env.example .env      # ajuste a porta do DATABASE_URL se mudou DB_PORT
npx prisma migrate dev    # aplica as migrations (e roda o seed na primeira vez)
npm run seed              # idempotente: não faz nada se o seed já rodou
npm run dev               # API em http://localhost:3000 (reinicia ao salvar arquivos)

# em outro terminal
cd web
npm install
npm run dev               # front em http://localhost:5173
```

O Vite (porta **5173**) encaminha as chamadas `/api` para `http://localhost:3000`. Se a API do Docker estiver
rodando, pare-a antes (`docker compose stop api web`), pois ela também usa a porta 3000.

## Scripts disponíveis

**`api/`**

| Script | O que faz |
|---|---|
| `npm run dev` | API em modo desenvolvimento (Node 24 executa o TypeScript direto, com `--watch`) |
| `npm run build` | Compila para `dist/` |
| `npm start` | Executa a versão compilada (`dist/server.js`) |
| `npm test` | Testes unitários e de integração |
| `npm run test:carga` | Teste de desempenho RNF03 (cria a massa de carga no banco de teste) |
| `npm run lint` | ESLint + verificação do Prettier |
| `npm run format` | Formata o código com o Prettier |
| `npm run seed` | Seed da Seção 12 (idempotente) |
| `npm run seed:carga` | Massa para desempenho: 20 motoristas × 12 meses × 8 paradas (~42 mil paradas) |
| `npm run migrate:dev` / `migrate:deploy` | Migrations do Prisma |

**`web/`**

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento do Vite (porta 5173) |
| `npm run build` | Verifica os tipos e gera o build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm test` | Testes unitários do front-end |
| `npm run lint` | ESLint + verificação do Prettier |

## Testes

Com o banco do Docker rodando (`docker compose up -d db`):

```bash
cd api
npm test             # 81 testes: domínio (unitários) + API (integração com Supertest)
npm run test:carga   # RNF03: /dashboard/periodo de 12 meses com ~42 mil paradas deve responder em < 3 s

cd ../web
npm test             # formatação de tempo, data e moeda
```

Os testes de integração recriam do zero um banco separado, `<POSTGRES_DB>_test` (ex.: `mvp_tempo_parado_test`),
no mesmo PostgreSQL, usando usuário, senha e porta (`DB_PORT`) do `.env` da raiz — o banco do sistema não é
tocado. Para usar outro servidor, defina `TEST_DATABASE_URL` (o nome do banco precisa terminar em `_test`).

Para ver o desempenho no próprio sistema: `cd api && cp .env.example .env && npm run seed:carga` e abra o
dashboard → **Período → 12 meses**. (Na medição de referência a consulta levou ~0,1 s.)

## Testar no celular

1. Suba o sistema com Docker e descubra o IP do computador na rede local (`ip addr` no Linux, `ipconfig` no
   Windows, Ajustes de Rede no macOS) — por exemplo `192.168.0.10`.
2. Com o celular **na mesma rede Wi-Fi**, abra `http://192.168.0.10:8080` e entre com um motorista.
3. Se não abrir, libere a porta 8080 no firewall do computador.

> **GPS:** o navegador só libera a localização em **HTTPS ou `localhost`**. Pelo IP da rede local (HTTP) o GPS fica
> indisponível — o registro de chegada/saída continua funcionando normalmente, só sem as coordenadas. Em produção,
> configure HTTPS no Nginx.

## Estrutura de pastas

```
/
├── docker-compose.yml, .env.example
├── docs/            especificação, decisões e diagramas
├── api/             back-end (Node.js + Express + Prisma)
│   ├── prisma/      schema.prisma, migrations/, seed.ts
│   └── src/
│       ├── server.ts, app.ts, config/, db/
│       ├── middlewares/   autenticar, exigirPerfil, validar (Zod), errorHandler
│       ├── modules/       auth, usuarios, gerentes, motoristas, veiculos, pontos, roteiros,
│       │                  historico, dashboard, parametros, auditoria (routes → controller → service)
│       ├── domain/        regras puras: tempo parado, distância, custo, validações de roteiro
│       ├── seed/          seed da Seção 12 e massa de carga
│       └── tests/         unit/, integracao/, carga/
└── web/             front-end (React + Vite), servido pelo Nginx
    └── src/
        ├── api/           cliente HTTP e hooks TanStack Query
        ├── auth/          contexto de login e rotas protegidas
        ├── components/    componentes, charts/ (Recharts), geo/ (geolocalização)
        ├── pages/         Login, motorista/, gerente/, admin/
        └── styles/        CSS (mobile-first)
```

## Documentação

- [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md) — especificação completa do MVP (fonte da verdade).
- [`docs/DECISOES.md`](docs/DECISOES.md) — decisões tomadas durante a implementação.
- `docs/diagramas/*.drawio` — casos de uso, robustez, classes, componentes e execução.
  Para visualizar, abra em <https://app.diagrams.net> (**Arquivo → Abrir de → Dispositivo**) ou use a extensão
  **Draw.io Integration** do VS Code. O `robustez.drawio` tem várias páginas (abas na parte de baixo do editor).

## Problemas comuns

**Porta já em uso** (`bind: address already in use` para 5432, 3000 ou 8080) — já existe outro serviço usando a
porta (ex.: um PostgreSQL instalado no computador). Mude a porta no `.env` e suba de novo:

```bash
DB_PORT=55432     # ou API_PORT / WEB_PORT
```

Os valores entram no mapeamento `ports` do `docker-compose.yml` (`"${DB_PORT:-5432}:5432"`); dentro da rede do
Docker as portas continuam as mesmas. Se mudar `WEB_PORT`, o front passa a abrir em `http://localhost:<WEB_PORT>`.

**A API sobe antes do banco / "Can't reach database server"** — o serviço `db` tem um *healthcheck*
(`pg_isready`) e a API só inicia quando ele fica saudável (`depends_on: condition: service_healthy`). Na primeira
subida o PostgreSQL demora alguns segundos para criar o banco; aguarde. Se o banco não ficar saudável, veja
`docker compose logs db` (geralmente senha/usuário alterados depois que o volume já existia — use
`docker compose down -v` para recriar).

**O seed não roda de novo** — é proposital: o seed é idempotente e só executa se o usuário `admin@mvp.local` ainda
não existe, para não duplicar dados a cada reinício. Para recomeçar do zero, apague o volume do banco:
`docker compose down -v && docker compose up --build`.

**Tela em branco ou dados antigos depois de atualizar o código** — reconstrua as imagens: `docker compose up --build`.
