# ZAGFER - Sistema Offline

Este aplicativo foi configurado para rodar offline em um servidor on-premise utilizando Node.js e PostgreSQL.

## Pré-requisitos

1.  **Node.js**: Instalado no servidor.
2.  **PostgreSQL**: Banco de dados instalado e rodando.
    - Crie um banco de dados chamado `zagfer`.
    - Usuário padrão: `postgres`, Senha: `postgres`.
    - Se suas credenciais forem diferentes, edite o arquivo `server/.env` (crie-o se não existir baseando-se no `server.js`).

## Instalação (Primeira vez)

1.  Abra o terminal na pasta do projeto e instale as dependências do frontend:
    ```bash
    npm install
    ```
2.  Construa o frontend:
    ```bash
    npm run build
    ```
3.  Instale as dependências do backend:
    ```bash
    cd server
    npm install
    cd ..
    ```

## Como Rodar

1.  Execute o arquivo `start-server.bat` ou rode no terminal:
    ```bash
    cd server
    npm start
    ```
2.  Acesse no navegador: `http://localhost:3001` (ou a porta configurada).

## Usuário Padrão

-   **Login (Matrícula)**: `admin`
-   **Senha**: `admin123`

## Estrutura

-   `server/`: Backend Node.js.
-   `dist/`: Frontend compilado (gerado pelo `npm run build`).
-   `src/`: Código fonte do frontend React.
