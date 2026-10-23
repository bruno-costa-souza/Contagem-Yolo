import { Loader2 } from 'lucide-react'

interface EstadoCarregandoProps {
  texto: string
}

export function EstadoCarregando({ texto }: EstadoCarregandoProps) {
  return (
    <div className="painel flex min-h-40 items-center justify-center gap-2 p-8 text-sm text-texto-suave">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  )
}
