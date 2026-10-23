export function paraVirgula(valor: number, casas = 2): string {
  return valor.toFixed(casas).replace('.', ',')
}
