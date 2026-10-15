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
