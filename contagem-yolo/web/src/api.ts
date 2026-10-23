import type { RespostaContagem, ResumoAvaliacao, Saude } from './tipos'

const BASE = '/api'

export async function buscarSaude(): Promise<Saude> {
  const resposta = await fetch(`${BASE}/saude`)
  if (!resposta.ok) {
    throw new Error('falha ao consultar status da API')
  }
  return (await resposta.json()) as Saude
}

export async function contarImagem(arquivo: Blob, iou: number): Promise<RespostaContagem> {
  const formulario = new FormData()
  formulario.append('imagem', arquivo, arquivo instanceof File ? arquivo.name : 'quadro.jpg')
  formulario.append('iou', String(iou))
  const resposta = await fetch(`${BASE}/contar`, { method: 'POST', body: formulario })
  if (!resposta.ok) {
    throw new Error('falha ao processar a imagem')
  }
  return (await resposta.json()) as RespostaContagem
}

export async function buscarAvaliacao(): Promise<ResumoAvaliacao | null> {
  const resposta = await fetch(`${BASE}/avaliacao`)
  if (resposta.status === 404) {
    return null
  }
  if (!resposta.ok) {
    throw new Error('falha ao consultar avaliacao')
  }
  return (await resposta.json()) as ResumoAvaliacao
}
