#!/bin/sh
cd "$(dirname "$0")"
case "$1" in
  brutos) pasta=dados_brutos ;;
  sinteticos) pasta=dados_sinteticos ;;
  *) echo "uso: ./rotular.sh brutos|sinteticos"; exit 1 ;;
esac
venv-rotulagem/bin/labelImg "$pasta/images" classes_rotulagem.txt "$pasta/labels"
