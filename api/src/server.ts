import { env } from './config/env.ts';
import { criarApp } from './app.ts';

const app = criarApp();
// No Express 5 o callback do listen também recebe o erro (ex.: porta em uso).
app.listen(env.port, (erro?: Error) => {
  if (erro) {
    console.error(`Não foi possível iniciar a API na porta ${env.port}: ${erro.message}`);
    process.exit(1);
  }
  console.log(`API ouvindo na porta ${env.port}`);
});
