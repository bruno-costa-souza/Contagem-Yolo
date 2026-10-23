import { Eye, EyeOff } from 'lucide-react'
import { corDaClasse } from '../constantes'

interface CartaoClasseProps {
  nome: string
  contagem: number
  total: number
  visivel: boolean
  onAlternarVisibilidade: () => void
}

export function CartaoClasse({ nome, contagem, total, visivel, onAlternarVisibilidade }: CartaoClasseProps) {
  const cor = corDaClasse(nome)
  const fracao = total > 0 ? contagem / total : 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-opacity ${visivel ? '' : 'opacity-45'}`}>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm capitalize text-texto-suave">{nome}</span>
          <span className="numeros text-xl font-semibold text-texto">{contagem}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-superficie-3">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${fracao * 100}%`, backgroundColor: cor }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onAlternarVisibilidade}
        aria-label={visivel ? `Ocultar caixas de ${nome}` : `Mostrar caixas de ${nome}`}
        aria-pressed={!visivel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-controle text-texto-fraco transition-colors hover:bg-superficie-3 hover:text-texto"
      >
        {visivel ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
