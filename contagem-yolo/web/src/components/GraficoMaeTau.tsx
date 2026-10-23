import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { paraVirgula } from '../formato'
import type { CurvaCalibragem } from '../tipos'

interface GraficoMaeTauProps {
  curva: CurvaCalibragem
  iou: number
  tauEscolhido: number
}

interface PontoCurva {
  tau: number
  mae: number | null
}

export function GraficoMaeTau({ curva, iou, tauEscolhido }: GraficoMaeTauProps) {
  const serie = curva.mae_por_iou[String(iou)] ?? []
  const dados: PontoCurva[] = curva.taus.map((tau, indice) => ({ tau, mae: serie[indice] ?? null }))

  let maeNoTauEscolhido: number | null = null
  let menorDistancia = Infinity
  for (const ponto of dados) {
    const distancia = Math.abs(ponto.tau - tauEscolhido)
    if (distancia < menorDistancia && ponto.mae !== null) {
      menorDistancia = distancia
      maeNoTauEscolhido = ponto.mae
    }
  }

  return (
    <div className="painel p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-texto">Erro de contagem × confiança mínima</h3>
          <p className="text-xs text-texto-fraco">MAE na validação para cada limiar (IoU {paraVirgula(iou)})</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-texto-suave">
          <span className="h-2 w-2 rounded-full bg-aviso" aria-hidden="true" />
          limiar escolhido {paraVirgula(tauEscolhido)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#27272A" vertical={false} />
          <XAxis
            dataKey="tau"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]}
            tick={{ fill: '#71717A', fontSize: 11 }}
            tickFormatter={(valor: number) => paraVirgula(valor)}
            stroke="#3F3F46"
            tickLine={false}
          />
          <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 9, fontSize: 12 }}
            labelStyle={{ color: '#A1A1AA' }}
            itemStyle={{ color: '#FAFAFA' }}
            labelFormatter={(valor) => `τ = ${paraVirgula(Number(valor))}`}
            formatter={(valor) => [paraVirgula(Number(valor)), 'MAE']}
          />
          <Line type="monotone" dataKey="mae" stroke="#FAFAFA" strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine x={tauEscolhido} stroke="#FBBF24" strokeDasharray="4 4" />
          {maeNoTauEscolhido !== null && (
            <ReferenceDot x={tauEscolhido} y={maeNoTauEscolhido} r={5} fill="#FBBF24" stroke="#09090B" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
