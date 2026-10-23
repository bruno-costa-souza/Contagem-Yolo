# contagem-yolo

Deteccao e contagem de objetos em imagens estaticas com Ultralytics YOLO (YOLO11 por padrao).

## Instalacao

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Todos os comandos abaixo devem ser executados a partir da raiz `contagem-yolo`.

## scripts/dividir_dataset.py

Divide uma pasta com `images/` e `labels/` em `train`, `val` e `test`.

```
python scripts/dividir_dataset.py --origem caminho/para/origem --classes classe1 classe2 classe3
```

Imagens sinteticas (geradas por IA) devem ficar fora de val/test. Coloque-as em outra pasta com `images/` e `labels/` e passe `--somente-treino`: todas vao para `train`.

```
python scripts/dividir_dataset.py --origem dados_brutos --somente-treino dados_sinteticos --classes parafuso porca arruela
```

Argumentos principais: `--destino` (padrao `dataset`), `--proporcao` (padrao `0.70 0.15 0.15`), `--grupo-sep` (separador para agrupar cenas pelo prefixo do nome do arquivo), `--seed` (padrao `42`).

## scripts/treinar.py

Treina um modelo YOLO a partir do zero ou de pesos pre-treinados.

```
python scripts/treinar.py --modelo yolo11n.yaml --data dataset/data.yaml
```

Argumentos principais: `--epocas`, `--imgsz` (padrao `640`), `--batch` (padrao `-1`), `--paciencia` (padrao `100`), `--device`, `--nome`, `--seed` (padrao `0`), `--sem-aug`, `--sem-amp`.

## scripts/avaliar_contagem.py

Calibra o limiar de confianca na validacao e avalia a contagem no conjunto de teste.

```
python scripts/avaliar_contagem.py --pesos runs/treino/yolo11n_zero/weights/best.pt --data dataset/data.yaml
```

Argumentos principais: `--ious` (padrao `0.7`), `--tau-min` (padrao `0.01`), `--tau-max` (padrao `0.95`), `--tau-passo` (padrao `0.01`), `--imgsz` (padrao `640`), `--device`, `--nome` (padrao `exp`).

## scripts/contar.py

Conta objetos por classe em uma imagem ou pasta de imagens.

```
python scripts/contar.py --pesos runs/treino/yolo11n_zero/weights/best.pt --fonte caminho/para/imagens
```

Argumentos principais: `--conf` (padrao `0.25`), `--iou` (padrao `0.7`), `--imgsz` (padrao `640`), `--saida` (padrao `runs/contagem`), `--device`.

## api/main.py

API FastAPI que carrega o modelo uma vez na inicializacao.

```
uvicorn api.main:app --reload
```

Variaveis de ambiente: `MODELO` (padrao `runs/treino/yolo11n_zero/weights/best.pt`), `AVALIACAO` (padrao `runs/avaliacao/exp`).

## web/

Interface React que consome a API.

```
cd web
npm install
npm run dev
```
