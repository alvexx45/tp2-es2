# ESPECIFICAÇÃO DE IMPLEMENTAÇÃO — MVP de Monitoramento de Tempo Parado em Roteiros

> **Para o Claude Code:** este documento é a fonte da verdade para implementar o MVP.
> Leia-o inteiro antes de começar. Siga a ordem da **Seção 16 (Plano de implementação)**.
> Os diagramas `casos_de_uso.drawio`, `robustez.drawio` (uma página por caso de uso + legenda), `classes.drawio`, `componentes.drawio` e `execucao.drawio` (formato draw.io / diagrams.net) ficam na pasta `docs/diagramas/`. São XML — o Claude Code pode lê-los como texto se precisar conferir nomes de classes, componentes ou relações.
> Em caso de conflito, **este documento prevalece** sobre os diagramas.
> **Não introduza nenhuma tecnologia fora da Seção 2** sem registrar a decisão em `docs/DECISOES.md`.

---

## 1. Visão geral

Empresas de logística precisam saber **onde** e **por quanto tempo** seus profissionais de campo ficam parados durante o roteiro diário. O sistema:

1. cadastra motoristas/motoboys, gerentes/coordenadores, veículos e pontos (endereços com coordenadas);
2. permite ao gerente montar o **roteiro diário** (sequência ordenada de pontos para 1 motorista em 1 data);
3. permite ao motorista registrar **chegada** e **saída** em cada ponto pelo celular;
4. calcula automaticamente o **tempo parado** por ponto e por roteiro, e o **custo estimado** do trajeto;
5. exibe **histórico** e **dashboard** com gráficos por **dia**, **mês** e **período**.

### Fora do escopo (NÃO implementar)
- Roteirização automática ou otimização de rotas.
- Integração com folha de pagamento ou ERP.
- Rastreamento em tempo real / telemetria embarcada.
- App nativo publicado em loja (o app é **web responsivo**).
- Geocodificação automática de endereços via API externa (coordenadas são digitadas ou capturadas pelo GPS do navegador).

---

## 2. Stack tecnológica

### 2.1 Tecnologias pedidas
| Camada | Tecnologia |
|---|---|
| Back-end | **Node.js 24 LTS** |
| Front-end | **React 19** |
| Banco de dados | **PostgreSQL 17** |
| Infraestrutura | **Docker + Docker Compose** |

### 2.2 Tecnologias adicionais (⚠️ precisam de aprovação do usuário)
| Tecnologia | Onde | Por que é necessária | Alternativa sem ela |
|---|---|---|---|
| **TypeScript** | api e web | Tipagem evita erros nos cálculos e nos contratos da API | JavaScript puro |
| **Express 5** | api | Framework HTTP (rotas, middlewares) | `node:http` puro (muito mais código) |
| **Prisma 6** (ORM + migrations) | api | Schema versionado, migrations e queries tipadas | `pg` + SQL manual + migrations à mão |
| **Zod** | api e web | Validação dos dados de entrada | Validação manual |
| **jsonwebtoken + bcrypt** | api | Login com JWT e hash de senha (RNF04) | Sessão em memória (não recomendado) |
| **Vite** | web | Build/dev server do React | — (padrão atual do ecossistema React) |
| **React Router** | web | Navegação entre telas | Renderização condicional manual |
| **TanStack Query** | web | Cache e estado das chamadas à API | `useEffect` + `fetch` manual |
| **Recharts** | web | Gráficos do dashboard (RF08) | Chart.js ou SVG manual |
| **Nginx** | container web | Servir o build do React e fazer proxy de `/api` | Servir estáticos pelo Express |
| **Vitest + Supertest** | api e web | Testes unitários e de integração | Jest |

**Não usar:** bibliotecas de UI pesadas (MUI, Ant), Redux, Tailwind, bibliotecas de drag-and-drop, bibliotecas de CSV/PDF. CSS puro com media queries; reordenação de pontos com botões ↑/↓; CSV gerado à mão.

---

## 3. Estrutura do repositório (monorepo)

```
/
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── ESPECIFICACAO.md          (este arquivo)
│   ├── DECISOES.md               (registro de decisões tomadas durante a implementação)
│   └── diagramas/
│       ├── casos_de_uso.drawio
│       ├── robustez.drawio
│       ├── classes.drawio
│       ├── componentes.drawio
│       └── execucao.drawio
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── server.ts             (bootstrap do Express)
│       ├── app.ts                (montagem de rotas/middlewares — exportado para testes)
│       ├── config/env.ts
│       ├── db/prisma.ts          (instância única do Prisma Client)
│       ├── middlewares/          (auth, rbac, errorHandler, validate)
│       ├── modules/
│       │   ├── auth/
│       │   ├── usuarios/
│       │   ├── motoristas/
│       │   ├── gerentes/
│       │   ├── veiculos/
│       │   ├── pontos/
│       │   ├── roteiros/         (montagem, coleta, finalização)
│       │   ├── historico/
│       │   ├── dashboard/
│       │   ├── parametros/
│       │   └── auditoria/
│       ├── domain/               (regras puras, SEM acesso a banco — 100% testáveis)
│       │   ├── tempoParado.ts
│       │   ├── distancia.ts
│       │   └── custo.ts
│       └── tests/
└── web/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── api/                  (cliente HTTP + hooks TanStack Query)
        ├── auth/                 (contexto de autenticação, rotas protegidas)
        ├── components/
        ├── pages/
        │   ├── Login.tsx
        │   ├── motorista/
        │   ├── gerente/
        │   └── admin/
        └── styles/
```

Cada módulo da API segue: `*.routes.ts` → `*.controller.ts` → `*.service.ts` → Prisma. Os **controllers** correspondem aos *controls* do diagrama de robustez; as **páginas React** correspondem aos *boundaries*; os **models Prisma** correspondem às *entities*.

### 3.1 Componentes (`docs/diagramas/componentes.drawio`)

