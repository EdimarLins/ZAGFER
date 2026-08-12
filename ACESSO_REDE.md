# Guia de Acesso à Rede Local - ZAGFER

Este guia explica como acessar o aplicativo ZAGFER de outros dispositivos na sua rede local.

## Configuração do Servidor

O servidor já está configurado para aceitar conexões de qualquer dispositivo na rede local.

### Descobrir o IP Local do Servidor

**No Windows (PowerShell ou CMD):**
```bash
ipconfig
```

Procure pela linha **IPv4 Address** na interface de rede ativa (geralmente Wi-Fi ou Ethernet).

Exemplo:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Neste exemplo, o IP é `192.168.1.100`.

## Como Acessar de Outros Dispositivos

### 1. Iniciar o Servidor

No computador que hospeda o servidor, execute:
```bash
.\start-server.bat
```

Você verá uma mensagem como:
```
Server running on http://0.0.0.0:3001
Access from other devices: http://[YOUR-IP]:3001
```

### 2. Acessar do Navegador

Em qualquer dispositivo na mesma rede (computador, tablet, celular):

1. Abra o navegador
2. Digite o endereço: `http://[IP-DO-SERVIDOR]:3000`
   - Exemplo: `http://192.168.1.100:3000`
3. A página de login deve carregar normalmente

**Nota:** A porta 3000 é para o frontend (interface do usuário). O backend roda na porta 3001, mas você não precisa acessá-la diretamente.

## Configuração do Firewall (se necessário)

Se outros dispositivos não conseguirem acessar, pode ser necessário configurar o firewall do Windows:

### Windows Defender Firewall

1. Abra o **Painel de Controle** → **Sistema e Segurança** → **Windows Defender Firewall**
2. Clique em **Configurações avançadas** (lado esquerdo)
3. Clique em **Regras de Entrada** (lado esquerdo)
4. Clique em **Nova Regra** (lado direito)
5. Selecione **Porta** → Próximo
6. Selecione **TCP** e digite `3000, 3001` em **Portas locais específicas** → Próximo
7. Selecione **Permitir a conexão** → Próximo
8. Marque todas as opções (Domínio, Privado, Público) → Próximo
9. Dê um nome: "ZAGFER - Acesso Local" → Concluir

### Comando PowerShell (Alternativa Rápida)

Execute como Administrador:
```powershell
New-NetFirewallRule -DisplayName "ZAGFER Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ZAGFER Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

## Troubleshooting

### Problema: "Não consigo conectar de outro dispositivo"

**Soluções:**
1. Verifique se ambos os dispositivos estão na mesma rede Wi-Fi
2. Confirme o IP do servidor com `ipconfig`
3. Verifique se o firewall está bloqueando as portas 3000 e 3001
4. Tente desabilitar temporariamente o firewall para testar
5. Certifique-se de que o servidor está rodando (`.\start-server.bat`)

### Problema: "A página carrega mas não mostra dados"

**Soluções:**
1. Verifique se o backend está rodando (porta 3001)
2. Abra o console do navegador (F12) e procure por erros
3. Verifique se o PostgreSQL está rodando
4. Confirme que o arquivo `.env` no diretório `server/` está configurado corretamente

### Problema: "ERR_CONNECTION_REFUSED"

**Soluções:**
1. Confirme que o servidor está rodando
2. Verifique se você está usando o IP correto
3. Tente acessar `http://localhost:3000` no próprio servidor para confirmar que funciona localmente
4. Verifique configurações de firewall

## Notas Importantes

- **Segurança:** Esta configuração é adequada apenas para redes locais confiáveis (casa ou escritório)
- **IP Dinâmico:** O IP local pode mudar após reiniciar o roteador. Neste caso, descubra o novo IP com `ipconfig`
- **Porta do Frontend:** O Vite dev server (frontend) roda na porta 3000
- **Porta do Backend:** O servidor Express (backend) roda na porta 3001
- **Auto-detecção:** O frontend detecta automaticamente o IP do servidor baseado no hostname do navegador

## Exemplo Completo

**Servidor (IP: 192.168.1.100):**
```bash
cd C:\Users\edima\OneDrive\Área de Trabalho\ZAGFER\ZAGFER
.\start-server.bat
```

**Cliente (outro computador na rede):**
- Abrir navegador
- Acessar: `http://192.168.1.100:3000`
- Fazer login normalmente
- Todas as funcionalidades devem funcionar

## Suporte

Se continuar com problemas:
1. Verifique os logs do servidor no terminal
2. Verifique o console do navegador (F12 → Console)
3. Confirme que o PostgreSQL está rodando e acessível
