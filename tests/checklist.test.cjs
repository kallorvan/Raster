// node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../painel/lib/checklist.js');
const linhasAprovado = require('./fixtures/checklist-aprovado-UVR1I58.json');

const AGORA = new Date('2026-10-15T10:00:00');
let seq = 0;
const ev = (tipo, placa, dados = {}, ts) => ({ id: 'e' + (++seq), ts: ts || `2026-10-15T09:${String(seq).padStart(2, '0')}:00`, pessoa: 'Jader', tipo, placa, dados });
const importado = (placa, codigo, resultado, dataTeste, vencimento, ts) =>
  ev('checklist_importado', placa, { codigo, placa, resultado, dataTeste, vencimento, carretas: [] }, ts);
const estado = (eventos) => C.montarEstado(eventos, AGORA);
const situacao = (eventos, placa) => estado(eventos).veiculos.find(v => v.placa === placa).situacao;

test('lê o checklist aprovado da Raster', () => {
  const ck = C.lerChecklist(linhasAprovado);
  assert.equal(ck.codigo, '2210098');
  assert.equal(ck.placa, 'UVR1I58');
  assert.equal(ck.resultado, 'aprovado');
  assert.equal(ck.dataTeste, '2026-10-14T20:08:37');
  assert.equal(ck.vencimento, '2026-11-13T20:08:37');
  assert.deepEqual(ck.carretas, ['ESU6A72', 'ESU6071']);
  assert.equal(ck.perfil, 'REGRA TOLIMAN – BITREM CARREGADO - SWISS RE');
});

test('lê um checklist reprovado sem expiração', () => {
  const linhas = linhasAprovado
    .map(l => (l === 'APROVADO' ? 'REPROVADO' : l))
    .filter(l => !l.startsWith('Expiração'));
  const ck = C.lerChecklist(linhas);
  assert.equal(ck.resultado, 'reprovado');
  assert.equal(ck.vencimento, null);
});

test('recusa arquivo que não é checklist', () => {
  assert.throws(() => C.lerChecklist(['NOTA FISCAL', 'Total: R$ 10']), /não parece ser um checklist/);
});

test('normaliza placa do portal e da planilha', () => {
  assert.equal(C.normalizarPlaca('qqv-4574'), 'QQV4574');
});

test('PDF aprovado entra em confirmar validação', () => {
  assert.equal(situacao([importado('AAA1A11', '1', 'aprovado', '2026-10-14T20:00:00', '2026-11-13T20:00:00')], 'AAA1A11'), 'confirmar');
});

test('validado com vencimento distante fica em validado e lançado', () => {
  const evs = [importado('AAA1A11', '1', 'aprovado', '2026-10-14T20:00:00', '2026-11-13T20:00:00'), ev('validado', 'AAA1A11', { codigo: '1' })];
  assert.equal(situacao(evs, 'AAA1A11'), 'validado');
});

test('validado a 15 dias do vencimento volta para necessário', () => {
  const evs = [importado('AAA1A11', '1', 'aprovado', '2026-10-01T20:00:00', '2026-10-30T09:00:00'), ev('validado', 'AAA1A11', { codigo: '1' })];
  assert.equal(situacao(evs, 'AAA1A11'), 'necessario');
});

test('aprovado já vencido vira expirado e necessário', () => {
  const s = estado([importado('AAA1A11', '1', 'aprovado', '2026-09-01T20:00:00', '2026-10-01T20:00:00')]);
  const v = s.veiculos[0];
  assert.equal(v.resultado, 'expirado');
  assert.equal(v.situacao, 'necessario');
  assert.equal(v.vencido, true);
});

test('PDF reprovado leva para necessário', () => {
  assert.equal(situacao([importado('RFE3G32', '9', 'reprovado', '2026-10-14T19:17:53', null)], 'RFE3G32'), 'necessario');
});

test('aprovado depois de reprovado no mesmo dia vale o mais recente', () => {
  const evs = [
    importado('RFE3G32', '10418334', 'reprovado', '2026-10-14T19:17:53', null),
    importado('RFE3G32', '10418370', 'aprovado', '2026-10-14T19:28:07', '2026-11-13T19:28:07'),
  ];
  assert.equal(situacao(evs, 'RFE3G32'), 'confirmar');
});

