-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('MOTORISTA', 'GERENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "CargoGestor" AS ENUM ('GERENTE', 'COORDENADOR', 'DONO');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('MOTO', 'CARRO', 'VAN', 'CAMINHAO');

-- CreateEnum
CREATE TYPE "StatusRoteiro" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('CRIACAO', 'ALTERACAO', 'EXCLUSAO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gerentes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" "CargoGestor" NOT NULL DEFAULT 'GERENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" UUID,

    CONSTRAINT "gerentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "documento" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "anonimizado" BOOLEAN NOT NULL DEFAULT false,
    "gerente_id" UUID NOT NULL,
    "veiculo_id" UUID,
    "usuario_id" UUID,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "km_por_litro" DECIMAL(6,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos" (
    "id" UUID NOT NULL,
    "descricao" TEXT,
    "endereco" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pontos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roteiros" (
    "id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "status" "StatusRoteiro" NOT NULL DEFAULT 'PLANEJADO',
    "motorista_id" UUID NOT NULL,
    "gerente_id" UUID NOT NULL,
    "veiculo_id" UUID,
    "parametro_id" UUID,
    "km_informado" DECIMAL(8,2),
    "distancia_total_km" DECIMAL(8,2),
    "tempo_total_parado_min" INTEGER NOT NULL DEFAULT 0,
    "custo_estimado" DECIMAL(10,2),
    "percentual_jornada" DECIMAL(5,2),
    "finalizado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roteiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos_roteiro" (
    "id" UUID NOT NULL,
    "roteiro_id" UUID NOT NULL,
    "ponto_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "codigo_pedido" TEXT,
    "chegada_em" TIMESTAMPTZ(3),
    "saida_em" TIMESTAMPTZ(3),
    "tempo_parado_min" INTEGER,
    "lat_registro" DECIMAL(9,6),
    "long_registro" DECIMAL(9,6),

    CONSTRAINT "pontos_roteiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_sistema" (
    "id" UUID NOT NULL,
    "vigente_desde" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_combustivel_litro" DECIMAL(8,3) NOT NULL,
    "km_por_litro_padrao" DECIMAL(6,2) NOT NULL,
    "custo_operacional_por_km" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "fator_correcao_rota" DECIMAL(4,2) NOT NULL DEFAULT 1.3,
    "jornada_padrao_horas" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "tempo_minimo_parada_min" INTEGER NOT NULL DEFAULT 0,
    "limite_alerta_parada_min" INTEGER NOT NULL DEFAULT 60,
    "criado_por_id" UUID,

    CONSTRAINT "parametros_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" UUID NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" UUID NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "valor_anterior" JSONB,
    "valor_novo" JSONB,
    "usuario_id" UUID NOT NULL,
    "data_hora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gerentes_email_key" ON "gerentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gerentes_usuario_id_key" ON "gerentes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_documento_key" ON "motoristas"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_usuario_id_key" ON "motoristas"("usuario_id");

-- CreateIndex
CREATE INDEX "motoristas_gerente_id_idx" ON "motoristas"("gerente_id");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "pontos_endereco_idx" ON "pontos"("endereco");

-- CreateIndex
CREATE INDEX "roteiros_data_idx" ON "roteiros"("data");

-- CreateIndex
CREATE INDEX "roteiros_motorista_id_data_idx" ON "roteiros"("motorista_id", "data");

-- CreateIndex
CREATE INDEX "pontos_roteiro_ponto_id_idx" ON "pontos_roteiro"("ponto_id");

-- CreateIndex
CREATE UNIQUE INDEX "pontos_roteiro_roteiro_id_ordem_key" ON "pontos_roteiro"("roteiro_id", "ordem");

-- CreateIndex
CREATE INDEX "parametros_sistema_vigente_desde_idx" ON "parametros_sistema"("vigente_desde");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidade_entidade_id_idx" ON "logs_auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "logs_auditoria_data_hora_idx" ON "logs_auditoria"("data_hora");

-- AddForeignKey
ALTER TABLE "gerentes" ADD CONSTRAINT "gerentes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "gerentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiros" ADD CONSTRAINT "roteiros_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiros" ADD CONSTRAINT "roteiros_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "gerentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiros" ADD CONSTRAINT "roteiros_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiros" ADD CONSTRAINT "roteiros_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros_sistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_roteiro" ADD CONSTRAINT "pontos_roteiro_roteiro_id_fkey" FOREIGN KEY ("roteiro_id") REFERENCES "roteiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_roteiro" ADD CONSTRAINT "pontos_roteiro_ponto_id_fkey" FOREIGN KEY ("ponto_id") REFERENCES "pontos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
