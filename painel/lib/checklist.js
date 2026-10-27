// Leitura do PDF de checklist da Raster e regras da fila.
// Script clássico (sem módulos) para funcionar com o painel aberto direto da pasta (file://).
// Também carregável no Node para testes: module.exports no final.
(function (root) {
  'use strict';

  const ANTECEDENCIA_DIAS = 15;

  const SITUACOES = [
    { id: 'necessario', nome: 'Necessário realizar checklist' },
    { id: 'confirmar', nome: 'Checklist feito – confirmar validação' },
    { id: 'manutencao', nome: 'Manutenção' },
    { id: 'cancelado', nome: 'Checklist cancelado' },
    { id: 'validado', nome: 'Validado e lançado' },
  ];

  function normalizarPlaca(p) {
    return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // "14/10/2026 20:08:37" -> ISO local "2026-10-14T20:08:37"
  function dataBR(s) {
    const m = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s || '');
    if (!m) return null;
    const [, d, mo, a, h = '00', mi = '00', se = '00'] = m;
    return `${a}-${mo}-${d}T${h}:${mi}:${se}`;
  }

  // Recebe os itens de texto de pdf.js (getTextContent().items) e devolve as linhas
  // na ordem de leitura, com os pedaços separados por " ¦ ".
  function linhasDoPdf(items) {
    const rows = new Map();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push([it.transform[4], it.str.trim()]);
    }
    return [...rows.keys()].sort((a, b) => b - a)
      .map(y => rows.get(y).sort((a, b) => a[0] - b[0]).map(r => r[1]).join(' ¦ '));
  }

  // Layouts do PDF que o portal da Raster gera. Cada um é reconhecido pelo título do primeiro bloco.
  const LAYOUTS = [
    { id: 'dados-do-teste', marca: /^DADOS DO TESTE$/im },         // ex.: UVR1I58, QPE7756
    { id: 'dados-do-checklist', marca: /^DADOS DO CHECKLIST$/im }, // ex.: QQS9985 (código com outra numeração)
  ];
  // Rótulos de cada campo nos layouts conhecidos (maiúsculas/minúsculas não importam).
  // "Expiração:" também acha "Data expiração:".
  const ROTULOS = {
    codigo: ['Código:'],
    placa: ['Veículo:'],
    dataTeste: ['Data Teste:'],
    vencimento: ['Expiração:'],
    perfil: ['Perfil Segurança:', 'Perfil de segurança:'],
    tecnologia: ['Tecnologia:'],
    solicitante: ['Solicitante:'],
    tipo: ['Tipo:'],
  };

  // Extrai os campos do checklist a partir das linhas.
  // Se não conseguir, lança um erro com .linhas (o texto lido) e .parcial (os campos que achou),
  // para o painel oferecer o preenchimento à mão.
  function lerChecklist(linhas) {
    const texto = linhas.join('\n');
    // valor = pedaço logo após o rótulo (na mesma linha ou no começo da seguinte), desde que não seja outro rótulo
    const campo = (rotulos) => {
      for (const rotulo of [].concat(rotulos)) {
        const m = new RegExp(rotulo + '[ \\t]*(?:¦[ \\t]*|\\n)?([^¦\\n]+)', 'iu').exec(texto);
        if (!m) continue;
        const v = m[1].trim();
        if (v && !/:$/.test(v)) return v;
      }
      return null;
    };
    const layout = LAYOUTS.find(l => /CHECKLIST/i.test(texto) && l.marca.test(texto));
    const resultado = linhas.map(l => l.trim()).find(l => /^(APROVADO|REPROVADO)$/i.test(l));
    const carretas = [];
    for (const n of ['01', '02', '03']) {
      const c = campo(`Carreta ${n}:`);
      if (c) carretas.push(normalizarPlaca(c));
    }
    const ck = {
      layout: layout ? layout.id : null,
      codigo: campo(ROTULOS.codigo),
      placa: normalizarPlaca(campo(ROTULOS.placa)),
      resultado: resultado ? (resultado.toUpperCase() === 'APROVADO' ? 'aprovado' : 'reprovado') : null,
      dataTeste: dataBR(campo(ROTULOS.dataTeste)),
      vencimento: dataBR(campo(ROTULOS.vencimento)),
      carretas,
      perfil: campo(ROTULOS.perfil),
      tecnologia: campo(ROTULOS.tecnologia),
      solicitante: campo(ROTULOS.solicitante),
      tipo: campo(ROTULOS.tipo),
    };
    const falha = (msg) => Object.assign(new Error(msg), { linhas, parcial: ck });
    if (!layout) throw falha('Não reconheci o layout deste PDF.');
    const faltando = [];
    if (!ck.codigo) faltando.push('código');
    if (!ck.placa) faltando.push('placa do veículo');
    if (!ck.resultado) faltando.push('resultado');
    if (!ck.dataTeste) faltando.push('data do teste');
    if (ck.resultado === 'aprovado' && !ck.vencimento) faltando.push('expiração');
    if (faltando.length) throw falha('Não encontrei no PDF: ' + faltando.join(', ') + '.');
    return ck;
  }

  // Identifica um checklist sem ambiguidade: os layouts usam numerações de código diferentes,
  // então o mesmo número pode aparecer em placas diferentes.
  const chaveChecklist = (ck) => `${ck.placa}#${ck.codigo}`;

  function diasAte(iso, agora) {
    if (!iso) return null;
    return (new Date(iso) - agora) / 86400000;
  }

  // Monta a fila a partir dos eventos (cada um é um arquivo JSON na pasta compartilhada).
  // Eventos: veiculo_cadastrado, checklist_importado, validado, situacao_definida,
  //          observacao, desativado, reativado, pessoa_adicionada, pessoa_removida.
  function montarEstado(eventos, agora) {
    agora = agora || new Date();
    const ord = [...eventos].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : (a.id < b.id ? -1 : 1)));
    const veiculos = new Map();
    const pessoas = new Map();
    const codigos = new Map(); // chaveChecklist (placa#código) -> evento de importação
    let admin = null; // senha do administrador (só ele cadastra e remove pessoas)
    const vei = (placa) => {
      if (!veiculos.has(placa)) {
        veiculos.set(placa, {
          placa, checklists: [], atual: null, validacao: null, manual: null,
          observacao: '', ativo: true, historico: [],
        });
      }
      return veiculos.get(placa);
    };
    for (const e of ord) {
      if (e.tipo === 'pessoa_adicionada') { pessoas.set(e.dados.nome, true); continue; }
      if (e.tipo === 'pessoa_removida') { pessoas.delete(e.dados.nome); continue; }
      if (e.tipo === 'admin_definido') { admin = { nome: e.dados.nome, salt: e.dados.salt, hash: e.dados.hash, ts: e.ts }; continue; }
      if (!e.placa) continue;
      const v = vei(e.placa);
      v.historico.push(e);
      switch (e.tipo) {
        case 'veiculo_cadastrado': {
          // ponto de partida vindo da planilha antiga
          const d = e.dados;
          const ck = { codigo: null, origem: 'planilha', resultado: 'aprovado', vencimento: d.vencimento, carretas: [], importadoEm: e.ts, importadoPor: e.pessoa };
          v.checklists.push(ck);
          v.atual = ck;
          v.validacao = d.situacao === 'validado' ? { ts: e.ts, pessoa: e.pessoa, codigo: null } : null;
          v.manual = (d.situacao === 'manutencao' || d.situacao === 'cancelado') ? { situacao: d.situacao, ts: e.ts, pessoa: e.pessoa } : null;
          if (d.situacao === 'necessario') { ck.semChecklist = true; }
          if (d.observacao) v.observacao = d.observacao;
          break;
        }
        case 'checklist_importado': {
          const chave = chaveChecklist({ placa: e.placa, codigo: e.dados.codigo });
          if (codigos.has(chave)) break; // duplicado gravado por dois PCs ao mesmo tempo
          const ck = { ...e.dados, origem: 'pdf', importadoEm: e.ts, importadoPor: e.pessoa, arquivo: e.dados.arquivo };
          codigos.set(chave, e);
          v.checklists.push(ck);
          // vale o checklist mais recente pela data do teste
          if (!v.atual || !v.atual.dataTeste || (ck.dataTeste || '') >= v.atual.dataTeste) {
            v.atual = ck;
            v.validacao = null;
            v.manual = null; // PDF novo prevalece sobre Manutenção/Cancelado
          }
          break;
        }
        case 'validado':
          if (v.atual && (e.dados.codigo || null) === (v.atual.codigo || null)) {
            v.validacao = { ts: e.ts, pessoa: e.pessoa, codigo: e.dados.codigo || null };
            v.manual = null;
          }
          break;
        case 'situacao_definida':
          v.manual = e.dados.situacao ? { situacao: e.dados.situacao, ts: e.ts, pessoa: e.pessoa } : null;
          break;
        case 'observacao': v.observacao = e.dados.texto || ''; break;
        case 'desativado': v.ativo = false; break;
        case 'reativado': v.ativo = true; break;
      }
    }
    for (const v of veiculos.values()) classificar(v, agora);
    return { veiculos: [...veiculos.values()], pessoas: [...pessoas.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')), codigos, admin };
  }

  function classificar(v, agora) {
    const ck = v.atual;
    let resultado = null;
    if (ck && !ck.semChecklist) {
      resultado = ck.resultado;
      if (resultado === 'aprovado' && ck.vencimento && new Date(ck.vencimento) < agora) resultado = 'expirado';
    }
    v.resultado = resultado;
    v.vencimento = ck && ck.vencimento ? ck.vencimento : null;
    v.dias = diasAte(v.vencimento, agora);
    v.vencido = v.dias !== null && v.dias < 0;

    let s;
    if (v.manual) s = v.manual.situacao;
    else if (!ck || ck.semChecklist || resultado !== 'aprovado') s = 'necessario';
    else if (!v.validacao) s = 'confirmar';
    else if (v.dias !== null && v.dias <= ANTECEDENCIA_DIAS) s = 'necessario';
    else s = 'validado';
    v.situacao = s;
  }

  function ordenarFila(veiculos) {
    const pos = Object.fromEntries(SITUACOES.map((s, i) => [s.id, i]));
    return [...veiculos].sort((a, b) =>
      (pos[a.situacao] - pos[b.situacao]) ||
      ((a.vencimento || '0000') < (b.vencimento || '0000') ? -1 : (a.vencimento || '0000') > (b.vencimento || '0000') ? 1 : 0) ||
      a.placa.localeCompare(b.placa));
  }

  const api = { ANTECEDENCIA_DIAS, SITUACOES, LAYOUTS, normalizarPlaca, dataBR, linhasDoPdf, lerChecklist, chaveChecklist, montarEstado, ordenarFila };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Checklist = api;
})(typeof window !== 'undefined' ? window : globalThis);
