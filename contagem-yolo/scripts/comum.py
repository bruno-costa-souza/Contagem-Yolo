from pathlib import Path

import numpy as np

EXTENSOES_IMAGEM = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def listar_imagens(origem):
    origem = Path(origem)
    if origem.is_file():
        if origem.suffix.lower() in EXTENSOES_IMAGEM:
            return [origem]
        return []
    if not origem.exists():
        return []
    arquivos = [p for p in origem.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSOES_IMAGEM]
    return sorted(arquivos)


def caminho_rotulo(caminho_imagem):
    caminho_imagem = Path(caminho_imagem)
    partes = list(caminho_imagem.parts)
    indice = None
    for i in range(len(partes) - 1, -1, -1):
        if partes[i] == "images":
            indice = i
            break
    if indice is None:
        raise ValueError(f"caminho sem pasta images: {caminho_imagem}")
    partes[indice] = "labels"
    return Path(*partes).with_suffix(".txt")


def ler_rotulos(caminho_imagem):
    caminho_txt = caminho_rotulo(caminho_imagem)
    classes = []
    caixas = []
    if caminho_txt.exists():
        with open(caminho_txt, "r", encoding="utf-8") as arquivo:
            for linha in arquivo:
                linha = linha.strip()
                if not linha:
                    continue
                valores = linha.split()
                classes.append(int(float(valores[0])))
                caixas.append([float(v) for v in valores[1:5]])
    if not classes:
        return {"classes": np.zeros(0, dtype=int), "caixas": np.zeros((0, 4), dtype=float)}
    return {"classes": np.array(classes, dtype=int), "caixas": np.array(caixas, dtype=float)}


def coletar_predicoes(modelo, imagens, iou, imgsz=640, device=None):
    predicoes = {}
    for caminho in imagens:
        resultado = modelo.predict(
            source=str(caminho),
            conf=0.001,
            iou=iou,
            max_det=1000,
            imgsz=imgsz,
            device=device,
            verbose=False,
        )[0]
        caixas_obj = resultado.boxes
        if caixas_obj is None or len(caixas_obj) == 0:
            predicoes[str(caminho)] = {
                "classes": np.zeros(0, dtype=int),
                "escores": np.zeros(0, dtype=float),
                "caixas": np.zeros((0, 4), dtype=float),
            }
        else:
            predicoes[str(caminho)] = {
                "classes": caixas_obj.cls.cpu().numpy().astype(int),
                "escores": caixas_obj.conf.cpu().numpy().astype(float),
                "caixas": caixas_obj.xywhn.cpu().numpy().astype(float),
            }
    return predicoes


def contar_por_classe(classes, escores, tau, n_classes):
    classes = np.asarray(classes)
    escores = np.asarray(escores)
    if classes.size == 0:
        return np.zeros(n_classes, dtype=int)
    selecionadas = classes[escores >= tau]
    if selecionadas.size == 0:
        return np.zeros(n_classes, dtype=int)
    return np.bincount(selecionadas.astype(int), minlength=n_classes)[:n_classes]


def calcular_erros(reais, previstos):
    reais = np.asarray(reais, dtype=float)
    previstos = np.asarray(previstos, dtype=float)
    diferenca = previstos - reais
    mae = float(np.mean(np.abs(diferenca)))
    rmse = float(np.sqrt(np.mean(diferenca ** 2)))
    erro_medio = float(np.mean(diferenca))
    return mae, rmse, erro_medio


