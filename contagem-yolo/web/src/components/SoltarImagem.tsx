import { ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { corDaClasse } from '../constantes'

interface SoltarImagemProps {
  onArquivo: (arquivo: File) => void
  classes: string[]
}

export function SoltarImagem({ onArquivo, classes }: SoltarImagemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  function tratarLista(lista: FileList | null) {
    const arquivo = lista?.[0]
    if (arquivo) onArquivo(arquivo)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Selecionar ou soltar imagem para contagem"
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
        tratarLista(evento.dataTransfer.files)
      }}
      className={`group flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-5 rounded-painel border border-dashed p-8 text-center transition-colors ${
        arrastando ? 'border-foco bg-foco/5' : 'border-borda-forte bg-superficie hover:border-texto-fraco'
      }`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
          arrastando ? 'border-foco/40 bg-foco/10 text-foco' : 'border-borda-forte bg-superficie-2 text-texto-suave group-hover:text-texto'
        }`}
      >
        <ImagePlus className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-texto">{arrastando ? 'Solte para contar' : 'Arraste uma foto das peças'}</p>
        <p className="text-sm text-texto-fraco">ou clique para escolher um arquivo · JPG, PNG, WEBP</p>
      </div>
      <span className="botao botao-primario pointer-events-none">Selecionar imagem</span>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {classes.map((nome) => (
          <span
            key={nome}
            className="flex items-center gap-1.5 rounded-full border border-borda bg-superficie-2 px-2.5 py-1 text-xs capitalize text-texto-suave"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: corDaClasse(nome) }} aria-hidden="true" />
            {nome}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(evento) => {
          tratarLista(evento.target.files)
          evento.target.value = ''
        }}
      />
    </div>
  )
}