| Componente | Pasta | Responsabilidade | Depende de |
|---|---|---|---|
| Páginas | `web/src/pages/` | Telas (boundaries) | Gráficos, Auth, Cliente API, Geolocalização |
| Gráficos | `web/src/components/charts/` | Wrappers dos gráficos Recharts do dashboard | — |
| Auth (web) | `web/src/auth/` | Contexto do usuário logado, token, rotas protegidas por perfil | Cliente API |
| Cliente API | `web/src/api/` | Único ponto de acesso HTTP; injeta `Authorization`; hooks TanStack Query | interface **REST /api** |
| Geolocalização | `web/src/components/geo/` | Wrapper de `navigator.geolocation` (opcional, tolera permissão negada) | — |
| Middlewares | `api/src/middlewares/` | `autenticar`, `exigirPerfil`, `validar` (Zod), `errorHandler` | Módulos |
| Módulos | `api/src/modules/*` | auth, cadastros, roteiros, historico, dashboard, parametros, auditoria | Domínio, Prisma Client |
| Domínio | `api/src/domain/` | Regras puras RN01–RN07 (tempo parado, distância, custo) | **nada** (sem banco, sem HTTP) |
| Prisma Client | `api/src/db/prisma.ts` | Instância única do ORM | interface **SQL** (PostgreSQL) |

**Regras de dependência (obrigatórias):**
- Front-end só fala com o back-end pelo **Cliente API**; nenhuma página chama `fetch` direto.
- `domain/` não importa nada de `modules/`, `express` ou `@prisma/client`.
- Módulo `roteiros` usa `parametros` (parâmetro vigente) e `auditoria` (registro) pelos **services**, nunca pelas rotas HTTP.
- Módulo `dashboard` é o único que usa `$queryRaw` (agregações).
- Nenhum módulo acessa tabela de outro módulo para **escrita**; leitura cruzada é permitida via Prisma.

---

## 4. Docker

### 4.1 `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      TZ: America/Sao_Paulo
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      retries: 10

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 8h
      TZ: America/Sao_Paulo
      PORT: 3000
      SEED_ON_START: ${SEED_ON_START:-true}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"

  web:
    build: ./web
    depends_on:
      - api
    ports:
      - "8080:80"

volumes:
  pgdata:
```

### 4.2 Regras
- `api/Dockerfile`: multi-stage (`node:24-alpine`); no start executa `prisma migrate deploy`, depois o seed se `SEED_ON_START=true` e o seed ainda não rodou (idempotente), depois `node dist/server.js`.
- `web/Dockerfile`: multi-stage — build com `node:24-alpine` + Vite; runtime com `nginx:alpine`.
- `web/nginx.conf`: serve `/` com fallback para `index.html` (SPA) e faz `proxy_pass http://api:3000` para `/api/`.
- `.env.example` com `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `SEED_ON_START`.
- Critério: `docker compose up --build` sobe tudo do zero; app em `http://localhost:8080`.

### 4.3 Execução / implantação (`docs/diagramas/execucao.drawio`)

| Nó | Tipo | O que roda | Comunica com |
|---|---|---|---|
| Celular do motorista | device → navegador móvel | SPA React (tela `/motorista`) + GPS | container `web` via HTTP(S) :8080 |
| Computador do gerente/admin | device → navegador desktop | SPA React (dashboard, cadastros) | container `web` via HTTP(S) :8080 |
| `web` | container `nginx:alpine` (8080→80) | `dist/` do Vite + `nginx.conf` | `api` via HTTP na rede interna Docker (`/api/*`) |
| `api` | container `node:24-alpine` (3000) | `dist/server.js`, migrations e seed | `db` via TCP 5432 |
| `db` | container `postgres:17-alpine` (5432) | banco do MVP | volume `pgdata` |

- O navegador **nunca** acessa `api` ou `db` diretamente: tudo passa pelo Nginx (mesma origem → sem problema de CORS em produção).
- As portas 3000 e 5432 ficam expostas só para desenvolvimento; em produção, remova o mapeamento de `ports` de `api` e `db`.
- Ordem de subida: `db` (healthcheck) → `api` (`migrate deploy` → seed → servidor) → `web`.
- HTTPS em produção: terminar TLS no Nginx (certificado fora do escopo do MVP; em desenvolvimento, HTTP). Observação: `navigator.geolocation` só funciona em **HTTPS ou `localhost`** — para testar no celular pela rede local sem HTTPS, o GPS fica indisponível (o registro de horário continua funcionando).

---

## 5. Modelo de dados

**RNF01:** tudo é persistido no PostgreSQL (volume Docker `pgdata`). Nenhum roteiro, parada ou log é apagado fisicamente — cadastros são **inativados** (`ativo = false`) e roteiros são **cancelados**, garantindo o histórico completo.

### 5.1 Diferenças em relação à Seção 8 do documento de requisitos (decisões de projeto)
| Documento original | Implementação | Motivo |
|---|---|---|
| `Ponto` com endereço **e** horários | Separado em **`Ponto`** (endereço cadastrado, reutilizável — RF03) e **`PontoRoteiro`** (parada de um roteiro: ordem, chegada, saída, tempo) | Um mesmo endereço aparece em vários roteiros; sem separar, o endereço seria duplicado a cada dia |
| "veículo" e "km/litro" dentro do Motorista | Entidade **`Veiculo`** (placa, modelo, tipo, km/litro) | O rendimento é do veículo, não da pessoa; o veículo pode trocar de motorista |
| Parâmetros como registro único | **`ParametroSistema` versionado** (`vigenteDesde`) | Alterar o preço do combustível hoje não pode mudar o custo de roteiros passados |
| — | **`Usuario`** (login e perfil) e **`LogAuditoria`** | Exigidos por RNF04 e RNF05 |

### 5.2 `api/prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Perfil {
  MOTORISTA
  GERENTE
  ADMIN
}

enum CargoGestor {
  GERENTE
  COORDENADOR
  DONO
}

enum TipoVeiculo {
  MOTO
  CARRO
  VAN
  CAMINHAO
}

enum StatusRoteiro {
  PLANEJADO
  EM_ANDAMENTO
  FINALIZADO
  CANCELADO
}

enum AcaoAuditoria {
  CRIACAO
  ALTERACAO
  EXCLUSAO
}

