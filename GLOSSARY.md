# Raster — Fila de Checklist do Rastreador

Controle da fila de veículos da Toliman que precisam ter o checklist do rastreador emitido pela Raster em dia antes de carregar. Substitui a planilha "CHECK LIST RASTREADOR RASTER".

## Linguagem

### Checklist

**Raster**:
Gerenciadora de risco que testa o rastreador do veículo e emite o checklist.
_Evitar_: portal, gerenciadora

**Checklist**:
Teste do rastreador de um veículo, emitido pela Raster em PDF, com um resultado e um vencimento. Vale para o veículo até o vencimento, mesmo que ele troque de carreta. Um veículo pode ter vários; vale o mais recente.
_Evitar_: check list, teste do rastreador, PDF

**Layout**:
Formato do PDF do checklist gerado pelo portal da Raster. Hoje são dois, reconhecidos pelo título do primeiro bloco: "DADOS DO TESTE" e "DADOS DO CHECKLIST". Cada um tem seus rótulos e sua numeração de código, por isso um checklist é identificado por placa + código.
_Evitar_: modelo, tipo de PDF

**Preenchimento à mão**:
Importação de um checklist cujo layout o painel não reconhece: a pessoa confere o PDF e digita placa, resultado, data do teste e vencimento. O registro fica marcado e guarda o texto do PDF, para o layout ser ensinado ao painel depois.
_Evitar_: digitação, cadastro manual

**Pasta de entrada**:
Pasta `entrada/` dentro da pasta do time. PDFs salvos nela são importados sozinhos por qualquer painel aberto; os que não dão para ler vão para `entrada/com-erro/`.
_Evitar_: caixa de entrada

**Resultado**:
O que a Raster concluiu sobre um checklist: Aprovado, Reprovado ou Expirado (aprovado cujo vencimento já passou). Vem do documento, nunca é escolhido à mão.
_Evitar_: status

**Vencimento**:
Data e hora até a qual um checklist aprovado vale. É lido do checklist, não calculado: a validade varia.
_Evitar_: expiração, validade

### Veículos

**Veículo**:
Caminhão identificado pela placa, que é a unidade da fila.
_Evitar_: cavalo, placa, caminhão

**Desativação**:
Retirada de um veículo da fila (venda, saída da frota), preservando o histórico; pode ser desfeita reativando-o.
_Evitar_: exclusão, remoção

**Carreta**:
Implemento engatado ao veículo, registrado no checklist (Carreta 01, 02, 03). Trocar de carreta não exige novo checklist.
_Evitar_: reboque

### Fila

**Fila**:
Lista de veículos agrupada por situação e ordenada por vencimento dentro de cada situação.
_Evitar_: planilha, lista

**Situação**:
Onde o veículo está no fluxo de trabalho da equipe: Necessário realizar checklist, Checklist feito – confirmar validação, Validado e lançado, Manutenção ou Checklist cancelado.
_Evitar_: status

**Validação**:
Conferência humana de um checklist importado, que o confirma para o veículo.
_Evitar_: aprovação (é o resultado da Raster, não da equipe)

**Lançamento**:
Registro, no Rodopar, de que o checklist do veículo foi validado. Para a fila é apenas informativo de conclusão.
_Evitar_: liberação

**Rodopar**:
Sistema de gestão de transporte da Toliman onde o lançamento é feito.

### Pessoas

**Pessoa**:
Nome escolhido no painel para registrar quem fez cada alteração. Não é login: só vale como identificação.
_Evitar_: usuário, login

**Administrador**:
A pessoa que tem a senha do painel e é a única que cadastra e remove nomes da lista de pessoas.
_Evitar_: dono, gestor
