import { Loader2 } from 'lucide-react'
import { SobreposicaoDeteccoes } from './SobreposicaoDeteccoes'
import type { Deteccao } from '../tipos'

interface VisualizadorDeteccoesProps {
  urlImagem: string
  deteccoes: Deteccao[]
  classesVisiveis: Set<string>
  mostrarRotulos: boolean
  carregando: boolean
}

export function VisualizadorDeteccoes({
  urlImagem,
  deteccoes,
  classesVisiveis,
  mostrarRotulos,
  carregando,
}: VisualizadorDeteccoesProps) {
  return (
    <div className="flex items-center justify-center bg-base/60 p-3">
      <div className="relative">
        <img
          src={urlImagem}
          alt="Imagem enviada para contagem de peças"
          className={`block max-h-[72vh] w-auto max-w-full rounded-lg transition-opacity ${carregando ? 'opacity-40' : ''}`}
        />
        <SobreposicaoDeteccoes deteccoes={deteccoes} classesVisiveis={classesVisiveis} mostrarRotulos={mostrarRotulos} />
        {carregando && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-borda-forte bg-superficie/90 px-4 py-2 text-sm text-texto backdrop-blur">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Detectando peças...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
