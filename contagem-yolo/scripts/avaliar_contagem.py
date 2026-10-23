import argparse
import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from ultralytics import YOLO
from ultralytics.data.utils import check_det_dataset

from comum import (
    associar_guloso,
    calcular_erros,
    coletar_predicoes,
    contar_por_classe,
    imprimir_tabela,
    ler_rotulos,
    listar_imagens,
    precisao_revocacao_f1,
)


def analisar_argumentos():
    analisador = argparse.ArgumentParser(description="Calibra o limiar de confianca e avalia a contagem")
    analisador.add_argument("--pesos", required=True)
    analisador.add_argument("--data", default="dataset/data.yaml")
    analisador.add_argument("--ious", nargs="+", type=float, default=[0.7])
    analisador.add_argument("--tau-min", type=float, default=0.01)
    analisador.add_argument("--tau-max", type=float, default=0.95)
    analisador.add_argument("--tau-passo", type=float, default=0.01)
    analisador.add_argument("--imgsz", type=int, default=640)
    analisador.add_argument("--device", default=None)
    analisador.add_argument("--nome", default="exp")
    return analisador.parse_args()


def resolver_imagens(origem):
    if isinstance(origem, (list, tuple)):
        todas = []
        for item in origem:
            todas.extend(listar_imagens(item))
        return sorted(todas)
    return listar_imagens(origem)


def contagens_reais_por_imagem(rotulo, n_classes):
    classes = rotulo["classes"]
    escores = np.ones(classes.shape[0])
    return contar_por_classe(classes, escores, 0.0, n_classes)


