@echo off
cd /d "%~dp0"
echo ==========================================
echo      INICIANDO SISTEMA ZAGFER
echo ==========================================
echo.

:: 1. Verifica se o Node.js esta instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado.
    echo Baixe e instale em: https://nodejs.org/
    pause
    exit
)

:: 2. Instala dependencias do Frontend
if not exist "frontend\node_modules" (
    echo [AVISO] Primeira execucao detectada (Frontend).
    echo Instalando dependencias do frontend...
    cd frontend
    call npm install
    cd ..
)

:: 3. Instala dependencias do Backend
if not exist "backend\node_modules" (
    echo [AVISO] Primeira execucao detectada (Backend).
    echo Instalando dependencias do backend...
    cd backend
    call npm install
    cd ..
)

:: 4. Inicia o Backend (em nova janela)
echo Iniciando Backend...
start "ZAGFER Backend" cmd /c "cd backend && npm start"

:: 5. Abre o navegador e inicia o Frontend
echo Iniciando servidor Frontend...
cd frontend
start "" "http://localhost:5173"
call npm run dev