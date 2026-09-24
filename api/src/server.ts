import { env } from './config/env.ts';
import { criarApp } from './app.ts';

const app = criarApp();
app.listen(env.port, () => {
  console.log(`API ouvindo na porta ${env.port}`);
});
