function formatarCampoCsv(valor: string | number): string {
  const texto = String(valor)
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export function exportarCsv(nomeArquivo: string, cabecalho: string[], linhas: Array<Array<string | number>>): void {
  const linhasTexto = [cabecalho, ...linhas].map((linha) => linha.map(formatarCampoCsv).join(';'))
  const conteudo = linhasTexto.join('\r\n')
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
