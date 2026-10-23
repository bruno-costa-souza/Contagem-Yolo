import argparse
import csv
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from comum import contar_por_classe, listar_imagens


def analisar_argumentos():
    analisador = argparse.ArgumentParser(description="Conta objetos por classe em imagens")
    analisador.add_argument("--pesos", required=True)
    analisador.add_argument("--fonte", required=True)
    analisador.add_argument("--conf", type=float, default=0.25)
    analisador.add_argument("--iou", type=float, default=0.7)
    analisador.add_argument("--imgsz", type=int, default=640)
    analisador.add_argument("--saida", default="runs/contagem")
    analisador.add_argument("--device", default=None)
    return analisador.parse_args()


def desenhar_painel(imagem, linhas):
    fonte = cv2.FONT_HERSHEY_SIMPLEX
    escala = 0.6
    espessura = 1
    espacamento = 8

    tamanhos = [cv2.getTextSize(linha, fonte, escala, espessura)[0] for linha in linhas]
    largura_texto = max(t[0] for t in tamanhos)
    altura_linha = max(t[1] for t in tamanhos) + espacamento
    largura_painel = largura_texto + espacamento * 2
    altura_painel = altura_linha * len(linhas) + espacamento

    cv2.rectangle(imagem, (0, 0), (largura_painel, altura_painel), (0, 0, 0), -1)
    for i, linha in enumerate(linhas):
        y = espacamento + altura_linha * i + tamanhos[i][1]
        cv2.putText(imagem, linha, (espacamento, y), fonte, escala, (255, 255, 255), espessura, cv2.LINE_AA)
    return imagem


def main():
    args = analisar_argumentos()

    modelo = YOLO(args.pesos)
    nomes_classes = modelo.names
    n_classes = len(nomes_classes)

    imagens = listar_imagens(args.fonte)
    if not imagens:
        print(f"erro: nenhuma imagem encontrada em {args.fonte}")
        return

    pasta_saida = Path(args.saida)
    pasta_saida.mkdir(parents=True, exist_ok=True)

    linhas_csv = []

    for imagem in imagens:
        resultado = modelo.predict(
            source=str(imagem),
            conf=args.conf,
            iou=args.iou,
            imgsz=args.imgsz,
            device=args.device,
            verbose=False,
        )[0]

        caixas = resultado.boxes
        if caixas is None or len(caixas) == 0:
            classes = np.zeros(0, dtype=int)
        else:
            classes = caixas.cls.cpu().numpy().astype(int)

        contagens = contar_por_classe(classes, np.ones(classes.shape[0]), 0.0, n_classes)
        total = int(contagens.sum())

        texto_contagens = ", ".join(f"{nomes_classes[i]}={contagens[i]}" for i in range(n_classes))
        print(f"{imagem.name}: {texto_contagens}, total={total}")

        linha = {"imagem": imagem.name}
        for i in range(n_classes):
            linha[nomes_classes[i]] = int(contagens[i])
        linha["total"] = total
        linhas_csv.append(linha)

        imagem_anotada = resultado.plot()
        linhas_painel = [f"{nomes_classes[i]}: {contagens[i]}" for i in range(n_classes)]
        linhas_painel.append(f"total: {total}")
        imagem_anotada = desenhar_painel(imagem_anotada, linhas_painel)

        cv2.imwrite(str(pasta_saida / imagem.name), imagem_anotada)

    with open(pasta_saida / "contagens.csv", "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linhas_csv[0].keys()))
        escritor.writeheader()
        escritor.writerows(linhas_csv)


if __name__ == "__main__":
    main()
