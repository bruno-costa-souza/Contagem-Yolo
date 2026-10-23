import { AlertTriangle, Camera, CameraOff, Download, Loader2, Tag } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { contarImagem } from '../api'
import { IOU_PADRAO } from '../constantes'
import { exportarCsv } from '../csv'
import { paraVirgula } from '../formato'
import { CartaoClasse } from './CartaoClasse'
import { ControleTau } from './ControleTau'
import { SobreposicaoDeteccoes } from './SobreposicaoDeteccoes'
import type { Deteccao } from '../tipos'

const JANELA_QUADROS = 9
const INTERVALO_MINIMO_MS = 100
const LADO_MAXIMO_QUADRO = 1280
const CHAVE_CAMERA = 'contagem-camera'

interface AbaCameraProps {
  classes: string[]
  tau: number
  onMudarTau: (valor: number) => void
  tauCalibrado: number | null
}

type EstadoCamera = 'parada' | 'iniciando' | 'ativa' | 'erro'

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.floor(ordenados.length / 2)] ?? 0
}

function lerCameraSalva(): string {
  try {
    return localStorage.getItem(CHAVE_CAMERA) ?? ''
  } catch {
    return ''
  }
}

function salvarCamera(id: string) {
  try {
    localStorage.setItem(CHAVE_CAMERA, id)
  } catch {}
}

function mensagemDeErro(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : ''
  if (nome === 'NotAllowedError') return 'Permissão da câmera negada. Libere o acesso nas configurações do navegador.'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nenhuma câmera encontrada. Verifique se a webcam está conectada.'
  if (nome === 'NotReadableError') return 'A câmera está em uso por outro programa. Feche-o e tente de novo.'
  return 'Não foi possível abrir a câmera.'
}

