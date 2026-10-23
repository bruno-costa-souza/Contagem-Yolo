import csv
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from ultralytics import YOLO

CAMINHO_PESOS = os.environ.get("MODELO", "runs/treino/yolo11n_zero/weights/best.pt")
PASTA_AVALIACAO = os.environ.get("AVALIACAO", "runs/avaliacao/exp")

estado = {}


def obter_nome_modelo(caminho):
    caminho = Path(caminho)
    if caminho.parent.name == "weights":
        return caminho.parent.parent.name
    return caminho.stem


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    estado["modelo"] = YOLO(CAMINHO_PESOS)
    estado["nome_modelo"] = obter_nome_modelo(CAMINHO_PESOS)
    yield
    estado.clear()


app = FastAPI(title="Contagem de Pecas", lifespan=ciclo_de_vida)


@app.get("/saude")
def saude():
    modelo = estado["modelo"]
    nomes = [modelo.names[i] for i in sorted(modelo.names)]
    return {"status": "ok", "modelo": estado["nome_modelo"], "classes": nomes}


@app.post("/contar")
def contar(imagem: UploadFile = File(...), iou: float = Form(0.7)):
    dados = imagem.file.read()
    buffer = np.frombuffer(dados, dtype=np.uint8)
    matriz = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if matriz is None:
        raise HTTPException(status_code=400, detail="arquivo de imagem invalido")

    modelo = estado["modelo"]
    altura, largura = matriz.shape[:2]

    inicio = time.perf_counter()
    resultado = modelo.predict(source=matriz, conf=0.01, iou=iou, max_det=1000, verbose=False)[0]
    tempo_ms = (time.perf_counter() - inicio) * 1000

    deteccoes = []
    caixas = resultado.boxes
    if caixas is not None and len(caixas) > 0:
        classes = caixas.cls.cpu().numpy().astype(int)
        confs = caixas.conf.cpu().numpy().astype(float)
        xywhn = caixas.xywhn.cpu().numpy().astype(float)
        for i in range(len(classes)):
            deteccoes.append({
                "classe": int(classes[i]),
                "nome": modelo.names[int(classes[i])],
                "confianca": float(confs[i]),
                "caixa": [float(v) for v in xywhn[i]],
            })

    return {
        "largura": largura,
        "altura": altura,
        "tempo_ms": tempo_ms,
        "deteccoes": deteccoes,
    }


def calcular_contagens_agregadas(caminho_csv, nomes_classes):
    agregados = {nome: {"real": 0, "previsto": 0} for nome in nomes_classes}
    with open(caminho_csv, "r", encoding="utf-8", newline="") as arquivo:
        leitor = csv.DictReader(arquivo)
        for linha in leitor:
            for nome in nomes_classes:
                agregados[nome]["real"] += int(linha[f"{nome}_real"])
                agregados[nome]["previsto"] += int(linha[f"{nome}_previsto"])
    return agregados


@app.get("/avaliacao")
def avaliacao():
    pasta = Path(PASTA_AVALIACAO)
    caminho_resumo = pasta / "resumo.json"
    if not caminho_resumo.exists():
        raise HTTPException(status_code=404, detail=f"avaliacao nao encontrada em {pasta}")

    with open(caminho_resumo, "r", encoding="utf-8") as arquivo:
        resumo = json.load(arquivo)

    caminho_csv = pasta / "contagens_teste.csv"
    if caminho_csv.exists():
        resumo["contagens"] = calcular_contagens_agregadas(caminho_csv, list(resumo["classes"].keys()))

    return resumo
