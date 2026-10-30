'use strict';

const $ = id => document.getElementById(id);
const moeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const carrinho = [];
const produtosDemo = {
  arroz: { nome: 'Arroz branco — 1 kg', preco: 690, descricao: 'Pacote de arroz branco de 1 quilograma.', braille: '⠁⠗⠗⠕⠵' },
  leite: { nome: 'Leite integral — 1 L', preco: 429, descricao: 'Embalagem de leite integral de 1 litro.', braille: '⠇⠑⠊⠞⠑' },
  feijao: { nome: 'Feijão carioca — 1 kg', preco: 849, descricao: 'Pacote de feijão carioca de 1 quilograma.', braille: '⠋⠑⠊⠚⠜⠕' }
};
let produtoSelecionado = 'arroz';

function avisar(mensagem) {
  $('avisos').textContent = '';
  // Atualiza a região de avisos para tecnologias assistivas.
  requestAnimationFrame(() => { $('avisos').textContent = mensagem; });
}

function precoEmCentavos(texto) {
  const valor = texto.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(valor)) return null;
  const numero = Number(valor.replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0 || numero > 1000000) return null;
  return Math.round(numero * 100);
}

function obterProduto() {
  const nome = $('nome').value.trim();
  const centavos = precoEmCentavos($('preco').value);
  const quantidade = Number($('quantidade').value);
  const desconto = Number($('desconto').value);
  if (!nome) throw new Error('Informe o nome do produto.');
  if (centavos === null) throw new Error('Informe um preço válido, como 4,29.');
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 100000) throw new Error('Informe uma quantidade inteira entre 1 e 100000.');
  if (!Number.isInteger(desconto) || desconto < 0 || desconto > 100) throw new Error('O desconto deve estar entre 0% e 100%.');
  const subtotalCentavos = centavos * quantidade;
  const totalCentavos = Math.round(subtotalCentavos * (100 - desconto) / 100);
  return { nome, quantidade, desconto, subtotalCentavos, totalCentavos, economiaCentavos: subtotalCentavos - totalCentavos };
}

function calcular() {
  try {
    const produto = obterProduto();
    $('erro').hidden = true;
    $('subtotal').textContent = moeda(produto.subtotalCentavos / 100);
    $('economia').textContent = moeda(produto.economiaCentavos / 100);
    $('total-produto').textContent = moeda(produto.totalCentavos / 100);
    return produto;
  } catch (erro) {
    $('erro').textContent = erro.message;
    $('erro').hidden = false;
    avisar(erro.message);
    return null;
  }
}

function atualizarCarrinho() {
  const lista = $('lista-carrinho');
  lista.replaceChildren();
  carrinho.forEach((produto, indice) => {
    const item = document.createElement('li');
    const informacoes = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = `${produto.nome} — ${moeda(produto.totalCentavos / 100)}`;
    const detalhes = document.createElement('span');
    detalhes.textContent = `${produto.quantidade} unidade(s) • ${produto.desconto}% de desconto`;
    informacoes.append(titulo, detalhes);
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'remove-btn';
    remover.textContent = 'Remover';
    remover.setAttribute('aria-label', `Remover ${produto.nome} do carrinho`);
    remover.addEventListener('click', () => {
      carrinho.splice(indice, 1);
      atualizarCarrinho();
      avisar(`${produto.nome} removido do carrinho.`);
    });
    item.append(informacoes, remover);
    lista.append(item);
  });
  const total = carrinho.reduce((soma, produto) => soma + produto.totalCentavos, 0);
  const economia = carrinho.reduce((soma, produto) => soma + produto.economiaCentavos, 0);
  $('total-carrinho').textContent = moeda(total / 100);
  $('economia-carrinho').textContent = moeda(economia / 100);
  $('carrinho-vazio').hidden = carrinho.length > 0;
}

