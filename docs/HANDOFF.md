# Handoff: Checklist do Rastreador

Estado do projeto para quem continuar numa sessão nova. Última atualização: 27/10/2026.

## O que é

Um painel HTML que substitui a planilha "CHECK LIST RASTREADOR RASTER" da Toliman Transportes (Grupo Dínamo). A equipe importa o PDF do checklist do rastreador que o portal da Raster gera. O painel lê placa, carretas, resultado, data do teste e vencimento, e monta uma fila por situação e vencimento. Depois a equipe valida e lança no Rodopar.

O vocabulário do domínio está em [`GLOSSARY.md`](../GLOSSARY.md). Use esses termos, e não os da coluna "Evitar". A decisão de arquitetura está em [`docs/adr/0001`](adr/0001-dados-em-pasta-sharepoint-um-arquivo-por-alteracao.md).

## Como funciona

- **Sem servidor.** O `painel.html` fica numa pasta da biblioteca do time do Teams **"Checklist Rastreador - Raster"**. Cada PC sincroniza essa pasta com o OneDrive ("Adicionar atalho ao OneDrive"), e o arquivo é aberto direto no Edge ou no Chrome, por `file://`.
- **Acesso à pasta:** pela File System Access API (`showDirectoryPicker`). O handle da pasta fica no IndexedDB; em algumas aberturas o navegador pede um clique para confirmar a permissão.
- **Armazenamento por eventos:** cada alteração é um JSON imutável em `eventos/`, e o estado é sempre recalculado a partir de todos eles (`montarEstado`). Nunca existe um arquivo único reescrito, para evitar conflito de sincronização no OneDrive.
- **Presença:** cada painel grava `presenca/<pessoa>__<pc>.json` a cada 60 s. "No painel agora" mostra quem deu sinal nos últimos 3 minutos.
- **Releitura:** o painel relê a pasta a cada 20 s e ao voltar para a janela, e verifica a `entrada/` nesse mesmo ciclo.
- **PDF:** lido com pdf.js 3.11.174 (build clássico em `painel/lib/`; o `pdf.worker.min.js` é carregado por `<script>` e roda na thread principal, porque `file://` não permite worker).
- **Modo demonstração:** `painel.html?demo=1`, servido por `http://localhost`. Usa o OPFS do navegador no lugar da pasta.

### Estrutura da pasta do time (produção)

```
Checklist Rastreador/
  painel.html, LEIA-ME.md, lib/          ← o zip de distribuição
  eventos/<ts>_<pessoa>_<id>.json        ← uma alteração por arquivo (não editar)
  presenca/<pessoa>__<pc>.json
  checklists/<PLACA>/<código>.pdf        ← cópia de cada PDF importado
  entrada/  (e entrada/com-erro/)        ← importação automática
```

### Eventos (`painel/lib/checklist.js` → `montarEstado`)

`veiculo_cadastrado` (vindo da planilha antiga), `checklist_importado`, `validado`, `situacao_definida` (Manutenção/Cancelado, ou `null` para voltar ao cálculo), `observacao`, `desativado`, `reativado`, `pessoa_adicionada`, `pessoa_removida`, `admin_definido`.

### Regras da situação

Ordem da fila: Necessário → Confirmar → Manutenção → Cancelado → Validado; dentro de cada situação, por vencimento.

- **PDF aprovado:** entra em "Checklist feito – confirmar validação".
- **Validar:** leva o veículo para "Validado e lançado".
- **Volta para "Necessário realizar checklist":** a 15 dias do vencimento (`ANTECEDENCIA_DIAS`), quando o resultado é reprovado ou quando o checklist expirou.
- **Manutenção e Cancelado:** são manuais e só saem por ação de alguém ou quando chega um PDF novo.
- **Vários checklists do mesmo veículo:** vale o de data de teste mais recente.
- **Duplicados:** um checklist é identificado por **placa + código** (`chaveChecklist`), porque os dois layouts usam numerações de código diferentes.

### Layouts de PDF da Raster

O reconhecimento fica em `LAYOUTS` e `ROTULOS` em `checklist.js`. Os rótulos são lidos sem diferenciar maiúsculas e minúsculas, e o valor pode estar na mesma linha ou na seguinte.

| Layout | Marca no PDF | Exemplos (fixtures) |
|---|---|---|
| `dados-do-teste` | bloco "DADOS DO TESTE"; "Data Teste", "Expiração", "Perfil Segurança" | `UVR1I58`, `QPE7756` |
| `dados-do-checklist` | bloco "DADOS DO CHECKLIST"; "Data teste", "Data expiração", "Perfil de segurança"; código de 5 dígitos | `QQS9985` |

Quando o painel não reconhece um PDF, a importação marca o arquivo como **Layout novo** e oferece **Preencher à mão**: um diálogo com o PDF ao lado de um formulário. O evento gravado leva `lidoAMao: true` e `textoPdf`, o texto extraído com a senha mascarada. Sem código, o painel usa `M-<8 hex do SHA-256 do arquivo>`.

