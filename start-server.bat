@echo off
echo Iniciando Servidor ZAGFER Offline...
echo Certifique-se que o PostgreSQL esta rodando!

echo Construindo frontend...
cd frontend
call npm run build
cd ..

echo Iniciando backend...
cd backend
npm start
pause
