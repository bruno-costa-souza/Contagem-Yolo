import argparse
import random
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import yaml

from comum import caminho_rotulo, imprimir_tabela, ler_rotulos, listar_imagens


def analisar_argumentos():
    analisador = argparse.ArgumentParser(description="Divide um dataset em train/val/test")
    analisador.add_argument("--origem", required=True)
    analisador.add_argument("--somente-treino", default=None)
    analisador.add_argument("--destino", default="dataset")
    analisador.add_argument("--classes", nargs="+", required=True)
    analisador.add_argument("--proporcao", nargs=3, type=float, default=[0.70, 0.15, 0.15])
    analisador.add_argument("--grupo-sep", default=None)
    analisador.add_argument("--seed", type=int, default=42)
    return analisador.parse_args()


def montar_grupos(imagens, raiz_imagens, grupo_sep):
    grupos = defaultdict(list)
    for imagem in imagens:
        relativo = imagem.relative_to(raiz_imagens)
        if grupo_sep:
            chave = relativo.stem.split(grupo_sep)[0]
        else:
            chave = str(relativo)
        grupos[chave].append(imagem)
    return grupos


def distribuir_grupos(grupos, proporcao, seed):
    itens = list(grupos.items())
    random.Random(seed).shuffle(itens)
    itens.sort(key=lambda item: len(item[1]), reverse=True)
    total_imagens = sum(len(imgs) for _, imgs in itens)
    alvos = {"train": proporcao[0] * total_imagens, "val": proporcao[1] * total_imagens, "test": proporcao[2] * total_imagens}
    particoes = {"train": [], "val": [], "test": []}
    contagem_particao = {"train": 0, "val": 0, "test": 0}
    for _, imagens_grupo in itens:
        parte = max(alvos, key=lambda p: alvos[p] - contagem_particao[p])
        particoes[parte].extend(imagens_grupo)
        contagem_particao[parte] += len(imagens_grupo)
    return particoes


def main():
    args = analisar_argumentos()

    if len(args.classes) < 3:
        print("aviso: menos de 3 classes foram informadas")

    raiz_imagens = Path(args.origem) / "images"
    imagens = listar_imagens(raiz_imagens)
    if not imagens:
        print(f"erro: nenhuma imagem encontrada em {raiz_imagens}")
        sys.exit(1)

    extras = []
    if args.somente_treino:
        raiz_extras = Path(args.somente_treino) / "images"
        extras = listar_imagens(raiz_extras)
        if not extras:
            print(f"erro: nenhuma imagem encontrada em {raiz_extras}")
            sys.exit(1)
        nomes_origem = {imagem.relative_to(raiz_imagens) for imagem in imagens}
        for imagem in extras:
            if imagem.relative_to(raiz_extras) in nomes_origem:
                print(f"erro: nome repetido entre --origem e --somente-treino: {imagem.name}")
                sys.exit(1)

    raizes = {imagem: raiz_imagens for imagem in imagens}
    raizes.update({imagem: raiz_extras for imagem in extras})

    rotulos = {}
    for imagem in imagens + extras:
        rotulo = ler_rotulos(imagem)
        for classe in rotulo["classes"]:
            if classe < 0 or classe >= len(args.classes):
                print(f"erro: id de classe invalido ({classe}) em {imagem}")
                sys.exit(1)
        rotulos[imagem] = rotulo

    grupos = montar_grupos(imagens, raiz_imagens, args.grupo_sep)
    particoes = distribuir_grupos(grupos, args.proporcao, args.seed)
    particoes["train"].extend(extras)

    destino = Path(args.destino)
    estatisticas = {parte: {"imagens": 0, "objetos": [0] * len(args.classes)} for parte in particoes}

    for parte, imagens_parte in particoes.items():
        for imagem in imagens_parte:
            relativo = imagem.relative_to(raizes[imagem])

            destino_img = destino / "images" / parte / relativo
            destino_img.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(imagem, destino_img)

            rotulo_origem = caminho_rotulo(imagem)
            destino_rot = destino / "labels" / parte / relativo.with_suffix(".txt")
            destino_rot.parent.mkdir(parents=True, exist_ok=True)
            if rotulo_origem.exists():
                shutil.copy2(rotulo_origem, destino_rot)

            estatisticas[parte]["imagens"] += 1
            for classe in rotulos[imagem]["classes"]:
                estatisticas[parte]["objetos"][classe] += 1

    dados_yaml = {
        "path": str(destino.resolve()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {i: nome for i, nome in enumerate(args.classes)},
    }
    with open(destino / "data.yaml", "w", encoding="utf-8") as arquivo:
        yaml.safe_dump(dados_yaml, arquivo, allow_unicode=True, sort_keys=False)

    print(f"dataset gerado em {destino.resolve()}")
    cabecalho = ["particao", "imagens"] + args.classes
    linhas = [
        [parte, estatisticas[parte]["imagens"]] + estatisticas[parte]["objetos"]
        for parte in ["train", "val", "test"]
    ]
    imprimir_tabela(cabecalho, linhas)


if __name__ == "__main__":
    main()