def matriz_iou(caixas1, caixas2):
    caixas1 = np.asarray(caixas1, dtype=float).reshape(-1, 4)
    caixas2 = np.asarray(caixas2, dtype=float).reshape(-1, 4)
    n = caixas1.shape[0]
    m = caixas2.shape[0]
    matriz = np.zeros((n, m), dtype=float)
    if n == 0 or m == 0:
        return matriz
    x1_min = caixas1[:, 0] - caixas1[:, 2] / 2
    x1_max = caixas1[:, 0] + caixas1[:, 2] / 2
    y1_min = caixas1[:, 1] - caixas1[:, 3] / 2
    y1_max = caixas1[:, 1] + caixas1[:, 3] / 2
    x2_min = caixas2[:, 0] - caixas2[:, 2] / 2
    x2_max = caixas2[:, 0] + caixas2[:, 2] / 2
    y2_min = caixas2[:, 1] - caixas2[:, 3] / 2
    y2_max = caixas2[:, 1] + caixas2[:, 3] / 2
    for i in range(n):
        inter_x = np.clip(np.minimum(x1_max[i], x2_max) - np.maximum(x1_min[i], x2_min), 0, None)
        inter_y = np.clip(np.minimum(y1_max[i], y2_max) - np.maximum(y1_min[i], y2_min), 0, None)
        intersecao = inter_x * inter_y
        area1 = caixas1[i, 2] * caixas1[i, 3]
        area2 = caixas2[:, 2] * caixas2[:, 3]
        uniao = area1 + area2 - intersecao
        matriz[i] = np.where(uniao > 0, intersecao / uniao, 0.0)
    return matriz


def associar_guloso(classes_reais, caixas_reais, classes_preditas, caixas_preditas, escores_preditas, n_classes, limite_iou=0.5):
    classes_reais = np.asarray(classes_reais)
    classes_preditas = np.asarray(classes_preditas)
    escores_preditas = np.asarray(escores_preditas)
    caixas_reais = np.asarray(caixas_reais, dtype=float).reshape(-1, 4)
    caixas_preditas = np.asarray(caixas_preditas, dtype=float).reshape(-1, 4)
    vp = np.zeros(n_classes, dtype=int)
    fp = np.zeros(n_classes, dtype=int)
    fn = np.zeros(n_classes, dtype=int)
    for classe in range(n_classes):
        caixas_r = caixas_reais[classes_reais == classe]
        mascara_p = classes_preditas == classe
        caixas_p = caixas_preditas[mascara_p]
        escores_p = escores_preditas[mascara_p]
        n_r = caixas_r.shape[0]
        n_p = caixas_p.shape[0]
        if n_p == 0:
            fn[classe] = n_r
            continue
        ordem = np.argsort(-escores_p)
        usados = np.zeros(n_r, dtype=bool)
        matriz = matriz_iou(caixas_p, caixas_r)
        acertos = 0
        for indice in ordem:
            if n_r == 0:
                break
            candidatos = np.where((~usados) & (matriz[indice] >= limite_iou))[0]
            if candidatos.size == 0:
                continue
            melhor = candidatos[np.argmax(matriz[indice, candidatos])]
            usados[melhor] = True
            acertos += 1
        vp[classe] = acertos
        fp[classe] = n_p - acertos
        fn[classe] = n_r - int(usados.sum())
    return vp, fp, fn


def precisao_revocacao_f1(vp, fp, fn):
    vp = np.asarray(vp, dtype=float)
    fp = np.asarray(fp, dtype=float)
    fn = np.asarray(fn, dtype=float)
    precisao = np.divide(vp, vp + fp, out=np.zeros_like(vp), where=(vp + fp) > 0)
    revocacao = np.divide(vp, vp + fn, out=np.zeros_like(vp), where=(vp + fn) > 0)
    soma = precisao + revocacao
    f1 = np.divide(2 * precisao * revocacao, soma, out=np.zeros_like(vp), where=soma > 0)
    return precisao, revocacao, f1


def imprimir_tabela(cabecalho, linhas):
    larguras = [len(str(c)) for c in cabecalho]
    for linha in linhas:
        for i, valor in enumerate(linha):
            larguras[i] = max(larguras[i], len(str(valor)))

    def formatar(linha):
        return " | ".join(str(valor).ljust(larguras[i]) for i, valor in enumerate(linha))

    print(formatar(cabecalho))
    print("-+-".join("-" * l for l in larguras))
    for linha in linhas:
        print(formatar(linha))
