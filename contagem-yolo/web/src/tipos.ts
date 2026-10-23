export type Aba = 'contagem' | 'camera' | 'lote' | 'resultados'

export type EstadoSaude = 'carregando' | 'ok' | 'erro'

export type EstadoAvaliacao = 'carregando' | 'ok' | 'vazio' | 'erro'

export interface Deteccao {
  classe: number
  nome: string
  confianca: number
  caixa: [number, number, number, number]
}

export interface RespostaContagem {
  largura: number
  altura: number
  tempo_ms: number
  deteccoes: Deteccao[]
}

export interface Saude {
  status: string
  modelo: string
  classes: string[]
}

export interface MetricasClasse {
  mae: number
  rmse: number
  erro_medio: number
  precisao: number
  revocacao: number
  f1: number
}

export interface ContagemAgregada {
  real: number
  previsto: number
}

export interface CurvaCalibragem {
  taus: number[]
  mae_por_iou: Record<string, number[]>
}

export interface ResumoAvaliacao {
  iou: number
  tau: number
  classes: Record<string, MetricasClasse>
  total: MetricasClasse
  map50: number
  map50_95: number
  curva: CurvaCalibragem
  contagens?: Record<string, ContagemAgregada>
}
