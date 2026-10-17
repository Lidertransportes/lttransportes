/* ==========================================================
   LÍDER TRANSPORTES — site
   ========================================================== */

(function () {
  "use strict";

  const WHATS = "5534999454774";
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Menu do celular ---------- */

  const menu = document.getElementById("menu");
  const menuAbrir = document.getElementById("menuAbrir");

  function fecharMenu() {
    menu.classList.remove("aberto");
    menuAbrir.setAttribute("aria-expanded", "false");
  }

  menuAbrir.addEventListener("click", function () {
    const aberto = menu.classList.toggle("aberto");
    menuAbrir.setAttribute("aria-expanded", String(aberto));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) fecharMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharMenu();
  });

  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  /* ==========================================================
     LETREIRO ELETRÔNICO
     O texto é desenhado em baixa resolução e cada pixel aceso
     vira um LED âmbar, como no painel da frente dos ônibus.
     ========================================================== */

  const MENSAGENS = [
    "LÍDER TRANSPORTES",
    "FRETAMENTO EMPRESARIAL",
    "ARAGUARI - APARECIDA SP",
    "EXCURSÕES E ROMARIAS",
    "TRASLADOS PARA EVENTOS",
    "VIAGEM MONITORADA 24H",
    "PEÇA SEU ORÇAMENTO"
  ];

  const LINHAS = 16;               // altura do painel em LEDs
  const COR_ACESO = "#ffae1a";
  const COR_APAGADO = "rgba(255,174,26,0.07)";

  const canvas = document.getElementById("letreiro");

  if (canvas) {
    const ctx = canvas.getContext("2d");
    const rasc = document.createElement("canvas");
    const rctx = rasc.getContext("2d", { willReadFrequently: true });

    let colunas = 0, passo = 0, dpr = 1;
    let indice = 0, deslocamento = 0, pausa = 0, mascara = null, larguraTexto = 0;
    let ultimo = 0, visivel = true;

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      passo = canvas.height / LINHAS;
      colunas = Math.floor(canvas.width / passo);
      prepararSprites();
      ultimoDesenho = "";
    }

    function hora() {
      const d = new Date();
      return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    // Converte um texto em uma matriz de LEDs (linhas x colunas).
    function rasterizar(texto) {
      const fonte = '700 15px "Archivo", system-ui, sans-serif';
      rctx.font = fonte;
      if ("fontStretch" in rctx) rctx.fontStretch = "condensed";
      const largura = Math.ceil(rctx.measureText(texto).width) + 2;
      rasc.width = largura;
      rasc.height = LINHAS;
      rctx.font = fonte;
      if ("fontStretch" in rctx) rctx.fontStretch = "condensed";
      rctx.fillStyle = "#000";
      rctx.fillRect(0, 0, largura, LINHAS);
      rctx.fillStyle = "#fff";
      rctx.textBaseline = "middle";
      rctx.fillText(texto, 1, LINHAS / 2 + 1);
      const px = rctx.getImageData(0, 0, largura, LINHAS).data;
      const m = [];
      for (let y = 0; y < LINHAS; y++) {
        const linha = new Uint8Array(largura);
        for (let x = 0; x < largura; x++) linha[x] = px[(y * largura + x) * 4] > 150 ? 1 : 0;
        m.push(linha);
      }
      return { m, largura };
    }

    function proxima() {
      const r = rasterizar(MENSAGENS[indice]);
      mascara = r.m;
      larguraTexto = r.largura;
      indice = (indice + 1) % MENSAGENS.length;

      const area = colunas - areaRelogio();
      if (larguraTexto <= area || reduzirMovimento) {
        deslocamento = -Math.floor((area - larguraTexto) / 2);
        pausa = 3400;              // cabe na tela: mostra parado
      } else {
        deslocamento = -Math.min(area, 20);   // não cabe: entra rolando pela direita
        pausa = -1;
      }
    }

    let relogio = null;
    let larguraRelogio = 0;
    function areaRelogio() {
      if (!larguraRelogio) larguraRelogio = rasterizar("88:88").largura;
      return colunas >= 110 ? larguraRelogio + 8 : 0;   // em telas estreitas o relógio some
    }

    // LEDs pré-desenhados (aceso com brilho e apagado), copiados para o painel.
    let spriteAceso = null, spriteApagado = null, tam = 0;
    function prepararSprites() {
      tam = Math.ceil(passo * 2);
      function sprite(aceso) {
        const c = document.createElement("canvas");
        c.width = c.height = tam;
        const g = c.getContext("2d");
        const m = tam / 2;
        if (aceso) {
          const brilho = g.createRadialGradient(m, m, 0, m, m, m);
          brilho.addColorStop(0, "rgba(255,174,26,0.45)");
          brilho.addColorStop(1, "rgba(255,174,26,0)");
          g.fillStyle = brilho;
          g.fillRect(0, 0, tam, tam);
        }
        g.fillStyle = aceso ? COR_ACESO : COR_APAGADO;
        g.beginPath();
        g.arc(m, m, passo * 0.36, 0, Math.PI * 2);
        g.fill();
        return c;
      }
      spriteAceso = sprite(true);
      spriteApagado = sprite(false);
    }

    function led(x, y, aceso) {
      const off = (tam - passo) / 2;
      ctx.drawImage(aceso ? spriteAceso : spriteApagado, x * passo - off, y * passo - off);
    }

    let ultimoDesenho = "";
    function desenhar() {
      const ar = areaRelogio();
      const chave = Math.floor(deslocamento) + "|" + indice + "|" + hora() + "|" + colunas;
      if (chave === ultimoDesenho) return;      // nada mudou: não redesenha
      ultimoDesenho = chave;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // apagados primeiro, acesos por cima (o brilho não fica coberto)
      for (let pass = 0; pass < 2; pass++) {
        const acesos = pass === 1;
        if (ar) {
          if (!relogio || relogio.texto !== hora()) relogio = Object.assign(rasterizar(hora()), { texto: hora() });
          const ini = Math.floor((ar - 2 - relogio.largura) / 2);
          for (let y = 0; y < LINHAS; y++) {
            for (let x = 0; x < ar - 2; x++) {
              const tx = x - ini;
              const aceso = !!(tx >= 0 && tx < relogio.largura && relogio.m[y][tx]);
              if (aceso === acesos) led(x, y, aceso);
            }
          }
        }
        const d = Math.floor(deslocamento);
        for (let y = 0; y < LINHAS; y++) {
          for (let x = ar; x < colunas; x++) {
            const tx = x - ar + d;
            const aceso = !!(mascara && tx >= 0 && tx < larguraTexto && mascara[y][tx]);
            if (aceso === acesos) led(x, y, aceso);
          }
        }
      }

      if (ar) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect((ar - 1.5) * passo, 0, Math.max(1, passo * 0.2), canvas.height);
      }
    }

    function quadro(t) {
      if (!visivel) { ultimo = t; requestAnimationFrame(quadro); return; }
      const dt = Math.min(t - (ultimo || t), 60);
      ultimo = t;

      if (pausa > 0) {
        pausa -= dt;
        if (pausa <= 0) proxima();
        desenhar();
      } else {
        // rolagem: ~38 colunas de LED por segundo
        deslocamento += dt * 0.038;
        if (deslocamento > larguraTexto) proxima();
        desenhar();
      }
      requestAnimationFrame(quadro);
    }

    function iniciar() {
      medir();
      proxima();
      desenhar();
      requestAnimationFrame(quadro);
    }

    // Só anima quando o letreiro está na tela.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ent) { visivel = ent[0].isIntersecting; }).observe(canvas);
    }

    let espera;
    window.addEventListener("resize", function () {
      clearTimeout(espera);
      espera = setTimeout(function () { medir(); relogio = null; indice = (indice - 1 + MENSAGENS.length) % MENSAGENS.length; proxima(); desenhar(); }, 150);
    });

    (document.fonts ? document.fonts.load('condensed 700 15px "Archivo"').catch(function () {}) : Promise.resolve())
      .then(iniciar, iniciar);
  }

  /* ==========================================================
     FROTA: abas e galerias
     ========================================================== */

  const abas = Array.from(document.querySelectorAll('.frota-abas [role="tab"]'));

  function ativarAba(aba, focar) {
    abas.forEach(function (a) {
      const ativa = a === aba;
      a.setAttribute("aria-selected", String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute("aria-controls")).hidden = !ativa;
    });
    if (focar) aba.focus();
  }

  abas.forEach(function (aba, i) {
    aba.addEventListener("click", function () { ativarAba(aba); });
    aba.addEventListener("keydown", function (e) {
      let n = null;
      if (e.key === "ArrowRight") n = (i + 1) % abas.length;
      if (e.key === "ArrowLeft") n = (i - 1 + abas.length) % abas.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = abas.length - 1;
      if (n !== null) { e.preventDefault(); ativarAba(abas[n], true); }
    });
  });

  document.querySelectorAll(".veiculo-galeria").forEach(function (gal) {
    const principal = gal.querySelector(".foto-principal");
    const frente = principal.querySelector(".foto-frente");
    const fundo = principal.querySelector(".foto-fundo");
    const conta = principal.querySelector(".foto-conta");
    const minis = Array.from(gal.querySelectorAll(".mini"));
    let atual = 0;

    function mostrar(i) {
      atual = i;
      const m = minis[i];
      frente.removeAttribute("srcset");
      frente.src = m.dataset.src;
      frente.width = m.dataset.w;
      frente.height = m.dataset.h;
      frente.alt = m.dataset.alt;
      fundo.src = m.dataset.src;
      conta.textContent = (i + 1) + " / " + minis.length;
      minis.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
    }

    minis.forEach(function (b, i) { b.addEventListener("click", function () { mostrar(i); }); });

    principal.addEventListener("click", function () {
      abrirVisor(minis.map(function (m) { return { src: m.dataset.grande, alt: m.dataset.alt }; }), atual);
    });
  });

  /* ==========================================================
     VISUALIZADOR DE FOTOS
     ========================================================== */

  const visor = document.getElementById("visor");
  const visorImg = document.getElementById("visorImg");
  const visorLegenda = document.getElementById("visorLegenda");
  const visorConta = document.getElementById("visorConta");
  let lista = [], pos = 0;

  function exibir(i) {
    pos = (i + lista.length) % lista.length;
    visorImg.src = lista[pos].src;
    visorImg.alt = lista[pos].alt;
    visorLegenda.textContent = lista[pos].alt;
    visorConta.textContent = (pos + 1) + " de " + lista.length;
    const um = lista.length < 2;
    visor.querySelector(".visor-ant").hidden = um;
    visor.querySelector(".visor-prox").hidden = um;
  }

  function abrirVisor(itens, i) {
    lista = itens;
    exibir(i);
    if (typeof visor.showModal === "function") visor.showModal();
    else visor.setAttribute("open", "");
  }

  function fecharVisor() {
    if (typeof visor.close === "function") visor.close();
    else visor.removeAttribute("open");
  }

  visor.querySelector("[data-fechar]").addEventListener("click", fecharVisor);
  visor.querySelector(".visor-ant").addEventListener("click", function () { exibir(pos - 1); });
  visor.querySelector(".visor-prox").addEventListener("click", function () { exibir(pos + 1); });
  visor.addEventListener("click", function (e) { if (e.target === visor) fecharVisor(); });
  visor.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") exibir(pos + 1);
    if (e.key === "ArrowLeft") exibir(pos - 1);
  });

  // Arrastar para o lado no celular
  let toqueX = null;
  visor.addEventListener("touchstart", function (e) { toqueX = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener("touchend", function (e) {
    if (toqueX === null) return;
    const dx = e.changedTouches[0].clientX - toqueX;
    if (Math.abs(dx) > 50) exibir(pos + (dx < 0 ? 1 : -1));
    toqueX = null;
  });

  const itensMosaico = Array.from(document.querySelectorAll(".mosaico-item"));
  itensMosaico.forEach(function (b, i) {
    b.addEventListener("click", function () {
      abrirVisor(itensMosaico.map(function (m) { return { src: m.dataset.grande, alt: m.dataset.alt }; }), i);
    });
  });

  /* ==========================================================
     ORÇAMENTO PELO WHATSAPP
     ========================================================== */

  const VEICULOS = {
    sprinter: { nome: "Sprinter 415", lugares: 15, foto: "img/sprinter-1-800.jpg" },
    master:   { nome: "Renault Master Executiva", lugares: 16, foto: "img/master-1-800.jpg" },
    daily:    { nome: "Iveco Daily", lugares: 20, foto: "img/daily-1-800.jpg" },
    volare:   { nome: "Volare Fly 10", lugares: 31, foto: "img/volare-1-800.jpg" }
  };

  const form = document.getElementById("orcForm");

  if (form) {
    const faixa = document.getElementById("pessoasFaixa");
    const numero = document.getElementById("pessoas");
    const foto = document.getElementById("indicadoFoto");
    const nome = document.getElementById("indicadoNome");
    const nota = document.getElementById("indicadoNota");
    const msg = document.getElementById("mensagem");
    const enviar = document.getElementById("enviarWhats");
    let preferido = null;

    function indicar(n) {
      if (preferido && VEICULOS[preferido].lugares >= n) {
        const v = VEICULOS[preferido];
        return { foto: v.foto, nome: v.nome, nota: v.lugares + " lugares, escolhido na frota", texto: v.nome };
      }
      if (n <= 15) return { foto: VEICULOS.sprinter.foto, nome: "Sprinter 415 ou Master", nota: "vans executivas de 15 e 16 lugares", texto: "van executiva (Sprinter ou Master)" };
      if (n <= 20) return { foto: VEICULOS.daily.foto, nome: "Iveco Daily", nota: "20 lugares reclináveis", texto: "Iveco Daily (20 lugares)" };
      if (n <= 31) return { foto: VEICULOS.volare.foto, nome: "Volare Fly 10", nota: "31 lugares, com banheiro", texto: "Volare Fly 10 (31 lugares)" };
      return { foto: "img/galeria-3-800.jpg", nome: "Mais de um veículo", nota: "nossa equipe monta a combinação ideal", texto: "combinação de veículos" };
    }

    function dataBR(v) {
      if (!v) return "";
      const p = v.split("-");
      return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : v;
    }

    function atualizar() {
      const d = new FormData(form);
      const n = Math.max(1, parseInt(numero.value, 10) || 1);
      const ind = indicar(n);

      if (foto.getAttribute("src") !== ind.foto) foto.src = ind.foto;
      nome.textContent = ind.nome;
      nota.textContent = ind.nota;

      const linhas = ["Olá! Quero um orçamento pelo site.", ""];
      linhas.push("Tipo: " + d.get("tipo"));
      if (d.get("origem")) linhas.push("Saída: " + d.get("origem").trim());
      linhas.push("Destino: " + (d.get("destino").trim() || "a definir"));
      if (d.get("ida")) linhas.push("Ida: " + dataBR(d.get("ida")));
      if (d.get("volta")) linhas.push("Volta: " + dataBR(d.get("volta")));
      linhas.push("Pessoas: " + n);
      linhas.push("Veículo sugerido: " + ind.texto);
      if (d.get("obs").trim()) linhas.push("", "Observações: " + d.get("obs").trim());

      const texto = linhas.join("\n");
      msg.textContent = texto;
      enviar.href = "https://wa.me/" + WHATS + "?text=" + encodeURIComponent(texto);
    }

    faixa.addEventListener("input", function () { numero.value = faixa.value; atualizar(); });
    numero.addEventListener("input", function () {
      const v = parseInt(numero.value, 10);
      if (v >= 1) faixa.value = Math.min(v, Number(faixa.max));
      atualizar();
    });
    form.addEventListener("input", atualizar);
    form.addEventListener("change", atualizar);
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    // Data de ida não pode ser no passado; volta não antes da ida.
    const ida = form.elements.ida, volta = form.elements.volta;
    const hoje = new Date(); hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
    ida.min = volta.min = hoje.toISOString().slice(0, 10);
    ida.addEventListener("change", function () { volta.min = ida.value || ida.min; });

    // "Orçar com a Master" etc. na seção da frota
    document.querySelectorAll("[data-veiculo]").forEach(function (b) {
      b.addEventListener("click", function () {
        preferido = b.dataset.veiculo;
        const v = VEICULOS[preferido];
        numero.value = faixa.value = v.lugares;
        atualizar();
      });
    });

    atualizar();
  }
})();
