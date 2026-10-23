import { corDaClasse } from '../constantes'
import { paraVirgula } from '../formato'
import type { ResumoAvaliacao } from '../tipos'

interface TabelaPorClasseProps {
  dados: ResumoAvaliacao
  classes: string[]
}

const COLUNAS = ['Real', 'Previsto', 'MAE', 'RMSE', 'Precisão', 'Revocação', 'F1']

export function TabelaPorClasse({ dados, classes }: TabelaPorClasseProps) {
  const totalReal = classes.reduce((soma, nome) => soma + (dados.contagens?.[nome]?.real ?? 0), 0)
  const totalPrevisto = classes.reduce((soma, nome) => soma + (dados.contagens?.[nome]?.previsto ?? 0), 0)
  const celula = 'numeros px-4 py-3 text-right text-texto'

  return (
    <div className="painel overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-borda">
            <th className="rotulo-secao px-4 py-3 text-left">Classe</th>
            {COLUNAS.map((coluna) => (
              <th key={coluna} className="rotulo-secao px-4 py-3 text-right">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((nome) => {
            const metricas = dados.classes[nome]
            const contagem = dados.contagens?.[nome]
            if (!metricas) return null
            return (
              <tr key={nome} className="border-b border-borda transition-colors hover:bg-superficie-2">
                <td className="px-4 py-3 capitalize text-texto">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: corDaClasse(nome) }} aria-hidden="true" />
                    {nome}
                  </span>
                </td>
                <td className={celula}>{contagem ? contagem.real : '—'}</td>
                <td className={celula}>{contagem ? contagem.previsto : '—'}</td>
                <td className={celula}>{paraVirgula(metricas.mae)}</td>
                <td className={celula}>{paraVirgula(metricas.rmse)}</td>
                <td className={celula}>{paraVirgula(metricas.precisao)}</td>
                <td className={celula}>{paraVirgula(metricas.revocacao)}</td>
                <td className={celula}>{paraVirgula(metricas.f1)}</td>
              </tr>
            )
          })}
          <tr className="bg-superficie-2 font-semibold">
            <td className="px-4 py-3 text-texto">Total</td>
            <td className={celula}>{dados.contagens ? totalReal : '—'}</td>
            <td className={celula}>{dados.contagens ? totalPrevisto : '—'}</td>
            <td className={celula}>{paraVirgula(dados.total.mae)}</td>
            <td className={celula}>{paraVirgula(dados.total.rmse)}</td>
            <td className={celula}>{paraVirgula(dados.total.precisao)}</td>
            <td className={celula}>{paraVirgula(dados.total.revocacao)}</td>
            <td className={celula}>{paraVirgula(dados.total.f1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
