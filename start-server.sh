#!/bin/bash

# Script para iniciar o servidor ZAGFER no Linux
# Certifique-se de dar permissão de execução: chmod +x start-server.sh

echo "Iniciando o servidor ZAGFER..."

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "Erro: Node.js não encontrado. Por favor, instale-o antes de continuar."
    exit
fi

# Navega para a pasta do servidor e inicia
cd "$(dirname "$0")/server"
npm install --production
node server.js
