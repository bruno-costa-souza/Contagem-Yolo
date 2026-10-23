interface CartaoMetricaProps {
  rotulo: string
  valor: string
  descricao?: string
}

export function CartaoMetrica({ rotulo, valor, descricao }: CartaoMetricaProps) {
  return (
    <div className="painel flex flex-col gap-1.5 p-4">
      <span className="rotulo-secao">{rotulo}</span>
      <span className="numeros text-3xl font-semibold tracking-tight text-texto">{valor}</span>
      {descricao && <span className="text-xs text-texto-fraco">{descricao}</span>}
    </div>
  )
}
