import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.ts';
import { naoAutenticado } from '../../lib/erros.ts';
import type { UsuarioAutenticado } from '../../lib/tipos.ts';
import { assinarToken } from '../../middlewares/auth.ts';

const incluir = {
  motorista: { select: { id: true, nome: true } },
  gerente: { select: { id: true, nome: true } },
};

type UsuarioComPessoa = NonNullable<Awaited<ReturnType<typeof buscarPorId>>>;

function buscarPorId(id: string) {
  return prisma.usuario.findUnique({ where: { id }, include: incluir });
}

function resumo(u: UsuarioComPessoa) {
  return {
    id: u.id,
    email: u.email,
    perfil: u.perfil,
    nome: u.motorista?.nome ?? u.gerente?.nome ?? 'Administrador',
    motoristaId: u.motorista?.id ?? null,
    gerenteId: u.gerente?.id ?? null,
  };
}

export async function login(email: string, senha: string) {
  const u = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: incluir,
  });
  // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem).
  const ok = u?.ativo ? await bcrypt.compare(senha, u.senhaHash) : false;
  if (!u || !ok) throw naoAutenticado('E-mail ou senha inválidos.');

  const autenticado: UsuarioAutenticado = {
    id: u.id,
    perfil: u.perfil,
    motoristaId: u.motorista?.id,
    gerenteId: u.gerente?.id,
  };
  return { token: assinarToken(autenticado), usuario: resumo(u) };
}

export async function me(id: string) {
  const u = await buscarPorId(id);
  if (!u) throw naoAutenticado();
  return resumo(u);
}
