import { AlertTriangle, Download, ImagePlus, Tag } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { contarImagem } from '../api'
import { IOU_PADRAO } from '../constantes'
import { exportarCsv } from '../csv'
import { CartaoClasse } from './CartaoClasse'
import { ControleTau } from './ControleTau'
import { SoltarImagem } from './SoltarImagem'
import { VisualizadorDeteccoes } from './VisualizadorDeteccoes'
import type { RespostaContagem } from '../tipos'


interface AbaContagemProps {
  classes: string[]
  tau: number
  onMudarTau: (valor: number) => void
  tauCalibrado: number | null
}

export function AbaContagem({ classes, tau, onMudarTau, tauCalibrado }: AbaContagemProps) {
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)
  const [urlImagem, setUrlImagem] = useState<string | null>(null)
  const [resposta, setResposta] = useState<RespostaContagem | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [classesOcultas, setClassesOcultas] = useState<Set<string>>(new Set())
  const [mostrarRotulos, setMostrarRotulos] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (urlImagem) URL.revokeObjectURL(urlImagem)
    }
  }, [urlImagem])

  async function tratarArquivo(arquivo: File) {
    setNomeArquivo(arquivo.name)
    setUrlImagem(URL.createObjectURL(arquivo))
    setResposta(null)
    setErro(null)
    setCarregando(true)
    try {
      const resultado = await contarImagem(arquivo, IOU_PADRAO)
      setResposta(resultado)
    } catch {
      setErro('Não foi possível processar a imagem. Verifique se a API está em execução.')
    } finally {
      setCarregando(false)
    }
  }

  const deteccoesFiltradas = useMemo(
    () => (resposta ? resposta.deteccoes.filter((deteccao) => deteccao.confianca >= tau) : []),
    [resposta, tau],
  )

  const contagens = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const nome of classes) mapa.set(nome, 0)
    for (const deteccao of deteccoesFiltradas) {
      mapa.set(deteccao.nome, (mapa.get(deteccao.nome) ?? 0) + 1)
    }
    return mapa
  }, [deteccoesFiltradas, classes])

  const total = deteccoesFiltradas.length

  const classesVisiveis = useMemo(
    () => new Set(classes.filter((nome) => !classesOcultas.has(nome))),
    [classes, classesOcultas],
  )

  function alternarVisibilidade(nome: string) {
    setClassesOcultas((atual) => {
      const novo = new Set(atual)
      if (novo.has(nome)) novo.delete(nome)
      else novo.add(nome)
      return novo
    })
  }

  function exportar() {
    if (!resposta) return
    const linhas = classes.map((nome): [string, number] => [nome, contagens.get(nome) ?? 0])
    exportarCsv('contagem.csv', ['classe', 'quantidade'], [...linhas, ['total', total]])
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {!urlImagem && <SoltarImagem onArquivo={tratarArquivo} classes={classes} />}

        {urlImagem && (
          <div className="painel surgir overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-borda px-4 py-2.5">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-texto">{nomeArquivo}</span>
                <span className="mono text-[11px] text-texto-fraco">
                  {resposta
                    ? `${resposta.largura}×${resposta.altura} px · ${Math.round(resposta.tempo_ms)} ms`
                    : carregando
                      ? 'processando...'
                      : '—'}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarRotulos((atual) => !atual)}
                  aria-pressed={mostrarRotulos}
                  disabled={!resposta}
                  className={`botao h-9 min-h-0 px-3 ${
                    mostrarRotulos ? 'bg-superficie-3 text-texto' : 'text-texto-suave hover:text-texto'
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Rótulos</span>
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="botao botao-secundario h-9 min-h-0 px-3"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Nova imagem
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(evento) => {
                    const arquivo = evento.target.files?.[0]
                    if (arquivo) void tratarArquivo(arquivo)
                    evento.target.value = ''
                  }}
                />
              </div>
            </div>
            <VisualizadorDeteccoes
              urlImagem={urlImagem}
              deteccoes={deteccoesFiltradas}
              classesVisiveis={classesVisiveis}
              mostrarRotulos={mostrarRotulos}
              carregando={carregando}
            />
            {resposta && (
              <p className="border-t border-borda px-4 py-2 text-xs text-texto-fraco">
                Passe o mouse ou toque numa caixa para ver a classe e a confiança.
              </p>
            )}
          </div>
        )}

        {erro && (
          <div className="flex items-center gap-2 rounded-painel border border-erro/30 bg-erro/10 p-4 text-sm text-erro">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {erro}
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="painel overflow-hidden">
          <div className="flex items-end justify-between gap-3 p-5">
            <div className="flex flex-col gap-1">
              <span className="rotulo-secao">Total de peças</span>
              <span className={`numeros text-5xl font-semibold tracking-tight ${resposta ? 'text-texto' : 'text-texto-fraco'}`}>
                {resposta ? total : 0}
              </span>
            </div>
            <button type="button" disabled={!resposta} onClick={exportar} className="botao botao-secundario h-9 min-h-0 px-3">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              CSV
            </button>
          </div>
          <div className="divide-y divide-borda border-t border-borda">
            {classes.map((nome) => (
              <CartaoClasse
                key={nome}
                nome={nome}
                contagem={contagens.get(nome) ?? 0}
                total={total}
                visivel={classesVisiveis.has(nome)}
                onAlternarVisibilidade={() => alternarVisibilidade(nome)}
              />
            ))}
          </div>
        </div>

        <div className="painel p-5">
          <ControleTau tau={tau} onMudar={onMudarTau} tauCalibrado={tauCalibrado} />
        </div>
      </aside>
    </div>
  )
}
