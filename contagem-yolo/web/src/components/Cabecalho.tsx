import { BarChart3, Layers, ScanSearch, Video } from 'lucide-react'
import type { Aba, EstadoSaude } from '../tipos'

interface CabecalhoProps {
  saudeEstado: EstadoSaude
  modelo: string | null
  abaAtiva: Aba
  onMudarAba: (aba: Aba) => void
}

const ABAS: Array<{ id: Aba; rotulo: string; Icone: typeof ScanSearch }> = [
  { id: 'contagem', rotulo: 'Contagem', Icone: ScanSearch },
  { id: 'camera', rotulo: 'Câmera', Icone: Video },
  { id: 'lote', rotulo: 'Lote', Icone: Layers },
  { id: 'resultados', rotulo: 'Resultados', Icone: BarChart3 },
]

function Marca() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#18181B" stroke="#3F3F46" />
      <path d="M16 7.5l7.4 4.25v8.5L16 24.5l-7.4-4.25v-8.5z" fill="none" stroke="#FAFAFA" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.2" fill="none" stroke="#FAFAFA" strokeWidth="1.8" />
    </svg>
  )
}

export function Cabecalho({ saudeEstado, modelo, abaAtiva, onMudarAba }: CabecalhoProps) {
  const textoStatus =
    saudeEstado === 'ok' && modelo ? modelo : saudeEstado === 'erro' ? 'API indisponível' : 'Conectando...'
  const corStatus = saudeEstado === 'ok' ? 'bg-sucesso' : saudeEstado === 'erro' ? 'bg-erro' : 'bg-aviso'

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Marca />
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-texto">Contagem de Peças</h1>
          <p className="text-[13px] text-texto-fraco">Detecção de parafusos, porcas e arruelas com YOLO</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-9 items-center gap-2 rounded-full border border-borda bg-superficie px-3 text-xs text-texto-suave"
          title={saudeEstado === 'ok' ? 'Modelo carregado na API' : undefined}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {saudeEstado === 'ok' && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${corStatus}`} />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${corStatus}`} />
          </span>
          <span className="mono">{textoStatus}</span>
        </div>

        <nav aria-label="Abas" className="flex gap-1 rounded-[11px] border border-borda bg-superficie p-1">
          {ABAS.map(({ id, rotulo, Icone }) => {
            const ativa = abaAtiva === id
            return (
              <button
                key={id}
                type="button"
                aria-current={ativa ? 'page' : undefined}
                onClick={() => onMudarAba(id)}
                className={`flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors ${
                  ativa ? 'bg-superficie-3 text-texto shadow-sm' : 'text-texto-suave hover:text-texto'
                }`}
              >
                <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                {rotulo}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
