import argparse
from pathlib import Path

from ultralytics import YOLO


def analisar_argumentos():
    analisador = argparse.ArgumentParser(description="Treina um modelo YOLO para contagem")
    analisador.add_argument("--modelo", default="yolo11n.yaml")
    analisador.add_argument("--data", default="dataset/data.yaml")
    analisador.add_argument("--epocas", type=int, default=None)
    analisador.add_argument("--imgsz", type=int, default=640)
    analisador.add_argument("--batch", type=int, default=-1)
    analisador.add_argument("--paciencia", type=int, default=100)
    analisador.add_argument("--device", default=None)
    analisador.add_argument("--nome", default=None)
    analisador.add_argument("--seed", type=int, default=0)
    analisador.add_argument("--sem-aug", action="store_true")
    analisador.add_argument("--sem-amp", action="store_true")
    return analisador.parse_args()


def main():
    args = analisar_argumentos()

    do_zero = args.modelo.lower().endswith(".yaml")
    epocas = args.epocas
    if epocas is None:
        epocas = 300 if do_zero else 100

    if args.nome:
        nome_final = args.nome
    else:
        nome_final = f"{Path(args.modelo).stem}_zero" if do_zero else f"{Path(args.modelo).stem}_pretreinado"
    if args.sem_aug:
        nome_final += "_semaug"

    pasta_projeto = Path("runs/treino").resolve()

    modelo = YOLO(args.modelo)

    argumentos_treino = dict(
        data=args.data,
        epochs=epocas,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.paciencia,
        device=args.device,
        project=str(pasta_projeto),
        name=nome_final,
        seed=args.seed,
        deterministic=True,
        pretrained=not do_zero,
        amp=not args.sem_amp,
    )

    if args.sem_aug:
        argumentos_treino.update(
            hsv_h=0.0,
            hsv_s=0.0,
            hsv_v=0.0,
            degrees=0.0,
            translate=0.0,
            scale=0.0,
            shear=0.0,
            perspective=0.0,
            flipud=0.0,
            fliplr=0.0,
            mosaic=0.0,
            mixup=0.0,
            cutmix=0.0,
            copy_paste=0.0,
        )

    modelo.train(**argumentos_treino)

    print(f"melhor modelo salvo em: {modelo.trainer.best}")


if __name__ == "__main__":
    main()
