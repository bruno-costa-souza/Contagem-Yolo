import type { ReactNode } from 'react'

interface EstadoVazioProps {
  titulo: string
  descricao: ReactNode
  icone?: ReactNode
}

export function EstadoVazio({ titulo, descricao, icone }: EstadoVazioProps) {
  return (
    <div className="painel flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icone && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-borda-forte bg-superficie-2">
          {icone}
        </div>
      )}
      <p className="font-medium text-texto">{titulo}</p>
      <div className="max-w-md text-sm text-texto-fraco">{descricao}</div>
    </div>
  )
}