model Usuario {
  id        String         @id @default(uuid()) @db.Uuid
  email     String         @unique
  senhaHash String         @map("senha_hash")
  perfil    Perfil
  ativo     Boolean        @default(true)
  criadoEm  DateTime       @default(now()) @map("criado_em") @db.Timestamptz(3)
  motorista Motorista?
  gerente   Gerente?
  logs      LogAuditoria[]

  @@map("usuarios")
}

model Gerente {
  id        String      @id @default(uuid()) @db.Uuid
  nome      String
  telefone  String
  email     String      @unique
  cargo     CargoGestor @default(GERENTE)
  ativo     Boolean     @default(true)
  usuarioId String?     @unique @map("usuario_id") @db.Uuid
  usuario   Usuario?    @relation(fields: [usuarioId], references: [id])
  equipe    Motorista[]
  roteiros  Roteiro[]

  @@map("gerentes")
}

model Motorista {
  id          String    @id @default(uuid()) @db.Uuid
  nome        String
  telefone    String?
  documento   String?   @unique
  ativo       Boolean   @default(true)
  anonimizado Boolean   @default(false)
  gerenteId   String    @map("gerente_id") @db.Uuid
  gerente     Gerente   @relation(fields: [gerenteId], references: [id])
  veiculoId   String?   @map("veiculo_id") @db.Uuid
  veiculo     Veiculo?  @relation(fields: [veiculoId], references: [id])
  usuarioId   String?   @unique @map("usuario_id") @db.Uuid
  usuario     Usuario?  @relation(fields: [usuarioId], references: [id])
  roteiros    Roteiro[]

  @@index([gerenteId])
  @@map("motoristas")
}

model Veiculo {
  id         String      @id @default(uuid()) @db.Uuid
  placa      String      @unique
  modelo     String
  tipo       TipoVeiculo
  kmPorLitro Decimal     @map("km_por_litro") @db.Decimal(6, 2)
  ativo      Boolean     @default(true)
  motoristas Motorista[]
  roteiros   Roteiro[]

  @@map("veiculos")
}

model Ponto {
  id        String         @id @default(uuid()) @db.Uuid
  descricao String?
  endereco  String
  latitude  Decimal        @db.Decimal(9, 6)
  longitude Decimal        @db.Decimal(9, 6)
  ativo     Boolean        @default(true)
  criadoEm  DateTime       @default(now()) @map("criado_em") @db.Timestamptz(3)
  paradas   PontoRoteiro[]

  @@index([endereco])
  @@map("pontos")
}

model Roteiro {
  id                  String            @id @default(uuid()) @db.Uuid
  data                DateTime          @db.Date
  status              StatusRoteiro     @default(PLANEJADO)
  motoristaId         String            @map("motorista_id") @db.Uuid
  motorista           Motorista         @relation(fields: [motoristaId], references: [id])
  gerenteId           String            @map("gerente_id") @db.Uuid
  gerente             Gerente           @relation(fields: [gerenteId], references: [id])
  veiculoId           String?           @map("veiculo_id") @db.Uuid
  veiculo             Veiculo?          @relation(fields: [veiculoId], references: [id])
  parametroId         String?           @map("parametro_id") @db.Uuid
  parametro           ParametroSistema? @relation(fields: [parametroId], references: [id])
  kmInformado         Decimal?          @map("km_informado") @db.Decimal(8, 2)
  distanciaTotalKm    Decimal?          @map("distancia_total_km") @db.Decimal(8, 2)
  tempoTotalParadoMin Int               @default(0) @map("tempo_total_parado_min")
  custoEstimado       Decimal?          @map("custo_estimado") @db.Decimal(10, 2)
  percentualJornada   Decimal?          @map("percentual_jornada") @db.Decimal(5, 2)
  finalizadoEm        DateTime?         @map("finalizado_em") @db.Timestamptz(3)
  criadoEm            DateTime          @default(now()) @map("criado_em") @db.Timestamptz(3)
  pontos              PontoRoteiro[]

  @@index([data])
  @@index([motoristaId, data])
  @@map("roteiros")
}

model PontoRoteiro {
  id             String    @id @default(uuid()) @db.Uuid
  roteiroId      String    @map("roteiro_id") @db.Uuid
  roteiro        Roteiro   @relation(fields: [roteiroId], references: [id], onDelete: Cascade)
  pontoId        String    @map("ponto_id") @db.Uuid
  ponto          Ponto     @relation(fields: [pontoId], references: [id])
  ordem          Int
  codigoPedido   String?   @map("codigo_pedido")
  chegadaEm      DateTime? @map("chegada_em") @db.Timestamptz(3)
  saidaEm        DateTime? @map("saida_em") @db.Timestamptz(3)
  tempoParadoMin Int?      @map("tempo_parado_min")
  latRegistro    Decimal?  @map("lat_registro") @db.Decimal(9, 6)
  longRegistro   Decimal?  @map("long_registro") @db.Decimal(9, 6)

  @@unique([roteiroId, ordem])
  @@index([pontoId])
  @@map("pontos_roteiro")
}

model ParametroSistema {
  id                    String    @id @default(uuid()) @db.Uuid
  vigenteDesde          DateTime  @default(now()) @map("vigente_desde") @db.Timestamptz(3)
  valorCombustivelLitro Decimal   @map("valor_combustivel_litro") @db.Decimal(8, 3)
  kmPorLitroPadrao      Decimal   @map("km_por_litro_padrao") @db.Decimal(6, 2)
  custoOperacionalPorKm Decimal   @default(0) @map("custo_operacional_por_km") @db.Decimal(8, 3)
  fatorCorrecaoRota     Decimal   @default(1.3) @map("fator_correcao_rota") @db.Decimal(4, 2)
  jornadaPadraoHoras    Decimal   @default(8) @map("jornada_padrao_horas") @db.Decimal(4, 2)
  tempoMinimoParadaMin  Int       @default(0) @map("tempo_minimo_parada_min")
  limiteAlertaParadaMin Int       @default(60) @map("limite_alerta_parada_min")
  criadoPorId           String?   @map("criado_por_id") @db.Uuid
  roteiros              Roteiro[]

  @@index([vigenteDesde])
  @@map("parametros_sistema")
}