**Para ensinar um layout novo:**
1. Pegue o `textoPdf` do evento, ou extraia as linhas do PDF com `linhasDoPdf`.
2. Salve as linhas como `tests/fixtures/*.json`, com a senha trocada por `XXXXXX`.
3. Inclua a marca em `LAYOUTS` e os rótulos que faltarem em `ROTULOS`.
4. Escreva o teste.

### Administrador

Só o administrador cadastra e remove nomes. A senha é guardada como SHA-256 de `salt:senha` no evento `admin_definido` (vale o último). O desbloqueio fica só na memória da aba. **Não é segurança de verdade:** quem tem acesso à pasta pode editar os arquivos. O administrador é quem criou a senha na aba Pessoas (o dono do projeto).

## Arquivos do repositório

| Caminho | O que é |
|---|---|
| `painel/painel.html` | O app inteiro: interface, leitura e gravação da pasta, importação, presença |
| `painel/lib/checklist.js` | Leitura do PDF e regras da fila; carregável no Node para testes |
| `painel/LEIA-ME.md` | Instalação, que vai dentro do zip |
| `tests/checklist.test.cjs` + `tests/fixtures/` | 24 testes (`npm test`) |
| `scripts/converter_planilha.py` | Conversão da planilha antiga em eventos `veiculo_cadastrado` (já feita, com ids fixos `planilha-<sha1>`) |
| `docs/manual/manual.html` + `img/` | Manual para quem usa o painel, em A4. O PDF é gerado com Playwright `page.pdf` |
| `docs/divulgacao/` | Post de boas-vindas (1080×1920) para o canal do Teams |
| `GLOSSARY.md`, `docs/adr/` | Domínio e decisões |

## Como testar

```bash
npm test                                   # = node --test tests/*.test.cjs  (não use "node --test tests/")
cd painel && python3 -m http.server 8765   # depois abra http://localhost:8765/painel.html?demo=1
```

- **Playwright:** use `executablePath: '/opt/pw-browsers/chromium'`; não rode `playwright install`. O Playwright fica em `/opt/node22/lib/node_modules/playwright`.
- **Teste automatizado no navegador:** `window.__painel` expõe `{ st, gravar, recarregar, importar, verificarEntrada }`.
- **Para entrar no modo demonstração:** grave `pessoa_adicionada` e defina `localStorage['raster.pessoa']`.
- **No `page.fill`** de `datetime-local`, use `AAAA-MM-DDTHH:MM`, sem segundos.
- **Para encerrar o servidor**, use `fuser -k 8765/tcp`. Não use `pkill`, porque o padrão pode bater no próprio shell.

## Entrega para o usuário

- **`checklist-rastreador.zip`:** `painel.html` + `LEIA-ME.md` + `lib/`, extraído por cima da pasta do time. Gere com `cd painel && zip -qr ../checklist-rastreador.zip painel.html LEIA-ME.md lib`. O `*.zip` está no `.gitignore`.
- **`planilha-inicial.zip`:** os eventos da conversão da planilha. Já foi entregue e não deve ser regerado sem pedir.
- **Commits** na branch `claude/determined-babbage-p11hz8`. Não abra PR sem o usuário pedir.

## Usuário e preferências

- **Idioma e público:** escreve em português, e o público do painel e do manual é a equipe operacional, não técnica.
- **"Siga com o recomendado":** responde muito assim; nesse caso, siga a recomendação dada.
- **Visual:** é o mesmo do artefato "Infrações de Velocidade · Grupo Dínamo" (cores `--ink #1C2543`, `--coral #DD4663`, `--mauve #AE82B1`, `--sand #F4D38D`; fontes Archivo e IBM Plex Mono). Para páginas novas, existe a skill `layout-padrao`.
- **Manual:** cobre só as partes de quem usa o painel, sem a parte de administração.

## Limitações conhecidas

- Alterações de colegas chegam com o atraso do OneDrive; em edições simultâneas, vale a última gravação. O painel avisa quando alguém mexeu no mesmo veículo.
- A pasta `entrada/` só é processada enquanto algum painel está aberto, e o OneDrive pode criar cópias duplicadas de PDFs.
- O PDF reprovado do layout `dados-do-checklist` ainda não foi visto; o teste é simulado a partir do aprovado.

## Pendências e ideias oferecidas (não pedidas)

- Pedir ao usuário PDFs reprovados dos dois layouts e outros layouts, e transformá-los em fixtures.
- Incluir no manual (`docs/manual`) a seção "Preencher à mão", com print, e refazer os prints da fila, que ainda mostram "da planilha" em vez de "aguardando PDF".
- Botão "Incluir veículo" sem PDF: o usuário respondeu "deixe por enquanto".
- Guia do administrador, separado do manual.
- Login Microsoft de verdade, que depende de a TI registrar um app no Azure.
