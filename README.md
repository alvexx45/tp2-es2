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

## Documentação

- `docs/ESPECIFICACAO.md` — especificação completa do MVP.
- `docs/DECISOES.md` — decisões tomadas durante a implementação.
- `docs/diagramas/*.drawio` — diagramas UML.