model LogAuditoria {
  id            String        @id @default(uuid()) @db.Uuid
  entidade      String
  entidadeId    String        @map("entidade_id") @db.Uuid
  acao          AcaoAuditoria
  valorAnterior Json?         @map("valor_anterior")
  valorNovo     Json?         @map("valor_novo")
  usuarioId     String        @map("usuario_id") @db.Uuid
  usuario       Usuario       @relation(fields: [usuarioId], references: [id])
  dataHora      DateTime      @default(now()) @map("data_hora") @db.Timestamptz(3)

  @@index([entidade, entidadeId])
  @@index([dataHora])
  @@map("logs_auditoria")
}
```

> **Use Prisma 6.x** (`prisma@^6` e `@prisma/client@^6`). Este schema foi validado no Prisma 6.19. O Prisma 7 não aceita mais `url` no bloco `datasource` (exige `prisma.config.ts` + driver adapter) — não atualize para a 7 sem registrar em `docs/DECISOES.md`.

### 5.3 Migration SQL adicional (criar manualmente após a migration inicial)
O Prisma não suporta índice único parcial. Criar uma migration com:
```sql
-- RN05: um roteiro ativo por motorista por data (roteiros cancelados não contam)
CREATE UNIQUE INDEX roteiro_motorista_data_ativo
  ON roteiros (motorista_id, data)
  WHERE status <> 'CANCELADO';

-- Validações de domínio no banco (defesa em profundidade)
ALTER TABLE pontos_roteiro ADD CONSTRAINT ck_ordem_positiva CHECK (ordem >= 1);
ALTER TABLE pontos_roteiro ADD CONSTRAINT ck_saida_apos_chegada
  CHECK (saida_em IS NULL OR chegada_em IS NULL OR saida_em >= chegada_em);
ALTER TABLE pontos ADD CONSTRAINT ck_lat CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE pontos ADD CONSTRAINT ck_long CHECK (longitude BETWEEN -180 AND 180);
ALTER TABLE veiculos ADD CONSTRAINT ck_km_litro CHECK (km_por_litro > 0);
```

---

## 6. Regras de negócio e algoritmos

Implementar em `api/src/domain/` como **funções puras** (sem banco), cobertas por testes unitários.

### 6.1 Tempo parado por ponto — RN01, RN02, RF06, RF10
```
função calcularTempoParado(pr: PontoRoteiro, p: ParametroSistema): inteiro | nulo
  se pr.ordem = 1:                      retorna nulo        // RN01 — partida não conta (regra FIXA, não parametrizável)
  se pr.chegadaEm ou pr.saidaEm é nulo: retorna nulo        // ainda não concluído
  minutos ← arredondar((pr.saidaEm − pr.chegadaEm) em segundos / 60)   // RN02
  se minutos < p.tempoMinimoParadaMin:  retorna 0           // RF10 — paradas curtas desconsideradas
  retorna minutos
```
- `limiteAlertaParadaMin` **não altera o cálculo**; só marca a parada como "alerta" no histórico/dashboard.

### 6.2 Tempo total parado do roteiro — RN03
```
tempoTotalParadoMin = Σ tempoParadoMin dos PontoRoteiro com ordem > 1 e tempoParadoMin não nulo
```
Recalcular e gravar **a cada** registro de chegada/saída ou correção de horário (mesma transação).

### 6.3 Percentual da jornada — RN04
```
percentualJornada = tempoTotalParadoMin / (jornadaPadraoHoras × 60) × 100     (2 casas, arredondamento half-up)
```
Agregado (mês/período): `Σ tempoParado / (nº de roteiros considerados × jornadaPadraoHoras × 60) × 100`.

### 6.4 Distância do roteiro — RN07
```
se roteiro.kmInformado não é nulo:  distancia ← kmInformado            // odômetro informado pelo motorista tem prioridade
senão: distancia ← Σ haversine(ponto[i], ponto[i+1]) para i = 1..n−1  × fatorCorrecaoRota
distanciaTotalKm ← arredondar(distancia, 2)
```
- Haversine com raio da Terra = 6371 km.
- `fatorCorrecaoRota` (padrão 1,3) compensa o fato de a linha reta ser menor que o trajeto real pelas ruas. **Não é roteirização** (fora do escopo) — é só uma estimativa.

### 6.5 Custo estimado — RN07, RF11
```
kmPorLitro       ← roteiro.veiculo.kmPorLitro ?? parametro.kmPorLitroPadrao
custoPorKm       ← parametro.valorCombustivelLitro / kmPorLitro + parametro.custoOperacionalPorKm
custoEstimado    ← arredondar(distanciaTotalKm × custoPorKm, 2)
```
- `custoOperacionalPorKm` = custos por km além do combustível (manutenção, pneus, desgaste). Padrão 0.
- O "custo por km percorrido" pedido em RF09 é exibido como `custoPorKm` (indicador derivado).

### 6.6 Exemplo resolvido (usar como teste unitário)
Roteiro A (seed), parâmetros: combustível R$ 6,00/L; veículo 12 km/L; custo operacional R$ 0,20/km; fator 1,3; jornada 8 h; tempo mínimo 0.

| Ordem | Endereço | Chegada | Saída | Tempo parado |
|---|---|---|---|---|
| 1 | Base Sagrada Família (partida) | — | 08:00 | **nulo** (RN01) |
| 2 | Rua Peru, 55 | 08:20 | 08:35 | **15 min** |
| 3 | Rua X, 5 | 09:00 | 09:10 | **10 min** |
| 4 | Av. João César | 09:40 | 10:30 | **50 min** |

- Tempo total parado = 15 + 10 + 50 = **75 min**
- % da jornada = 75 / 480 × 100 = **15,63 %**
- Distância (coordenadas do seed, Seção 12): haversine = 3,138 + 2,464 + 2,647 = 8,249 km × 1,3 = **10,72 km**
- Custo por km = 6,00 / 12 + 0,20 = **R$ 0,70**
- Custo estimado = 10,72 × 0,70 = **R$ 7,50**

Roteiros B e C (seed): totais **41 min** (8,54 %) e **45 min** (9,38 %).

### 6.7 Validações de coleta — RF05, RN06
| # | Regra | Erro (HTTP 422, código) |
|---|---|---|
| V1 | Roteiro precisa de **≥ 2 pontos** (partida + ao menos 1 parada) | `ROTEIRO_MIN_PONTOS` |
| V2 | Ordens são 1..n, **contíguas e sem repetição** | `ORDEM_INVALIDA` |
| V3 | Um roteiro não cancelado por **(motorista, data)** (RN05) | `ROTEIRO_DUPLICADO` (409) |
| V4 | No ponto de ordem 1 registra-se apenas **saída** (horário de partida) | `PARTIDA_SEM_CHEGADA` |
| V5 | Só registra chegada no ponto *k* se o ponto *k−1* já tem saída | `SEQUENCIA_INVALIDA` |
| V6 | `chegadaEm(k) ≥ saidaEm(k−1)` e `saidaEm(k) ≥ chegadaEm(k)` | `HORARIO_INCONSISTENTE` |
| V7 | Horário não pode estar mais de 5 min no futuro | `HORARIO_FUTURO` |
| V8 | Roteiro `FINALIZADO` ou `CANCELADO` não aceita registro do motorista (só correção de gerente/admin, auditada) | `ROTEIRO_FECHADO` |
| V9 | Só é possível editar a lista de pontos com status `PLANEJADO` | `ROTEIRO_EM_ANDAMENTO` |
| V10 | Finalizar exige chegada e saída em todos os pontos de ordem > 1 | `PONTOS_PENDENTES` |

Um mesmo `Ponto` **pode** aparecer mais de uma vez no roteiro (ex.: voltar à base).

### 6.8 Ciclo de vida do roteiro
```
PLANEJADO ──(1º registro de horário)──► EM_ANDAMENTO ──(finalizar)──► FINALIZADO
    │
    └──(cancelar)──► CANCELADO
