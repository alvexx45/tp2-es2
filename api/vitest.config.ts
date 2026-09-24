import { defineConfig } from 'vitest/config';

// Os testes de integração usam um banco separado (<POSTGRES_DB>_test) no mesmo PostgreSQL do
// docker-compose. A URL pode ser definida em TEST_DATABASE_URL; senão é montada a partir do ../.env.
function urlBancoTeste(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  try {
    process.loadEnvFile('../.env');
  } catch {
    // sem .env: usa os padrões do .env.example
  }
  const usuario = process.env.POSTGRES_USER ?? 'mvp';
  const senha = process.env.POSTGRES_PASSWORD ?? 'mvp_senha_dev';
  const banco = process.env.POSTGRES_DB ?? 'mvp_tempo_parado';
  const porta = process.env.DB_PORT ?? '5432';
  return `postgresql://${usuario}:${senha}@localhost:${porta}/${banco}_test`;
}

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: urlBancoTeste(),
      JWT_SECRET: 'segredo-de-teste',
      TZ: 'America/Sao_Paulo',
    },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
