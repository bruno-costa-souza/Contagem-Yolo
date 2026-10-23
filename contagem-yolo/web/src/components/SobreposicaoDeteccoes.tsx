import { useState } from 'react'
import { corDaClasse } from '../constantes'
import { paraVirgula } from '../formato'
import type { Deteccao } from '../tipos'

interface SobreposicaoDeteccoesProps {
  deteccoes: Deteccao[]
  classesVisiveis: Set<string>
  mostrarRotulos: boolean
}

export function SobreposicaoDeteccoes({ deteccoes, classesVisiveis, mostrarRotulos }: SobreposicaoDeteccoesProps) {
  const [destacada, setDestacada] = useState<number | null>(null)
  const visiveis = deteccoes.filter((deteccao) => classesVisiveis.has(deteccao.nome))
  const comRotulo = mostrarRotulos ? visiveis.map((_, indice) => indice) : destacada !== null ? [destacada] : []

  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        onMouseLeave={() => setDestacada(null)}
      >
        {visiveis.map((deteccao, indice) => {
          const [cx, cy, largura, altura] = deteccao.caixa
          const cor = corDaClasse(deteccao.nome)
          const ativa = destacada === indice
          return (
            <rect
              key={indice}
              x={cx - largura / 2}
              y={cy - altura / 2}
              width={largura}
              height={altura}
              fill={cor}
              fillOpacity={ativa ? 0.28 : 0.1}
              stroke={cor}
              strokeWidth={ativa ? 2.5 : 1.5}
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setDestacada(indice)}
              className="cursor-crosshair"
            >
              <title>
                {deteccao.nome} · {paraVirgula(deteccao.confianca)}
              </title>
            </rect>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0">
        {comRotulo.map((indice) => {
          const deteccao = visiveis[indice]
          if (!deteccao) return null
          const [cx, cy, largura, altura] = deteccao.caixa
          return (
            <span
              key={indice}
              className="mono absolute -translate-y-full whitespace-nowrap rounded-t px-1 py-px text-[10px] font-semibold leading-tight text-[#09090B]"
              style={{
                left: `${(cx - largura / 2) * 100}%`,
                top: `${(cy - altura / 2) * 100}%`,
                backgroundColor: corDaClasse(deteccao.nome),
              }}
            >
              {deteccao.nome} {paraVirgula(deteccao.confianca)}
            </span>
          )
        })}
      </div>
    </>
  )
}
