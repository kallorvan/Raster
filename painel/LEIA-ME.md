# Checklist do Rastreador: como instalar

## Preparar a pasta (uma vez)

1. No SharePoint, crie uma pasta para a fila (por exemplo, `Checklist Rastreador`) e dê acesso de edição a quem vai usar o painel.
2. Copie para dentro dela o `painel.html` e a pasta `lib/` inteira.
3. As pastas `eventos/`, `presenca/` e `checklists/` são criadas pelo próprio painel. Não apague, não edite e não mova os arquivos delas.

## Em cada PC

1. No SharePoint, abra a pasta e clique em **Sincronizar** (ou **Adicionar atalho ao Meu OneDrive**), para ela aparecer no Explorador de Arquivos.
2. Abra o `painel.html` dessa pasta no **Microsoft Edge** ou no **Google Chrome**. Dica: crie um atalho na área de trabalho.
3. Clique em **Escolher pasta**, selecione a mesma pasta da fila e permita a leitura e a gravação.
4. Escolha seu nome. O navegador lembra a pasta e o nome. Em algumas aberturas, ele pode pedir para você confirmar o acesso de novo com um clique.

## Bom saber

- Toda alteração é salva na hora, num arquivo próprio em `eventos/`. Isso evita que uma pessoa apague o trabalho de outra.
- Alterações de colegas aparecem quando o OneDrive sincroniza, normalmente em segundos a poucos minutos. O painel relê a pasta a cada 20 segundos e sempre que você volta para a janela dele.
- "No painel agora" mostra quem deu sinal nos últimos 3 minutos.
- Os PDFs importados ficam em `checklists/<placa>/<código>.pdf`.
- PDFs salvos em `entrada/` são importados sozinhos por qualquer painel aberto (depois de 15 segundos, para dar tempo de sincronizar). O arquivo sai da `entrada/`; o que não for checklist da Raster vai para `entrada/com-erro/`.
- Para testar sem mexer na pasta real, sirva o painel por `http://localhost` e abra `painel.html?demo=1`: os dados ficam só naquele navegador.