def main():
    args = analisar_argumentos()

    dados = check_det_dataset(args.data)
    nomes_classes = dados["names"]
    n_classes = len(nomes_classes)

    modelo = YOLO(args.pesos)

    imagens_val = resolver_imagens(dados["val"])
    imagens_teste = resolver_imagens(dados["test"])

    rotulos_val = {str(img): ler_rotulos(img) for img in imagens_val}
    reais_val = {
        caminho: contagens_reais_por_imagem(rotulo, n_classes)
        for caminho, rotulo in rotulos_val.items()
    }
    totais_reais_val = np.array([reais_val[str(img)].sum() for img in imagens_val])

    tau_valores = np.arange(args.tau_min, args.tau_max + 1e-9, args.tau_passo)

    pasta_saida = Path("runs/avaliacao") / args.nome
    pasta_saida.mkdir(parents=True, exist_ok=True)

    melhor_combo = None
    curvas = {}

    for iou in args.ious:
        predicoes_val = coletar_predicoes(modelo, imagens_val, iou=iou, imgsz=args.imgsz, device=args.device)

        maes = []
        rmses = []
        for tau in tau_valores:
            totais_previstos = np.array([
                contar_por_classe(
                    predicoes_val[str(img)]["classes"],
                    predicoes_val[str(img)]["escores"],
                    tau,
                    n_classes,
                ).sum()
                for img in imagens_val
            ])
            mae, rmse, _ = calcular_erros(totais_reais_val, totais_previstos)
            maes.append(mae)
            rmses.append(rmse)

        curvas[iou] = maes

        indice_melhor = 0
        melhor_tupla_iou = (maes[0], rmses[0])
        for i in range(1, len(tau_valores)):
            tupla_atual = (maes[i], rmses[i])
            if tupla_atual < melhor_tupla_iou:
                melhor_tupla_iou = tupla_atual
                indice_melhor = i

        tau_melhor_iou = float(tau_valores[indice_melhor])
        if tau_melhor_iou <= args.tau_min:
            print(f"aviso: tau escolhido no limite inferior para iou={iou}")

        tupla_global = (melhor_tupla_iou[0], melhor_tupla_iou[1], iou, tau_melhor_iou)
        if melhor_combo is None or (tupla_global[0], tupla_global[1]) < (melhor_combo[0], melhor_combo[1]):
            melhor_combo = tupla_global

    _, _, iou_final, tau_final = melhor_combo

    plt.figure()
    for iou, maes in curvas.items():
        plt.plot(tau_valores, maes, label=f"iou={iou}")
    plt.xlabel("tau")
    plt.ylabel("mae")
    plt.legend()
    plt.title("mae em funcao de tau")
    plt.savefig(pasta_saida / "mae_vs_tau.png")
    plt.close()

    print(f"iou escolhido: {iou_final}, tau escolhido: {tau_final:.2f}")

    predicoes_teste = coletar_predicoes(modelo, imagens_teste, iou=iou_final, imgsz=args.imgsz, device=args.device)
    rotulos_teste = {str(img): ler_rotulos(img) for img in imagens_teste}

    linhas_csv = []
    reais_matriz = []
    previstos_matriz = []
    vp_total = np.zeros(n_classes, dtype=int)
    fp_total = np.zeros(n_classes, dtype=int)
    fn_total = np.zeros(n_classes, dtype=int)

    for imagem in imagens_teste:
        caminho = str(imagem)
        rotulo = rotulos_teste[caminho]
        predicao = predicoes_teste[caminho]

        reais = contagens_reais_por_imagem(rotulo, n_classes)
        previstos = contar_por_classe(predicao["classes"], predicao["escores"], tau_final, n_classes)
        reais_matriz.append(reais)
        previstos_matriz.append(previstos)

        mascara_tau = predicao["escores"] >= tau_final
        vp, fp, fn = associar_guloso(
            rotulo["classes"],
            rotulo["caixas"],
            predicao["classes"][mascara_tau],
            predicao["caixas"][mascara_tau],
            predicao["escores"][mascara_tau],
            n_classes,
        )
        vp_total += vp
        fp_total += fp
        fn_total += fn

        linha = {"imagem": imagem.name}
        for i in range(n_classes):
            linha[f"{nomes_classes[i]}_real"] = int(reais[i])
            linha[f"{nomes_classes[i]}_previsto"] = int(previstos[i])
        linha["total_real"] = int(reais.sum())
        linha["total_previsto"] = int(previstos.sum())
        linhas_csv.append(linha)

    reais_matriz = np.array(reais_matriz)
    previstos_matriz = np.array(previstos_matriz)

    precisao, revocacao, f1 = precisao_revocacao_f1(vp_total, fp_total, fn_total)

    linhas_tabela = []
    resumo_classes = {}
    for i in range(n_classes):
        mae, rmse, erro_medio = calcular_erros(reais_matriz[:, i], previstos_matriz[:, i])
        linhas_tabela.append([
            nomes_classes[i], f"{mae:.3f}", f"{rmse:.3f}", f"{erro_medio:.3f}",
            f"{precisao[i]:.3f}", f"{revocacao[i]:.3f}", f"{f1[i]:.3f}",
        ])
        resumo_classes[nomes_classes[i]] = {
            "mae": mae, "rmse": rmse, "erro_medio": erro_medio,
            "precisao": float(precisao[i]), "revocacao": float(revocacao[i]), "f1": float(f1[i]),
        }

    mae_t, rmse_t, erro_medio_t = calcular_erros(reais_matriz.sum(axis=1), previstos_matriz.sum(axis=1))
    vp_t, fp_t, fn_t = int(vp_total.sum()), int(fp_total.sum()), int(fn_total.sum())
    precisao_t, revocacao_t, f1_t = precisao_revocacao_f1(vp_t, fp_t, fn_t)
    linhas_tabela.append([
        "total", f"{mae_t:.3f}", f"{rmse_t:.3f}", f"{erro_medio_t:.3f}",
        f"{float(precisao_t):.3f}", f"{float(revocacao_t):.3f}", f"{float(f1_t):.3f}",
    ])

    imprimir_tabela(["classe", "mae", "rmse", "erro_medio", "precisao", "revocacao", "f1"], linhas_tabela)

    resultado_val = modelo.val(
        data=args.data,
        split="test",
        iou=iou_final,
        imgsz=args.imgsz,
        device=args.device,
        project=str(pasta_saida.resolve()),
        name="val_teste",
    )
    map50 = float(resultado_val.box.map50)
    map50_95 = float(resultado_val.box.map)
    print(f"map50: {map50:.3f}, map50-95: {map50_95:.3f}")

    resumo = {
        "iou": iou_final,
        "tau": tau_final,
        "classes": resumo_classes,
        "total": {
            "mae": mae_t, "rmse": rmse_t, "erro_medio": erro_medio_t,
            "precisao": float(precisao_t), "revocacao": float(revocacao_t), "f1": float(f1_t),
        },
        "map50": map50,
        "map50_95": map50_95,
        "curva": {
            "taus": [float(t) for t in tau_valores],
            "mae_por_iou": {str(iou): maes for iou, maes in curvas.items()},
        },
    }
    with open(pasta_saida / "resumo.json", "w", encoding="utf-8") as arquivo:
        json.dump(resumo, arquivo, ensure_ascii=False, indent=2)

    with open(pasta_saida / "contagens_teste.csv", "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linhas_csv[0].keys()))
        escritor.writeheader()
        escritor.writerows(linhas_csv)


if __name__ == "__main__":
    main()