function falar(texto) {
  if (!('speechSynthesis' in window)) {
    avisar('A leitura por voz não está disponível neste navegador.');
    return;
  }
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';
  fala.rate = 0.9;
  const voz = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('pt-br'));
  if (voz) fala.voice = voz;
  window.speechSynthesis.speak(fala);
}

$('desconto').addEventListener('input', () => {
  $('desconto-valor').textContent = `${$('desconto').value}%`;
});
$('calcular').addEventListener('click', () => {
  if (calcular()) avisar('Cálculo atualizado. Confira o resultado do produto.');
});
$('form-produto').addEventListener('submit', evento => {
  evento.preventDefault();
  const produto = calcular();
  if (!produto) return;
  carrinho.push(produto);
  atualizarCarrinho();
  avisar(`${produto.nome} adicionado ao carrinho.`);
});
$('ouvir-resultado').addEventListener('click', () => {
  const produto = calcular();
  if (!produto) return;
  falar(`${produto.nome}. Quantidade: ${produto.quantidade}. Desconto de ${produto.desconto} por cento. Subtotal: ${moeda(produto.subtotalCentavos / 100)}. Economia: ${moeda(produto.economiaCentavos / 100)}. Total: ${moeda(produto.totalCentavos / 100)}.`);
});
$('ouvir-carrinho').addEventListener('click', () => {
  if (!carrinho.length) { falar('Seu carrinho está vazio.'); return; }
  const total = carrinho.reduce((soma, produto) => soma + produto.totalCentavos, 0);
  const economia = carrinho.reduce((soma, produto) => soma + produto.economiaCentavos, 0);
  falar(`Seu carrinho tem ${carrinho.length} produto ou produtos adicionados. Economia total: ${moeda(economia / 100)}. Total da compra: ${moeda(total / 100)}.`);
});
$('limpar-carrinho').addEventListener('click', () => {
  if (!carrinho.length) { avisar('O carrinho já está vazio.'); return; }
  if (!window.confirm('Deseja remover todos os produtos do carrinho?')) return;
  carrinho.length = 0;
  atualizarCarrinho();
  avisar('Carrinho esvaziado.');
});

function selecionarProduto(chave) {
  const produto = produtosDemo[chave];
  if (!produto) return;
  produtoSelecionado = chave;
  $('demo-nome').textContent = produto.nome;
  $('demo-preco').textContent = moeda(produto.preco / 100);
  $('demo-descricao').textContent = produto.descricao;
  $('demo-braille').textContent = produto.braille;
  document.querySelectorAll('.demo-product').forEach(botao => {
    const ativo = botao.dataset.product === chave;
    botao.classList.toggle('selected', ativo);
    botao.setAttribute('aria-pressed', String(ativo));
  });
  avisar(`${produto.nome} selecionado. Preço demonstrativo: ${moeda(produto.preco / 100)}.`);
}
document.querySelectorAll('.demo-product').forEach(botao => {
  botao.addEventListener('click', () => selecionarProduto(botao.dataset.product));
});
$('demo-ouvir').addEventListener('click', () => {
  const produto = produtosDemo[produtoSelecionado];
  falar(`${produto.nome}. Preço demonstrativo: ${moeda(produto.preco / 100)}. ${produto.descricao}`);
});
$('demo-adicionar').addEventListener('click', () => {
  const produto = produtosDemo[produtoSelecionado];
  $('nome').value = produto.nome;
  $('preco').value = (produto.preco / 100).toFixed(2).replace('.', ',');
  $('quantidade').value = '1';
  $('desconto').value = '0';
  $('desconto-valor').textContent = '0%';
  calcular();
  $('calculadora').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  avisar(`${produto.nome} preenchido na calculadora. Você pode adicioná-lo ao carrinho.`);
});

const menu = document.querySelector('.menu-toggle');
const nav = $('nav-principal');
menu.addEventListener('click', () => {
  const aberto = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!aberto));
  menu.setAttribute('aria-label', aberto ? 'Abrir menu' : 'Fechar menu');
  nav.classList.toggle('open', !aberto);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Abrir menu');
}));
