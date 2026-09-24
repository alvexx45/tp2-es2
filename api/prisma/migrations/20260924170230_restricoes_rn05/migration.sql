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