export function AbaCamera({ classes, tau, onMudarTau, tauCalibrado }: AbaCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const geracaoRef = useRef(0)
  const historicoRef = useRef<Deteccao[][]>([])

  const [estado, setEstado] = useState<EstadoCamera>('parada')
  const [erro, setErro] = useState<string | null>(null)
  const [erroApi, setErroApi] = useState(false)
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([])
  const [dispositivoId, setDispositivoId] = useState(lerCameraSalva)
  const [historico, setHistorico] = useState<Deteccao[][]>([])
  const [fps, setFps] = useState(0)
  const [latencia, setLatencia] = useState(0)
  const [classesOcultas, setClassesOcultas] = useState<Set<string>>(new Set())
  const [mostrarRotulos, setMostrarRotulos] = useState(false)

  function pararStream() {
    geracaoRef.current += 1
    streamRef.current?.getTracks().forEach((trilha) => trilha.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function parar() {
    pararStream()
    historicoRef.current = []
    setHistorico([])
    setFps(0)
    setEstado('parada')
  }

  async function executarLaco(geracao: number) {
    const tela = document.createElement('canvas')
    const contexto = tela.getContext('2d')
    let fpsSuavizado = 0

    while (geracao === geracaoRef.current) {
      const inicio = performance.now()
      const video = videoRef.current

      if (contexto && video && video.readyState >= 2 && video.videoWidth > 0) {
        const escala = Math.min(1, LADO_MAXIMO_QUADRO / Math.max(video.videoWidth, video.videoHeight))
        tela.width = Math.round(video.videoWidth * escala)
        tela.height = Math.round(video.videoHeight * escala)
        contexto.drawImage(video, 0, 0, tela.width, tela.height)
        const quadro = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/jpeg', 0.85))

        if (quadro) {
          try {
            const resposta = await contarImagem(quadro, IOU_PADRAO)
            if (geracao !== geracaoRef.current) break
            historicoRef.current = [...historicoRef.current, resposta.deteccoes].slice(-JANELA_QUADROS)
            setHistorico(historicoRef.current)
            setLatencia(performance.now() - inicio)
            setErroApi(false)
          } catch {
            if (geracao !== geracaoRef.current) break
            setErroApi(true)
            await new Promise((resolver) => setTimeout(resolver, 1000))
          }
        }
      }

      const restante = INTERVALO_MINIMO_MS - (performance.now() - inicio)
      if (restante > 0) await new Promise((resolver) => setTimeout(resolver, restante))

      const instantaneo = 1000 / (performance.now() - inicio)
      fpsSuavizado = fpsSuavizado === 0 ? instantaneo : fpsSuavizado * 0.8 + instantaneo * 0.2
      if (geracao === geracaoRef.current) setFps(fpsSuavizado)
    }
  }

  async function iniciar(id: string) {
    pararStream()
    const geracao = geracaoRef.current
    historicoRef.current = []
    setHistorico([])
    setErro(null)
    setEstado('iniciando')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(id ? { deviceId: { exact: id } } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      if (geracao !== geracaoRef.current) {
        stream.getTracks().forEach((trilha) => trilha.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }

      const lista = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
      setDispositivos(lista)
      const idAtual = stream.getVideoTracks()[0]?.getSettings().deviceId ?? id
      setDispositivoId(idAtual)
      salvarCamera(idAtual)

      setEstado('ativa')
      void executarLaco(geracao)
    } catch (excecao) {
      if (geracao !== geracaoRef.current) return
      if (id && excecao instanceof DOMException && excecao.name === 'OverconstrainedError') {
        salvarCamera('')
        void iniciar('')
        return
      }
      setErro(mensagemDeErro(excecao))
      setEstado('erro')
    }
  }

  useEffect(() => {
    return () => pararStream()
  }, [])

  const ultimasFiltradas = useMemo(
    () => (historico[historico.length - 1] ?? []).filter((d) => d.confianca >= tau),
    [historico, tau],
  )

  const contagensEstaveis = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const nome of classes) {
      const porQuadro = historico.map((deteccoes) => deteccoes.filter((d) => d.nome === nome && d.confianca >= tau).length)
      mapa.set(nome, mediana(porQuadro))
    }
    return mapa
  }, [historico, classes, tau])

  const totalEstavel = Array.from(contagensEstaveis.values()).reduce((soma, valor) => soma + valor, 0)
  const temLeitura = estado === 'ativa' && historico.length > 0

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
    const linhas = classes.map((nome): [string, number] => [nome, contagensEstaveis.get(nome) ?? 0])
    exportarCsv('contagem_camera.csv', ['classe', 'quantidade'], [...linhas, ['total', totalEstavel]])
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="painel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {estado === 'ativa' ? (
                <span className="flex items-center gap-1.5 rounded-full bg-erro/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-erro">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-erro" aria-hidden="true" />
                  Ao vivo
                </span>
              ) : (
                <span className="rounded-full bg-superficie-3 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-texto-fraco">
                  Desligada
                </span>
              )}
              {estado === 'ativa' && (
                <span className="mono text-[11px] text-texto-fraco">
                  {paraVirgula(fps, 1)} quadros/s · {Math.round(latencia)} ms
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dispositivos.length > 0 && (
                <select
                  aria-label="Câmera"
                  value={dispositivoId}
                  onChange={(evento) => void iniciar(evento.target.value)}
                  className="h-9 max-w-[220px] truncate rounded-controle border border-borda-forte bg-superficie-2 px-2.5 text-[13px] text-texto"
                >
                  {dispositivos.map((dispositivo, indice) => (
                    <option key={dispositivo.deviceId} value={dispositivo.deviceId}>
                      {dispositivo.label || `Câmera ${indice + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setMostrarRotulos((atual) => !atual)}
                aria-pressed={mostrarRotulos}
                disabled={!temLeitura}
                className={`botao h-9 min-h-0 px-3 ${
                  mostrarRotulos ? 'bg-superficie-3 text-texto' : 'text-texto-suave hover:text-texto'
                }`}
              >
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Rótulos</span>
              </button>
              {(estado === 'ativa' || estado === 'iniciando') && (
                <button type="button" onClick={parar} className="botao botao-secundario h-9 min-h-0 px-3">
                  <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Parar
                </button>
              )}
            </div>
          </div>

          <div className="flex min-h-[420px] items-center justify-center bg-base/60 p-3">
            <div className={`relative ${estado === 'ativa' ? '' : 'hidden'}`}>
              <video ref={videoRef} muted playsInline className="block max-h-[72vh] w-auto max-w-full rounded-lg" />
              {temLeitura && (
                <SobreposicaoDeteccoes
                  deteccoes={ultimasFiltradas}
                  classesVisiveis={classesVisiveis}
                  mostrarRotulos={mostrarRotulos}
                />
              )}
            </div>

            {estado === 'parada' && (
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-borda-forte bg-superficie-2 text-texto-suave">
                  <Camera className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-base font-medium text-texto">Contagem ao vivo pela webcam</p>
                  <p className="max-w-sm text-sm text-texto-fraco">
                    Deixe a câmera fixa no tripé, apontando de cima para a mesa, como nas fotos de treino.
                  </p>
                </div>
                <button type="button" onClick={() => void iniciar(dispositivoId)} className="botao botao-primario">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Ligar câmera
                </button>
              </div>
            )}

            {estado === 'iniciando' && (
              <div className="flex items-center gap-2 text-sm text-texto-suave">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Abrindo a câmera...
              </div>
            )}

            {estado === 'erro' && (
              <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-erro/30 bg-erro/10 text-erro">
                  <CameraOff className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm text-texto-suave">{erro}</p>
                <button type="button" onClick={() => void iniciar('')} className="botao botao-secundario">
                  Tentar de novo
                </button>
              </div>
            )}
          </div>
        </div>

        {erroApi && estado === 'ativa' && (
          <div className="flex items-center gap-2 rounded-painel border border-erro/30 bg-erro/10 p-4 text-sm text-erro">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            A API não respondeu. Verifique se o servidor está em execução.
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="painel overflow-hidden">
          <div className="flex items-end justify-between gap-3 p-5">
            <div className="flex flex-col gap-1">
              <span className="rotulo-secao">Peças na mesa</span>
              <span className={`numeros text-5xl font-semibold tracking-tight ${temLeitura ? 'text-texto' : 'text-texto-fraco'}`}>
                {temLeitura ? totalEstavel : 0}
              </span>
              <span className="text-xs text-texto-fraco">
                {temLeitura
                  ? `mediana de ${historico.length} ${historico.length === 1 ? 'quadro' : 'quadros'} · agora ${ultimasFiltradas.length}`
                  : 'aguardando a câmera'}
              </span>
            </div>
            <button type="button" disabled={!temLeitura} onClick={exportar} className="botao botao-secundario h-9 min-h-0 px-3">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              CSV
            </button>
          </div>
          <div className="divide-y divide-borda border-t border-borda">
            {classes.map((nome) => (
              <CartaoClasse
                key={nome}
                nome={nome}
                contagem={temLeitura ? (contagensEstaveis.get(nome) ?? 0) : 0}
                total={totalEstavel}
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