```
Ao **finalizar** (numa única transação): valida V10 → calcula distância → busca o `ParametroSistema` vigente e grava em `roteiro.parametroId` (snapshot) → calcula custo e % da jornada → status `FINALIZADO` → `finalizadoEm = now()`.
Correção de horário de roteiro finalizado (gerente/admin) recalcula tudo **usando o mesmo snapshot de parâmetros**.

---

## 7. Autenticação e controle de acesso — RNF04

- `POST /api/auth/login` → `{ token, usuario: { id, email, perfil, nome } }`. JWT com `sub`, `perfil`, `motoristaId?`, `gerenteId?`.
- Senha com bcrypt (custo 10). Token no header `Authorization: Bearer <token>`. No front, guardar o token **em memória + sessionStorage**.
- Middleware `autenticar` + middleware `exigirPerfil(...perfis)`.

### Escopo de dados por perfil
| Perfil | Enxerga |
|---|---|
| `MOTORISTA` | Apenas os **próprios** roteiros; não acessa cadastros, dashboard nem parâmetros |
| `GERENTE` | Motoristas da **própria equipe** (`motorista.gerenteId = gerenteId do token`) e roteiros deles |
| `ADMIN` | Tudo |

Acesso fora do escopo → **404** (não revelar que o recurso existe).

---

## 8. API REST

Prefixo `/api`. JSON. Datas em ISO 8601 com fuso. Erros no formato:
```json
{ "erro": { "codigo": "HORARIO_INCONSISTENTE", "mensagem": "A chegada não pode ser anterior à saída do ponto anterior.", "detalhes": {} } }
```
Listagens paginadas: `?pagina=1&tamanho=20` → `{ itens: [], total, pagina, tamanho }`.

| Método | Rota | Perfis | RF/UC |
|---|---|---|---|
| POST | `/auth/login` | público | UC01 |
| GET | `/auth/me` | todos | UC01 |
| GET/POST | `/usuarios` | ADMIN | UC17 |
| PATCH | `/usuarios/:id` (perfil, ativo, senha) | ADMIN | UC17 |
| GET/POST | `/gerentes` | ADMIN | RF02 / UC03 |
| GET/PUT/DELETE | `/gerentes/:id` (DELETE = inativar) | ADMIN | RF02 |
| GET/POST | `/motoristas` (POST cria também o `Usuario` MOTORISTA) | GERENTE, ADMIN | RF01 / UC02 |
| GET/PUT/DELETE | `/motoristas/:id` (DELETE = inativar) | GERENTE, ADMIN | RF01 |
| POST | `/motoristas/:id/anonimizar` | ADMIN | RNF06 |
| GET/POST | `/veiculos` | GERENTE, ADMIN | UC05 |
| GET/PUT/DELETE | `/veiculos/:id` | GERENTE, ADMIN | UC05 |
| GET/POST | `/pontos` (`?busca=` por endereço/descrição) | GERENTE, ADMIN | RF03 / UC04 |
| GET/PUT/DELETE | `/pontos/:id` | GERENTE, ADMIN | RF03 |
| GET | `/roteiros?data=&motoristaId=&status=` | GERENTE, ADMIN | RF04 |
| POST | `/roteiros` | GERENTE, ADMIN | RF04 / UC06 |
| GET | `/roteiros/:id` | todos (escopo) | — |
| PUT | `/roteiros/:id` (só `PLANEJADO`) | GERENTE, ADMIN | RF04 |
| POST | `/roteiros/:id/cancelar` | GERENTE, ADMIN | — |
| GET | `/roteiros/meus?data=` (padrão: hoje) | MOTORISTA | UC11 |
| POST | `/roteiros/:id/paradas/:paradaId/chegada` | MOTORISTA (dono) | RF05 / UC07 |
| POST | `/roteiros/:id/paradas/:paradaId/saida` | MOTORISTA (dono) | RF05 / UC07 |
| PATCH | `/roteiros/:id/paradas/:paradaId` (correção de horários) | GERENTE, ADMIN | RF05, RNF05 |
| POST | `/roteiros/:id/finalizar` | MOTORISTA (dono), GERENTE, ADMIN | UC09 / RF11 |
| GET | `/historico?inicio=&fim=&motoristaId=&busca=` | GERENTE, ADMIN; MOTORISTA (só os seus) | RF07 / UC12 |
| GET | `/historico/exportar.csv?...mesmos filtros` | GERENTE, ADMIN | RF12 / UC14 |
| GET | `/dashboard/dia?data=&motoristaId=` | GERENTE, ADMIN | RF08 |
| GET | `/dashboard/mes?ano=&mes=&motoristaId=` | GERENTE, ADMIN | RF08 |
| GET | `/dashboard/periodo?inicio=&fim=&motoristaId=` | GERENTE, ADMIN | RF08 |
| GET | `/parametros/vigente` | todos | RF09, RF10 |
| GET | `/parametros` (histórico de versões) | GERENTE, ADMIN | RF09, RF10 |
| POST | `/parametros/custos` | GERENTE, ADMIN | RF09 / UC15 |
| POST | `/parametros/jornada` | ADMIN | RF10 / UC16 |
| GET | `/auditoria?entidade=&entidadeId=&inicio=&fim=` | ADMIN | RNF05 / UC18 |

### Contratos principais
**POST `/roteiros`**
```json
{
  "data": "2026-09-24",
  "motoristaId": "uuid",
  "veiculoId": "uuid (opcional; padrão = veículo do motorista)",
  "paradas": [
    { "pontoId": "uuid", "ordem": 1 },
    { "pontoId": "uuid", "ordem": 2, "codigoPedido": "PED-1001" }
  ]
}
```

**POST `/roteiros/:id/paradas/:paradaId/chegada`** (idem `/saida`)
```json
{ "dataHora": "2026-09-24T08:20:00-03:00 (opcional; padrão = agora no servidor)", "latitude": -19.93, "longitude": -43.94 }
```
Resposta: a parada atualizada + `tempoTotalParadoMin` do roteiro.

**POST `/roteiros/:id/finalizar`**
```json
{ "kmInformado": 12.5 }
```
Resposta: roteiro com `distanciaTotalKm`, `custoEstimado`, `custoPorKm`, `percentualJornada`, `tempoTotalParadoMin`.

**POST `/parametros/custos`** → `{ valorCombustivelLitro, kmPorLitroPadrao, custoOperacionalPorKm, fatorCorrecaoRota }`
**POST `/parametros/jornada`** → `{ jornadaPadraoHoras, tempoMinimoParadaMin, limiteAlertaParadaMin }`
Os dois criam **nova versão** copiando os campos não enviados da versão vigente. Validação: valores > 0; `jornadaPadraoHoras` entre 1 e 24; `fatorCorrecaoRota` entre 1 e 3.

**GET `/historico`** — cada item:
```json
{
  "roteiroId": "uuid", "data": "2026-09-24", "motorista": "João S.",
  "ordem": 2, "endereco": "Rua Peru, 55", "codigoPedido": "PED-1001",
  "chegadaEm": "…", "saidaEm": "…", "tempoParadoMin": 15, "alerta": false
}
```
Não retorna a parada de ordem 1 por padrão (`?incluirPartida=true` para incluir, com `tempoParadoMin: null`).

**CSV** (`;` como separador, UTF-8 com BOM para abrir certo no Excel):
`data;motorista;ordem;endereco;codigo_pedido;chegada;saida;tempo_parado_min`

---

## 9. Dashboard — RF08, RN04, RNF03

Todas as agregações **no SQL** (`GROUP BY`), nunca carregando todas as linhas para o Node. Considerar roteiros com status `EM_ANDAMENTO` ou `FINALIZADO` e paradas com `tempo_parado_min IS NOT NULL`. Agrupamento temporal pela coluna `roteiros.data`.

| Recorte | Cards (topo) | Gráfico principal | Complemento |
|---|---|---|---|
| **Dia** (`data`) | tempo total parado, % jornada, nº de paradas, km, custo | **Barras**: tempo parado por parada (rótulo: `ordem — endereço`), agrupado por motorista | Tabela: endereço, chegada, saída, tempo, alerta |
| **Mês** (`ano`, `mes`) | idem, somados no mês | **Barras**: tempo parado total por dia do mês | **Linha**: % da jornada por dia |
| **Período** (`inicio`, `fim`, máx. 366 dias) | idem, somados no período | **Linha**: tempo parado por dia (se período > 62 dias, agrupar **por mês**) | **Ranking**: top 10 endereços com maior tempo parado médio |

- Tooltip de todo ponto do gráfico mostra **endereço e data/hora** (critério de aceitação: todo tempo exibido está vinculado a endereço e data/hora).
- Paradas acima de `limiteAlertaParadaMin` aparecem destacadas (cor de alerta + ícone).
- Filtro opcional por motorista em todos os recortes.

Exemplo de consulta (recorte mês):
```sql
SELECT r.data,
       SUM(pr.tempo_parado_min)                      AS tempo_parado_min,
       COUNT(DISTINCT r.id)                          AS roteiros,
       COUNT(pr.id)                                  AS paradas
