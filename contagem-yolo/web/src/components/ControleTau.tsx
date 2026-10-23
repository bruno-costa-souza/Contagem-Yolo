import { RotateCcw } from 'lucide-react'
import { paraVirgula } from '../formato'

interface ControleTauProps {
  tau: number
  onMudar: (valor: number) => void
  tauCalibrado: number | null
}

const MINIMO = 0.05
const MAXIMO = 0.95

export function ControleTau({ tau, onMudar, tauCalibrado }: ControleTauProps) {
  const progresso = ((tau - MINIMO) / (MAXIMO - MINIMO)) * 100
  const usandoCalibrado = tauCalibrado !== null && Math.abs(tau - tauCalibrado) < 0.005

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor="controle-tau" className="text-sm text-texto-suave">
          Confiança mínima
        </label>
        <span className="mono rounded-md bg-superficie-3 px-2 py-0.5 text-sm text-texto">{paraVirgula(tau)}</span>
      </div>
      <input
        id="controle-tau"
        type="range"
        min={MINIMO}
        max={MAXIMO}
        step={0.01}
        value={tau}
        onChange={(evento) => onMudar(Number(evento.target.value))}
        className="faixa w-full"
        style={{ ['--progresso' as string]: `${progresso}%` }}
      />
      <div className="flex items-center justify-between gap-2 text-xs">
        {usandoCalibrado ? (
          <span className="flex items-center gap-1.5 text-sucesso">
            <span className="h-1.5 w-1.5 rounded-full bg-sucesso" aria-hidden="true" />
            Valor calibrado na validação
          </span>
        ) : (
          <span className="text-texto-fraco">
            {tauCalibrado !== null ? 'Ajuste manual' : 'Sem calibração disponível'}
          </span>
        )}
        {tauCalibrado !== null && !usandoCalibrado && (
          <button
            type="button"
            onClick={() => onMudar(tauCalibrado)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-texto-suave transition-colors hover:bg-superficie-3 hover:text-texto"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Voltar para {paraVirgula(tauCalibrado)}
          </button>
        )}
      </div>
    </div>
  )
}
