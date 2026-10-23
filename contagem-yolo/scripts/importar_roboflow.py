import argparse
import re
import sys
import zipfile
from pathlib import Path

import yaml

from comum import listar_imagens

PADRAO_NOME = re.compile(r"^(.+)_(jpe?g|png|bmp|webp)\.rf\.[0-9a-f]+$", re.IGNORECASE)


def analisar_argumentos():
    analisador = argparse.ArgumentParser(description="Importa rotulos exportados do Roboflow (formato YOLO)")
    analisador.add_argument("--zip", required=True)
    analisador.add_argument("--classes", nargs="+", required=True)
    analisador.add_argument("--pastas", nargs="+", default=["dados_brutos", "dados_sinteticos"])
    analisador.add_argument("--sem-rotulo", default="sem_rotulo")
    return analisador.parse_args()


def ler_linhas(texto):
    caixas = []
    for linha in texto.splitlines():
        valores = linha.split()
        if not valores:
            continue
        while len(valores) == 9:
            caixas.append([valores[0], valores[1], valores[2], valores[3], valores[4][:-1]])
            valores = [valores[4][-1]] + valores[5:]
        if len(valores) != 5:
            raise ValueError(f"linha invalida: {linha}")
        caixas.append(valores)
    return caixas


def main():
    args = analisar_argumentos()

    with zipfile.ZipFile(args.zip) as arquivo_zip:
        nomes = arquivo_zip.namelist()
        dados_yaml = yaml.safe_load(arquivo_zip.read(next(n for n in nomes if n.endswith("data.yaml"))))
        nomes_roboflow = dados_yaml["names"]
        if isinstance(nomes_roboflow, dict):
            nomes_roboflow = [nomes_roboflow[i] for i in sorted(nomes_roboflow)]
        faltando = [nome for nome in nomes_roboflow if nome not in args.classes]
        if faltando:
            print(f"erro: classes do Roboflow fora de --classes: {faltando}")
            sys.exit(1)
        mapa = {str(i): str(args.classes.index(nome)) for i, nome in enumerate(nomes_roboflow)}

        imagens_locais = {}
        for pasta in args.pastas:
            for subpasta in ["images", args.sem_rotulo]:
                for imagem in listar_imagens(Path(pasta) / subpasta):
                    imagens_locais[imagem.stem] = imagem

        importadas = set()
        for nome in nomes:
            if "/labels/" not in nome or not nome.endswith(".txt"):
                continue
            correspondencia = PADRAO_NOME.match(Path(nome).stem)
            original = correspondencia.group(1) if correspondencia else Path(nome).stem
            candidatas = [s for s in imagens_locais if s == original or s.endswith("_" + original)]
            if len(candidatas) != 1:
                print(f"erro: {len(candidatas)} imagens locais para {original}")
                sys.exit(1)
            imagem = imagens_locais[candidatas[0]]
            if imagem.parent.name == args.sem_rotulo:
                imagem = imagem.rename(imagem.parent.parent / "images" / imagem.name)

            linhas = []
            for valores in ler_linhas(arquivo_zip.read(nome).decode("utf-8")):
                coords = [float(v) for v in valores[1:]]
                if valores[0] not in mapa or not all(0.0 <= c <= 1.0 for c in coords):
                    print(f"erro: caixa invalida em {original}: {valores}")
                    sys.exit(1)
                linhas.append(" ".join([mapa[valores[0]]] + valores[1:]))

            destino = imagem.parent.parent / "labels" / f"{imagem.stem}.txt"
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text("\n".join(linhas) + "\n", encoding="utf-8")
            importadas.add(imagem.stem)

    sem_rotulo = [imagem for stem, imagem in imagens_locais.items() if stem not in importadas]
    for imagem in sem_rotulo:
        if imagem.parent.name == args.sem_rotulo:
            continue
        pasta = imagem.parent.parent / args.sem_rotulo
        pasta.mkdir(exist_ok=True)
        imagem.rename(pasta / imagem.name)
        print(f"sem rotulo, movida para {pasta}: {imagem.name}")

    print(f"{len(importadas)} imagens rotuladas, {len(sem_rotulo)} sem rotulo")


if __name__ == "__main__":
    main()
