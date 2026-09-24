import { useState, type FormEvent } from 'react';
import {
  useParametroVigente,
  useSalvarParametros,
  useVersoesParametros,
} from '../../api/parametros.ts';
import type { Parametros } from '../../api/tipos.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { formatarDataHora, formatarMoeda, formatarNumero } from '../../lib/formatos.ts';

type Campo = { chave: keyof Parametros; rotulo: string; ajuda: string; inteiro?: boolean };

const CAMPOS_CUSTOS: Campo[] = [
  {
    chave: 'valorCombustivelLitro',
    rotulo: 'Combustível (R$/litro)',
    ajuda: 'Preço médio pago pelo litro.',
  },
  {
    chave: 'kmPorLitroPadrao',
    rotulo: 'Rendimento padrão (km/L)',
    ajuda: 'Usado quando o roteiro não tem veículo.',
  },
  {
    chave: 'custoOperacionalPorKm',
    rotulo: 'Custo operacional (R$/km)',
    ajuda: 'Manutenção, pneus e desgaste, além do combustível.',
  },
  {
    chave: 'fatorCorrecaoRota',
    rotulo: 'Fator de correção de rota',
    ajuda: 'Multiplica a distância em linha reta (1 a 3; padrão 1,3).',
  },
];

const CAMPOS_JORNADA: Campo[] = [
  {
    chave: 'jornadaPadraoHoras',
    rotulo: 'Jornada padrão (horas)',
    ajuda: 'Base do % da jornada (1 a 24).',
  },
  {
    chave: 'tempoMinimoParadaMin',
    rotulo: 'Tempo mínimo de parada (min)',
    ajuda: 'Paradas mais curtas contam como 0.',
    inteiro: true,
  },
  {
    chave: 'limiteAlertaParadaMin',
    rotulo: 'Limite de alerta (min)',
    ajuda: 'Paradas acima disso ficam destacadas.',
    inteiro: true,
  },
];

function FormGrupo({
  titulo,
  grupo,
  campos,
  vigente,
  somenteLeitura,
}: {
  titulo: string;
  grupo: 'custos' | 'jornada';
  campos: Campo[];
  vigente: Parametros;
  somenteLeitura: boolean;
}) {
  const salvar = useSalvarParametros(grupo);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.chave, String(vigente[c.chave])])),
  );

  function enviar(e: FormEvent) {
    e.preventDefault();
    const dados = Object.fromEntries(
      campos.map((c) => [c.chave, Number(valores[c.chave].replace(',', '.'))]),
    );
    if (
      !window.confirm(
        'Criar uma nova versão dos parâmetros? Roteiros já finalizados mantêm os valores antigos.',
      )
    )
      return;
    salvar.mutate(dados);
  }

  return (
    <form className="cartao formulario duas-colunas" onSubmit={enviar}>
      <h2 className="largura-total" style={{ margin: 0 }}>
        {titulo}
      </h2>
      {campos.map((c) => (
        <label key={c.chave}>
          {c.rotulo}
          <input
            inputMode={c.inteiro ? 'numeric' : 'decimal'}
            value={valores[c.chave]}
            disabled={somenteLeitura}
            onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
            required
          />
          <small className="texto-suave">{c.ajuda}</small>
        </label>
      ))}
      <div className="largura-total">
        <MensagemErro erro={salvar.error} />
        {salvar.isSuccess && <p className="alerta-sucesso">Nova versão criada.</p>}
      </div>
      {somenteLeitura ? (
        <p className="largura-total texto-suave">
          Somente o administrador altera a jornada e as regras de tempo parado.
        </p>
      ) : (
        <div className="largura-total acoes">
          <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
            Salvar nova versão
          </button>
        </div>
      )}
    </form>
  );
}

export default function ParametrosPage() {
  const { usuario } = useAuth();
  const vigente = useParametroVigente();
  const [pagina, setPagina] = useState(1);
  const versoes = useVersoesParametros(pagina);

  if (vigente.isLoading) return <p className="carregando">Carregando…</p>;
  if (!vigente.data) return <MensagemErro erro={vigente.error} />;
  const v = vigente.data;

  return (
    <section>
      <h1>Parâmetros</h1>
      <p className="texto-suave">
        Versão vigente desde {formatarDataHora(v.vigenteDesde)}. Cada alteração cria uma nova
        versão.
      </p>
      {/* key força recarregar os valores do formulário quando surge uma nova versão */}
      <FormGrupo
        key={`c-${v.id}`}
        titulo="Custos (RF09)"
        grupo="custos"
        campos={CAMPOS_CUSTOS}
        vigente={v}
        somenteLeitura={false}
      />
      <FormGrupo
        key={`j-${v.id}`}
        titulo="Jornada e tempo parado (RF10)"
        grupo="jornada"
        campos={CAMPOS_JORNADA}
        vigente={v}
        somenteLeitura={usuario?.perfil !== 'ADMIN'}
      />

      <h2>Histórico de versões</h2>
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Vigente desde</th>
              <th className="numero">Combustível</th>
              <th className="numero">km/L</th>
              <th className="numero">Custo op./km</th>
              <th className="numero">Fator</th>
              <th className="numero">Jornada</th>
              <th className="numero">Mín.</th>
              <th className="numero">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {versoes.data?.itens.map((p) => (
              <tr key={p.id}>
                <td>
                  {formatarDataHora(p.vigenteDesde)}{' '}
                  {p.id === v.id && <span className="selo">vigente</span>}
                </td>
                <td className="numero">{formatarMoeda(p.valorCombustivelLitro)}</td>
                <td className="numero">{formatarNumero(p.kmPorLitroPadrao)}</td>
                <td className="numero">{formatarMoeda(p.custoOperacionalPorKm)}</td>
                <td className="numero">{formatarNumero(p.fatorCorrecaoRota)}</td>
                <td className="numero">{formatarNumero(p.jornadaPadraoHoras, ' h')}</td>
                <td className="numero">{p.tempoMinimoParadaMin} min</td>
                <td className="numero">{p.limiteAlertaParadaMin} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacao dados={versoes.data} aoMudar={setPagina} />
      </div>
    </section>
  );
}
