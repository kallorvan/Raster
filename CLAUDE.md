# Checklist do Rastreador (Raster)

Painel HTML sem servidor que substitui a planilha de checklist do rastreador da Toliman.

- Comece por [`docs/HANDOFF.md`](docs/HANDOFF.md): arquitetura, eventos, layouts de PDF, como testar, entrega e pendências.
- Use os termos de [`GLOSSARY.md`](GLOSSARY.md) no código, na interface e nos documentos; registre termos novos lá.
- Decisões de arquitetura ficam em `docs/adr/`.
- Testes: `npm test`. Painel de demonstração: sirva `painel/` por http e abra `painel.html?demo=1`.
- Converse com o usuário em português. Ao terminar uma mudança no painel, gere de novo o `checklist-rastreador.zip`, que fica fora do git.