test('importar um checklist mais antigo depois não substitui o atual', () => {
  const evs = [
    importado('RFE3G32', '10418370', 'aprovado', '2026-10-14T19:28:07', '2026-11-13T19:28:07'),
    importado('RFE3G32', '10418334', 'reprovado', '2026-10-14T19:17:53', null),
  ];
  assert.equal(situacao(evs, 'RFE3G32'), 'confirmar');
});

test('manutenção não sai sozinha a 15 dias do vencimento', () => {
  const evs = [
    importado('AAA1A11', '1', 'aprovado', '2026-10-01T20:00:00', '2026-10-20T09:00:00'),
    ev('validado', 'AAA1A11', { codigo: '1' }),
    ev('situacao_definida', 'AAA1A11', { situacao: 'manutencao' }),
  ];
  assert.equal(situacao(evs, 'AAA1A11'), 'manutencao');
});

test('PDF novo tira o veículo de manutenção ou cancelado', () => {
  const evs = [
    ev('situacao_definida', 'AAA1A11', { situacao: 'cancelado' }),
    importado('AAA1A11', '2', 'aprovado', '2026-10-15T08:00:00', '2026-11-14T08:00:00'),
  ];
  assert.equal(situacao(evs, 'AAA1A11'), 'confirmar');
});

test('código duplicado gravado por dois PCs conta uma vez', () => {
  const evs = [
    importado('AAA1A11', '7', 'aprovado', '2026-10-15T08:00:00', '2026-11-14T08:00:00'),
    importado('AAA1A11', '7', 'aprovado', '2026-10-15T08:00:00', '2026-11-14T08:00:00'),
  ];
  assert.equal(estado(evs).veiculos[0].checklists.length, 1);
});

test('veículo da planilha mantém a situação de origem', () => {
  const evs = [
    ev('veiculo_cadastrado', 'QQS9913', { vencimento: '2026-12-11T00:00:00', situacao: 'validado' }),
    ev('veiculo_cadastrado', 'QQM6918', { vencimento: '2026-03-10T00:00:00', situacao: 'manutencao' }),
    ev('veiculo_cadastrado', 'RFE3G34', { vencimento: '2026-10-18T00:00:00', situacao: 'necessario' }),
  ];
  assert.equal(situacao(evs, 'QQS9913'), 'validado');
  assert.equal(situacao(evs, 'QQM6918'), 'manutencao');
  assert.equal(situacao(evs, 'RFE3G34'), 'necessario');
});

test('desativado sai da fila e pode voltar', () => {
  const base = [importado('AAA1A11', '1', 'aprovado', '2026-10-14T20:00:00', '2026-11-13T20:00:00'), ev('desativado', 'AAA1A11')];
  assert.equal(estado(base).veiculos[0].ativo, false);
  assert.equal(estado([...base, ev('reativado', 'AAA1A11')]).veiculos[0].ativo, true);
});

test('fila segue a ordem das situações e depois o vencimento', () => {
  const evs = [
    ev('veiculo_cadastrado', 'VAL0001', { vencimento: '2026-12-01T00:00:00', situacao: 'validado' }),
    ev('veiculo_cadastrado', 'NEC0002', { vencimento: '2026-10-25T00:00:00', situacao: 'necessario' }),
    ev('veiculo_cadastrado', 'NEC0001', { vencimento: '2026-10-10T00:00:00', situacao: 'necessario' }),
    ev('veiculo_cadastrado', 'MAN0001', { vencimento: '2026-08-01T00:00:00', situacao: 'manutencao' }),
    importado('CON0001', '5', 'aprovado', '2026-10-15T08:00:00', '2026-11-14T08:00:00'),
  ];
  const fila = C.ordenarFila(estado(evs).veiculos).map(v => v.placa);
  assert.deepEqual(fila, ['NEC0001', 'NEC0002', 'CON0001', 'MAN0001', 'VAL0001']);
});

test('pessoas adicionadas e removidas', () => {
  const evs = [ev('pessoa_adicionada', null, { nome: 'Ana Paula' }), ev('pessoa_adicionada', null, { nome: 'Jader' }), ev('pessoa_removida', null, { nome: 'Ana Paula' })];
  assert.deepEqual(estado(evs).pessoas, ['Jader']);
});
