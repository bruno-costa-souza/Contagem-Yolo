const CORES_CLASSES: Record<string, string> = {
  parafuso: '#60A5FA',
  porca: '#FBBF24',
  arruela: '#34D399',
}

const COR_CLASSE_PADRAO = '#A1A1AA'

export function corDaClasse(nome: string): string {
  return CORES_CLASSES[nome] ?? COR_CLASSE_PADRAO
}

export const TAU_PADRAO = 0.25

export const IOU_PADRAO = 0.7

export const CLASSES_PADRAO = ['parafuso', 'porca', 'arruela']