FROM roteiros r
JOIN pontos_roteiro pr ON pr.roteiro_id = r.id
WHERE r.data BETWEEN $1 AND $2
  AND r.status IN ('EM_ANDAMENTO','FINALIZADO')
  AND pr.ordem > 1
  AND pr.tempo_parado_min IS NOT NULL
  AND ($3::uuid IS NULL OR r.motorista_id = $3)
GROUP BY r.data
ORDER BY r.data;
```
Usar `prisma.$queryRaw` com template tag (parâmetros sempre parametrizados, nunca concatenados).

**RNF03:** resposta < 3 s para consultas de até 12 meses. Ver teste de carga na Seção 14.

---

## 10. Front-end (React) — RNF02

Web **responsivo, mobile-first** (CSS puro, breakpoints 600 px e 1024 px). Menu lateral no desktop, menu inferior no celular.

| Rota | Perfil | Tela | UC |
|---|---|---|---|
| `/login` | público | Login | UC01 |
| `/motorista` | MOTORISTA | **Roteiro de hoje**: lista de paradas em ordem, com endereço, botão grande **"Cheguei"** / **"Saí"** na parada atual, cronômetro da parada em andamento, total parado do dia; botão **Finalizar roteiro** (pede km opcional) e resumo final | UC07, UC09 |
| `/motorista/historico` | MOTORISTA | Meus roteiros anteriores | UC11 |
| `/dashboard` | GERENTE, ADMIN | Abas **Dia / Mês / Período** + filtro de motorista | UC13 |
| `/historico` | GERENTE, ADMIN | Tabela filtrável + botão **Exportar CSV** | UC12, UC14 |
| `/roteiros` | GERENTE, ADMIN | Lista por data; **Novo roteiro**: escolhe data, motorista, veículo; adiciona pontos (busca por endereço) e ordena com ↑/↓; atalho "cadastrar novo ponto" em modal | UC06, UC04 |
| `/roteiros/:id` | GERENTE, ADMIN | Detalhe + correção de horários (com confirmação) | — |
| `/pontos` | GERENTE, ADMIN | CRUD; botão **"Usar minha localização"** (`navigator.geolocation`) | UC04 |
| `/motoristas` | GERENTE, ADMIN | CRUD (documento mascarado na lista) | UC02 |
| `/veiculos` | GERENTE, ADMIN | CRUD | UC05 |
| `/parametros` | GERENTE (só custos), ADMIN (tudo) | Formulário + histórico de versões | UC15, UC16 |
| `/admin/usuarios` | ADMIN | Usuários e perfis | UC17 |
| `/admin/gerentes` | ADMIN | CRUD de gerentes/coordenadores | UC03 |
| `/admin/auditoria` | ADMIN | Consulta de logs | UC18 |

- Captura de GPS no "Cheguei/Saí" é **opcional**: se o navegador negar permissão, registrar só o horário.
- Exibir tempos como `1 h 15 min`; datas em `dd/mm/aaaa`; moeda em `R$ 7,50` (`Intl.NumberFormat('pt-BR')`).

---

## 11. Auditoria e LGPD — RNF05, RNF06

### Auditoria
- Serviço `auditoria.registrar(tx, { entidade, entidadeId, acao, valorAnterior, valorNovo, usuarioId })` chamado **dentro da mesma transação** da alteração.
- Obrigatório para: `Ponto`, `PontoRoteiro` (todo registro/correção de horário), `Roteiro`, `ParametroSistema`, `Motorista`, `Gerente`, `Usuario`.
- Nunca gravar `senhaHash` no log; `documento` sempre mascarado no log.

### LGPD
- **Minimização:** coletar só o necessário (nome, telefone, documento, veículo). Localização GPS só no instante do registro, nunca contínua.
- **Mascaramento:** documento exibido como `***.456.789-**` em listagens; completo só no detalhe, para GERENTE/ADMIN.
- **Anonimização** (`POST /motoristas/:id/anonimizar`): `nome = "Motorista anonimizado <6 primeiros caracteres do id>"`, `telefone = null`, `documento = null`, `anonimizado = true`, usuário desativado. Os roteiros continuam (estatística), mas sem dado pessoal.
- **Segurança:** senhas com bcrypt; JWT com expiração; CORS restrito à origem do front; nenhuma informação pessoal em logs de console.

---

## 12. Seed (dados iniciais — idempotente)

| Tipo | Dados |
|---|---|
| Admin | `admin@mvp.local` / `admin123` (**somente desenvolvimento**) |
| Gerente | `gerente@mvp.local` / `gerente123` — cargo GERENTE |
| Motoristas | `joao@mvp.local`, `maria@mvp.local`, `carlos@mvp.local` / `motorista123`, todos da equipe do gerente |
| Veículos | Moto 35 km/L; Carro 12 km/L; Van 9 km/L |
| Parâmetros | combustível 6,00; km/L padrão 12; custo operacional 0,20; fator 1,3; jornada 8 h; tempo mínimo 0; alerta 60 min |

Pontos (coordenadas **fictícias**, região de Belo Horizonte):
| Ponto | Endereço | Latitude | Longitude |
|---|---|---|---|
| P1 | Base Sagrada Família (partida) | -19.916500 | -43.924500 |
| P2 | Rua Peru, 55 | -19.936200 | -43.946000 |
| P3 | Rua X, 5 | -19.955100 | -43.958300 |
| P4 | Av. João César | -19.972400 | -43.940900 |

Roteiros do exemplo do documento (data = hoje − 1 dia, status FINALIZADO, partida às 08:00):
| Roteiro | Motorista / veículo | Paradas (ordem 2, 3, 4) | Total |
|---|---|---|---|
| A | João / Carro | 15, 10, 50 min | 75 min |
| B | Maria / Moto | 10, 5, 26 min | 41 min |
| C | Carlos / Van | 5, 10, 30 min | 45 min |

Além disso, gerar **90 dias de histórico aleatório** (seed fixa de aleatoriedade, dias úteis, 3–8 paradas por roteiro, 2–60 min por parada) para o dashboard ter dados.

Script separado `npm run seed:carga` gera **12 meses × 20 motoristas × ~250 dias úteis × 8 paradas** (~40 mil paradas) para o teste de desempenho.

---

## 13. Qualidade de código

- ESLint + Prettier com configuração padrão (ferramentas de desenvolvimento — não vão para produção).
- Nenhuma regra de negócio em controller ou componente React: regra fica em `api/src/domain/` ou no service.
- Valores monetários e km com `Decimal` (Prisma) no back; converter para `number` só na resposta JSON, já arredondado.
- Toda escrita que altera mais de uma tabela usa `prisma.$transaction`.

---

## 14. Testes e critérios de aceitação

### Testes unitários (`domain/`)
- `calcularTempoParado`: partida → `null`; 08:20–08:35 → 15; sem saída → `null`; abaixo do mínimo → 0.
- `calcularTempoTotal`: roteiros A, B, C → 75, 41, 45.
- `calcularDistancia`: coordenadas do seed → 10,72 km; com `kmInformado = 12,5` → 12,5.
- `calcularCusto`: exemplo 6.6 → R$ 7,50; veículo sem km/L usa o padrão.
- `percentualJornada`: 75 min / 8 h → 15,63.

### Testes de integração (Supertest + banco de teste)
| Critério de aceitação (documento) | Teste |
|---|---|
| Não computa tempo parado na partida | Registrar saída da ordem 1 e verificar `tempoParadoMin = null` e total inalterado |
| Dashboard com os três recortes | `/dashboard/dia`, `/mes`, `/periodo` retornam 200 com séries não vazias sobre o seed |
| Todo tempo exibido tem endereço e data/hora | Todo item de `/historico` e das séries do dashboard dia tem `endereco`, `chegadaEm`, `saidaEm` |
| Parâmetros alteráveis sem mudar código | `POST /parametros/custos` e novo roteiro finalizado usa o novo valor; roteiro antigo mantém o custo anterior |
| RN05 | Criar 2º roteiro para mesmo motorista/data → 409 |
| V5/V6 | Chegada fora de ordem → 422 |
| RNF04 | Motorista acessando `/dashboard/dia` → 403; gerente acessando motorista de outra equipe → 404 |
| RNF05 | Correção de horário gera `LogAuditoria` com valor anterior e novo |
| RNF03 | Com `seed:carga`, `/dashboard/periodo` de 12 meses responde em < 3 s |

---

## 15. Premissas a validar com o professor/cliente

1. `Ponto` foi separado em `Ponto` + `PontoRoteiro` (Seção 5.1).
2. Distância estimada por linha reta × fator de correção, ou km informado pelo motorista (sem API de mapas).
3. `custo por km` = combustível/km + custo operacional/km.
4. "Regras de cálculo do tempo parado" parametrizáveis = tempo mínimo de parada e limite de alerta; RN01 é fixa.
5. Horários são registrados pelo próprio motorista (botões no celular); o gerente só corrige, com auditoria.
6. "Entrada de pedidos" = campo `codigoPedido` opcional em cada parada do roteiro.

---

## 16. Plano de implementação (ordem obrigatória)

Cada etapa termina com testes passando e um commit.

1. **Infra:** monorepo, Dockerfiles, `docker-compose.yml`, `.env.example`, `nginx.conf`. `docker compose up --build` sobe api (healthcheck `GET /api/health`) e web (página em branco com título).
2. **Banco:** `schema.prisma`, migration inicial, migration SQL da Seção 5.3, seed da Seção 12.
3. **Domínio:** funções puras da Seção 6 + testes unitários da Seção 14.
4. **Auth/RBAC:** login, JWT, middlewares, escopo por perfil; tela de login e rotas protegidas no front.
5. **Cadastros:** gerentes, motoristas (com usuário), veículos, pontos — API + telas.
6. **Roteiros:** montagem (UC06) com validações V1–V3, V9; tela de roteiros.
7. **Coleta:** chegada/saída (UC07) com V4–V8, cálculo automático, auditoria; tela mobile do motorista.
8. **Finalização e custo:** UC09/UC10 com snapshot de parâmetros; resumo no front.
9. **Parâmetros:** versões, tela com permissão por campo.
10. **Histórico + CSV:** RF07, RF12.
11. **Dashboard:** três recortes, gráficos Recharts, alertas.
12. **Auditoria e LGPD:** tela de auditoria, anonimização, mascaramento.
13. **Desempenho e acabamento:** `seed:carga`, teste RNF03, revisão de responsividade, revisão final do `README.md` (Seção 17).

> **README contínuo:** a partir da etapa 1, toda etapa que mudar a forma de instalar, configurar, executar ou testar o projeto **deve atualizar o `README.md` no mesmo commit**. Nenhuma etapa é considerada concluída com o README desatualizado.

---

## 17. README.md (obrigatório)

Criar o `README.md` na raiz do repositório (ou **alterar** o existente, mantendo o que já houver de útil) em **português**, com as seções abaixo, nesta ordem. Todo comando citado deve ter sido **executado e testado** antes de ir para o README.

1. **Nome e descrição** — nome do produto e 2–3 linhas sobre o que o sistema faz.
2. **Tecnologias** — lista da Seção 2 com as versões realmente usadas (conferir nos `package.json` e no `docker-compose.yml`).
3. **Pré-requisitos** — Docker e Docker Compose (com a versão mínima testada); Node.js 24 apenas para quem for rodar fora do Docker.
4. **Como executar com Docker (caminho principal)**
   ```bash
   git clone <url-do-repositorio>
   cd <pasta>
   cp .env.example .env        # ajustar senhas se quiser
   docker compose up --build
   ```
   - URLs: front-end `http://localhost:8080`; API `http://localhost:3000/api/health`.
   - Como parar (`docker compose down`) e como **zerar o banco** (`docker compose down -v`).
