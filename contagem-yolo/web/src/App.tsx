import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buscarAvaliacao, buscarSaude } from './api'
import { AbaCamera } from './components/AbaCamera'
import { AbaContagem } from './components/AbaContagem'
import { AbaLote } from './components/AbaLote'
import { AbaResultados } from './components/AbaResultados'
import { Cabecalho } from './components/Cabecalho'
import { FundoGrade } from './components/FundoGrade'
import { CLASSES_PADRAO, TAU_PADRAO } from './constantes'
import type { Aba, EstadoAvaliacao, EstadoSaude, ResumoAvaliacao, Saude } from './tipos'

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('contagem')
  const [tau, setTau] = useState(TAU_PADRAO)

  const [saudeEstado, setSaudeEstado] = useState<EstadoSaude>('carregando')
  const [saude, setSaude] = useState<Saude | null>(null)

  const [avaliacaoEstado, setAvaliacaoEstado] = useState<EstadoAvaliacao>('carregando')
  const [avaliacao, setAvaliacao] = useState<ResumoAvaliacao | null>(null)

  useEffect(() => {
    buscarSaude()
      .then((dados) => {
        setSaude(dados)
        setSaudeEstado('ok')
      })
      .catch(() => setSaudeEstado('erro'))
  }, [])

  useEffect(() => {
    buscarAvaliacao()
      .then((dados) => {
        if (dados) {
          setAvaliacao(dados)
          setAvaliacaoEstado('ok')
          setTau(dados.tau)
        } else {
          setAvaliacaoEstado('vazio')
        }
      })
      .catch(() => setAvaliacaoEstado('erro'))
  }, [])

  const classes = saude?.classes ?? CLASSES_PADRAO

  return (
    <div className="relative min-h-screen">
      <FundoGrade />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <Cabecalho saudeEstado={saudeEstado} modelo={saude?.modelo ?? null} abaAtiva={abaAtiva} onMudarAba={setAbaAtiva} />

        {saudeEstado === 'erro' && (
          <div className="flex items-center gap-2 rounded-painel border border-erro/30 bg-erro/10 p-4 text-sm text-erro">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Não foi possível conectar à API em http://127.0.0.1:8000. Verifique se o servidor está em execução.
          </div>
        )}

        <main>
          {abaAtiva === 'contagem' && (
            <AbaContagem
              classes={classes}
              tau={tau}
              onMudarTau={setTau}
              tauCalibrado={avaliacaoEstado === 'ok' ? (avaliacao?.tau ?? null) : null}
            />
          )}
          {abaAtiva === 'camera' && (
            <AbaCamera
              classes={classes}
              tau={tau}
              onMudarTau={setTau}
              tauCalibrado={avaliacaoEstado === 'ok' ? (avaliacao?.tau ?? null) : null}
            />
          )}
          {abaAtiva === 'lote' && <AbaLote classes={classes} tau={tau} />}
          {abaAtiva === 'resultados' && <AbaResultados estado={avaliacaoEstado} dados={avaliacao} classes={classes} />}
        </main>
      </div>
    </div>
  )
}
