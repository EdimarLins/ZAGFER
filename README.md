# 🛠️ ZAGFER - Sistema de Gestão de Ferramentas

O **ZAGFER** é um sistema completo e moderno de gestão, controle e rastreamento de ferramentas para oficinas e ambientes industriais. O sistema oferece controle de acervo, fluxo de retiradas (Checkout), devoluções (Return) e renovações (Renewal), gestão de usuários com níveis de permissão, e geração automática de comprovantes em PDF com o logotipo oficial da empresa.

---

## 🌟 Funcionalidades Principais

- **📦 Gestão de Ferramentas**: Cadastro, edição, remoção e listagem de ferramentas por setor, categoria, tamanho e status (Disponível / Indisponível).
- **📋 Controle de Fluxo (Checkout / Devolução / Renovação)**:
  - **Checkout**: Empréstimo de ferramentas com definição de responsável, despachante e data de devolução prevista.
  - **Devolução**: Retorno de ferramentas ao estoque com atualização de status em tempo real.
  - **Renovação**: Prorrogação do prazo de devolução de ferramentas com registro no histórico.
- **📄 Comprovantes em PDF**: Geração de recibos de empréstimo/devolução prontos para impressão ou download contendo o logotipo da ZAGFER.
- **👥 Controle de Usuários e Acesso**:
  - Cadastro de usuários por Matrícula e Senha.
  - Perfis de acesso: **Administrador** e **Usuário Comum**.
  - Fluxo de **Primeiro Acesso / Configuração Mestre** para inicialização segura do sistema.
- **📊 Histórico e Métricas**: Registro auditável de todas as movimentações realizadas.

---

## 🏗️ Arquitetura e Tecnologias

- **Frontend**: [React 18](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), Tailwind CSS, Lucide React (ícones), jsPDF & html2canvas (geração de PDF).
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), `pg` (PostgreSQL client).
- **Banco de Dados**: [PostgreSQL 15](https://www.postgresql.org/).
- **Containerização**: [Docker](https://www.docker.com/) & Docker Compose com proxy Nginx.

---

## 🚀 Como Executar o Sistema

### Opção 1: Usando Docker Compose (Recomendado)

Certifique-se de ter o **Docker** e o **Docker Compose** instalados na máquina.

1. **Subir os containers**:
   ```bash
   docker compose up -d --build
   ```

2. **Acessar a aplicação**:
   - **Frontend**: `http://localhost` (Porta 80)
   - **Backend API**: `http://localhost:3001`
   - **PostgreSQL**: `localhost:5432`

3. **Para parar o sistema**:
   ```bash
   docker compose down
   ```

---

### Opção 2: Execução Local no Windows (Launcher)

Para ambiente de desenvolvimento ou uso sem Docker no Windows:

1. Certifique-se de ter o **Node.js** e o **PostgreSQL** instalados e em execução.
2. Dê um **duplo clique** no arquivo `ZAGFER_Launcher.bat`.
3. O script instalará as dependências automaticamente e abrirá o navegador em `http://localhost:5173`.

---

### Opção 3: Execução Manual (Modo Desenvolvedor)

#### 1. Banco de Dados (PostgreSQL)
Crie um banco de dados chamado `zagfer` e execute o script [database/schema.sql](database/schema.sql).

#### 2. Backend
```bash
cd backend
npm install
npm start
```
*Servidor rodando em `http://localhost:3001`*

#### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
*Interface rodando em `http://localhost:5173`*

---

## 🌐 Acesso em Rede Local (Outros Computadores/Tablets)

Para acessar o ZAGFER de outros dispositivos na mesma rede Wi-Fi ou Ethernet:

1. Descubra o IP local do computador servidor no terminal:
   ```cmd
   ipconfig
   ```
2. Nos outros dispositivos, abra o navegador e acesse:
   `http://[IP-DO-SERVIDOR]` (Exemplo: `http://192.168.1.100`)

---

## 📂 Estrutura do Projeto

```
ZAGFER/
├── backend/            # API REST em Node.js/Express e conexão com PostgreSQL
│   ├── server.js       # Endpoints e regras de negócio
│   └── schema.sql      # Estrutura do banco de dados
├── database/           # Scripts SQL de inicialização do container Postgres
│   └── schema.sql
├── frontend/           # Aplicação web React + Vite + TypeScript
│   ├── components/     # Componentes reutilizáveis (Sidebar, Logo, etc.)
│   ├── pages/          # Páginas (Checkout, Devolução, Ferramentas, Usuários, etc.)
│   ├── services/       # Integrações de API e gerador de PDF
│   ├── store/          # Gerenciamento de estado global (React Context)
│   └── nginx.conf      # Configuração do servidor Web Nginx no container
├── docker-compose.yml  # Orquestração dos serviços (Frontend, Backend, DB)
└── ZAGFER_Launcher.bat # Script de inicialização automática no Windows
```

---

## 🛡️ Licença e Uso

Este projeto foi desenvolvido exclusivamente para a gestão de ferramentas da **ZAGFER**. Todos os direitos reservados.