5. **Usuários de teste** — tabela com e-mail, senha e perfil do seed (Seção 12), com o aviso de que são **só para desenvolvimento**.
6. **Variáveis de ambiente** — tabela com cada variável do `.env.example`: nome, descrição, valor padrão.
7. **Como executar sem Docker (desenvolvimento)** — subir só o banco (`docker compose up db`), depois em `api/`: `npm install`, `npx prisma migrate dev`, `npm run seed`, `npm run dev`; em `web/`: `npm install`, `npm run dev` (informar a porta do Vite e o proxy para a API).
8. **Scripts disponíveis** — tabela de `npm run <script>` de `api/` e `web/` (dev, build, test, lint, seed, seed:carga).
9. **Testes** — como rodar os testes unitários e de integração, e o teste de desempenho (RNF03) com `seed:carga`.
10. **Testar no celular** — como acessar pelo IP da máquina na rede local, com o aviso de que o GPS só funciona em HTTPS ou `localhost` (Seção 4.3).
11. **Estrutura de pastas** — versão resumida da Seção 3.
12. **Documentação** — links para `docs/ESPECIFICACAO.md`, `docs/DECISOES.md` e os diagramas em `docs/diagramas/*.drawio`, com a dica de visualização: abrir em <https://app.diagrams.net> (Arquivo → Abrir de → Dispositivo) ou com a extensão **Draw.io Integration** do VS Code. O arquivo `robustez.drawio` tem várias páginas (abas na parte de baixo do editor).
13. **Problemas comuns** — no mínimo: porta 5432/3000/8080 já em uso (como trocar no `docker-compose.yml`); API sobe antes do banco (explicar o healthcheck); seed não roda de novo (explicar a idempotência e o `down -v`).

**Critério de aceitação do README:** uma pessoa que nunca viu o projeto, com apenas Docker instalado, consegue clonar, executar e entrar no sistema com um usuário de teste **seguindo só o README**, sem consultar outro arquivo.
