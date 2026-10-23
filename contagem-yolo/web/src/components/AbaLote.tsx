import { AlertTriangle, Download, Images, Loader2, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { contarImagem } from '../api'
import { IOU_PADRAO, corDaClasse } from '../constantes'
import { exportarCsv } from '../csv'
import { paraVirgula } from '../formato'
import type { RespostaContagem } from '../tipos'

interface ItemLote {
  id: string
  nome: string
  estado: 'carregando' | 'ok' | 'erro'
  resposta?: RespostaContagem
}

interface AbaLoteProps {
  classes: string[]
  tau: number
}


export function AbaLote({ classes, tau }: AbaLoteProps) {
  const [itens, setItens] = useState<ItemLote[]>([])
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function processarArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    const arquivos = Array.from(lista).filter((arquivo) => arquivo.type.startsWith('image/'))
    const novosItens: ItemLote[] = arquivos.map((arquivo) => ({
      id: `${arquivo.name}-${arquivo.lastModified}-${Math.random().toString(36).slice(2)}`,
      nome: arquivo.name,
      estado: 'carregando',
    }))

    setItens((atual) => [...atual, ...novosItens])

    novosItens.forEach((item, indice) => {
      const arquivo = arquivos[indice]
      if (!arquivo) return
      contarImagem(arquivo, IOU_PADRAO)
        .then((resposta) => {
          setItens((atual) => atual.map((i) => (i.id === item.id ? { ...i, estado: 'ok', resposta } : i)))
        })
        .catch(() => {
          setItens((atual) => atual.map((i) => (i.id === item.id ? { ...i, estado: 'erro' } : i)))
        })
    })
  }

  const linhas = useMemo(
    () =>
      itens.map((item) => {
        const contagens = new Map<string, number>()
        for (const nome of classes) contagens.set(nome, 0)
        let total = 0
        if (item.resposta) {
          for (const deteccao of item.resposta.deteccoes) {
            if (deteccao.confianca >= tau) {
              contagens.set(deteccao.nome, (contagens.get(deteccao.nome) ?? 0) + 1)
              total += 1
            }
          }
        }
        return { item, contagens, total }
      }),
    [itens, classes, tau],
  )

  const concluidas = linhas.filter(({ item }) => item.estado === 'ok')
  const pendentes = linhas.filter(({ item }) => item.estado === 'carregando').length
  const somaClasses = new Map(classes.map((nome) => [nome, concluidas.reduce((s, l) => s + (l.contagens.get(nome) ?? 0), 0)]))
  const somaTotal = concluidas.reduce((s, l) => s + l.total, 0)

  function exportar() {
    const cabecalho = ['imagem', ...classes, 'total']
    const corpo = concluidas.map(({ item, contagens, total }): Array<string | number> => [
      item.nome,
      ...classes.map((nome) => contagens.get(nome) ?? 0),
      total,
    ])
    exportarCsv('lote.csv', cabecalho, corpo)
  }

  const entrada = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="sr-only"
      onChange={(evento) => {
        processarArquivos(evento.target.files)
        evento.target.value = ''
      }}
    />
  )

  if (itens.length === 0) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Selecionar ou soltar várias imagens"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(evento) => {
          evento.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault()
          setArrastando(false)
          processarArquivos(evento.dataTransfer.files)
        }}
        className={`group flex min-h-[360px] cursor-pointer flex-col items-center justify-center gap-5 rounded-painel border border-dashed p-8 text-center transition-colors ${
          arrastando ? 'border-foco bg-foco/5' : 'border-borda-forte bg-superficie hover:border-texto-fraco'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-borda-forte bg-superficie-2 text-texto-suave group-hover:text-texto">
          <Images className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium text-texto">Conte várias fotos de uma vez</p>
          <p className="text-sm text-texto-fraco">Arraste as imagens aqui ou clique para selecionar</p>
        </div>
        <span className="botao botao-primario pointer-events-none">Selecionar imagens</span>
        {entrada}
      </div>
    )
  }

  return (
    <div className="surgir flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold tracking-tight text-texto">
            {itens.length} {itens.length === 1 ? 'imagem' : 'imagens'}
          </h2>
          <p className="text-sm text-texto-fraco">
            {pendentes > 0 ? `${pendentes} em processamento · ` : ''}confiança mínima{' '}
            <span className="mono text-texto-suave">{paraVirgula(tau)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setItens([])} className="botao text-texto-suave hover:text-texto">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Limpar
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} className="botao botao-secundario">
            <Images className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </button>
          <button type="button" disabled={concluidas.length === 0} onClick={exportar} className="botao botao-primario">
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
        {entrada}
      </div>

      <div className="painel overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borda">
              <th className="rotulo-secao px-4 py-3 text-left">Imagem</th>
              {classes.map((nome) => (
                <th key={nome} className="rotulo-secao px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: corDaClasse(nome) }} aria-hidden="true" />
                    {nome}
                  </span>
                </th>
              ))}
              <th className="rotulo-secao px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ item, contagens, total }) => (
              <tr key={item.id} className="border-b border-borda transition-colors hover:bg-superficie-2">
                <td className="max-w-[260px] truncate px-4 py-3 text-texto">{item.nome}</td>
                {item.estado === 'carregando' && (
                  <td colSpan={classes.length + 1} className="px-4 py-3 text-right text-texto-fraco">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      processando
                    </span>
                  </td>
                )}
                {item.estado === 'erro' && (
                  <td colSpan={classes.length + 1} className="px-4 py-3 text-right text-erro">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      falha ao processar
                    </span>
                  </td>
                )}
                {item.estado === 'ok' && (
                  <>
                    {classes.map((nome) => (
                      <td key={nome} className="numeros px-4 py-3 text-right text-texto-suave">
                        {contagens.get(nome) ?? 0}
                      </td>
                    ))}
                    <td className="numeros px-4 py-3 text-right font-semibold text-texto">{total}</td>
                  </>
                )}
              </tr>
            ))}
            {concluidas.length > 1 && (
              <tr className="bg-superficie-2 font-semibold">
                <td className="px-4 py-3 text-texto">Soma</td>
                {classes.map((nome) => (
                  <td key={nome} className="numeros px-4 py-3 text-right text-texto">
                    {somaClasses.get(nome)}
                  </td>
                ))}
                <td className="numeros px-4 py-3 text-right text-texto">{somaTotal}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
