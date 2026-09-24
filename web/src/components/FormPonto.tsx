import { useState, type FormEvent } from 'react';
import { pontosApi } from '../api/cadastros.ts';
import type { Ponto } from '../api/tipos.ts';
import { obterPosicao } from './geo/geolocalizacao.ts';
import { MensagemErro } from './MensagemErro.tsx';

/** Formulário de ponto (cadastro e atalho "cadastrar novo ponto" na montagem do roteiro). */
export function FormPonto({ ponto, aoSalvar }: { ponto?: Ponto; aoSalvar: (p: Ponto) => void }) {
  const salvar = pontosApi.useSalvar();
  const [descricao, setDescricao] = useState(ponto?.descricao ?? '');
  const [endereco, setEndereco] = useState(ponto?.endereco ?? '');
  const [latitude, setLatitude] = useState(ponto ? String(ponto.latitude) : '');
  const [longitude, setLongitude] = useState(ponto ? String(ponto.longitude) : '');
  const [aviso, setAviso] = useState<string | null>(null);
  const [localizando, setLocalizando] = useState(false);

  async function usarMinhaLocalizacao() {
    setAviso(null);
    setLocalizando(true);
    const posicao = await obterPosicao();
    setLocalizando(false);
    if (!posicao) {
      setAviso(
        'Não foi possível obter a localização (permissão negada ou GPS indisponível). Digite as coordenadas.',
      );
      return;
    }
    setLatitude(String(posicao.latitude));
    setLongitude(String(posicao.longitude));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        id: ponto?.id,
        dados: {
          descricao: descricao || null,
          endereco,
          latitude: Number(latitude.replace(',', '.')),
          longitude: Number(longitude.replace(',', '.')),
        },
      },
      { onSuccess: aoSalvar },
    );
  }

  return (
    <form className="formulario duas-colunas" onSubmit={enviar}>
      <label className="largura-total">
        Endereço *
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          required
          minLength={3}
        />
      </label>
      <label className="largura-total">
        Descrição
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Cliente Savassi"
        />
      </label>
      <label>
        Latitude *
        <input
          inputMode="decimal"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
      </label>
      <label>
        Longitude *
        <input
          inputMode="decimal"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
      </label>
      <div className="largura-total acoes">
        <button
          type="button"
          className="botao"
          onClick={usarMinhaLocalizacao}
          disabled={localizando}
        >
          📍 {localizando ? 'Localizando…' : 'Usar minha localização'}
        </button>
      </div>
      {aviso && <p className="largura-total texto-suave">{aviso}</p>}
      <div className="largura-total">
        <MensagemErro erro={salvar.error} />
      </div>
      <div className="largura-total acoes">
        <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
