import { AlertTriangle, FlaskConical } from 'lucide-react'
import { paraVirgula } from '../formato'
import { CartaoMetrica } from './CartaoMetrica'
import { EstadoCarregando } from './EstadoCarregando'
import { EstadoVazio } from './EstadoVazio'
import { GraficoMaeTau } from './GraficoMaeTau'
import { TabelaPorClasse } from './TabelaPorClasse'
import type { EstadoAvaliacao, ResumoAvaliacao } from '../tipos'

interface AbaResultadosProps {
  estado: EstadoAvaliacao
  dados: ResumoAvaliacao | null
  classes: string[]
}

export function AbaResultados({ estado, dados, classes }: AbaResultadosProps) {
  if (estado === 'carregando') {
    return <EstadoCarregando texto="Carregando avaliação..." />
  }

  if (estado === 'erro') {
    return (
      <EstadoVazio
        titulo="Não foi possível carregar a avaliação"
        descricao="Verifique se a API está em execução e tente novamente."
        icone={<AlertTriangle className="h-5 w-5 text-erro" aria-hidden="true" />}
      />
    )
  }

  if (estado === 'vazio' || !dados) {
    return (
      <EstadoVazio
        titulo="Nenhuma avaliação encontrada"
        descricao={
          <code className="mono text-xs text-texto-suave">
            python scripts/avaliar_contagem.py --pesos &lt;pesos&gt; --data &lt;data.yaml&gt; --nome exp
          </code>
        }
        icone={<FlaskConical className="h-5 w-5 text-texto-suave" aria-hidden="true" />}
      />
    )
  }

  return (
    <div className="surgir flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-texto">Desempenho no conjunto de teste</h2>
        <p className="text-sm text-texto-fraco">
          Imagens que o modelo não viu no treino. Limiar de confiança calibrado na validação:{' '}
          <span className="mono text-texto-suave">{paraVirgula(dados.tau)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <CartaoMetrica rotulo="MAE" valor={paraVirgula(dados.total.mae)} descricao="peças erradas por imagem" />
        <CartaoMetrica rotulo="RMSE" valor={paraVirgula(dados.total.rmse)} descricao="penaliza erros grandes" />
        <CartaoMetrica rotulo="F1" valor={paraVirgula(dados.total.f1)} descricao="precisão × revocação" />
        <CartaoMetrica rotulo="mAP@0,5" valor={paraVirgula(dados.map50)} descricao="qualidade da detecção" />
        <CartaoMetrica rotulo="mAP@0,5:0,95" valor={paraVirgula(dados.map50_95)} descricao="exige caixas precisas" />
      </div>

      <TabelaPorClasse dados={dados} classes={classes} />

      <GraficoMaeTau curva={dados.curva} iou={dados.iou} tauEscolhido={dados.tau} />
    </div>
  )
}
