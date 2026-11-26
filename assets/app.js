(function () {
  const EJ = window.EJERCICIOS;
  const TIPOS = { mensajes: 'Paso de mensajes', monitor: 'Memoria compartida (monitor)', secuencial: 'Secuencial' };
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, texto) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  };
  const fuentes = {}; // código original ya descargado
  let st = null; // estado de la vista de ejercicio

  // ---------- Navegación ----------
  function menu(idActual) {
    const aside = $('#nav');
    aside.replaceChildren(enlace('#inicio', 'Inicio', idActual === 'inicio'));
    for (const tipo of Object.keys(TIPOS)) {
      aside.append(el('h4', null, TIPOS[tipo]));
      for (const e of EJ.filter((e) => e.tipo === tipo)) aside.append(enlace('#' + e.id, e.titulo, e.id === idActual));
    }
  }
  function enlace(href, texto, actual) {
    const a = el('a', null, texto);
    a.href = href;
    if (actual) a.setAttribute('aria-current', 'page');
    return a;
  }

  function ruta() {
    if (st) pausar();
    st = null;
    const ej = EJ.find((e) => '#' + e.id === location.hash);
    menu(ej ? ej.id : 'inicio');
    if (ej) vistaEjercicio(ej); else vistaInicio();
    window.scrollTo(0, 0);
  }

  function vistaInicio() {
    const v = $('#tpl-inicio').content.cloneNode(true);
    for (const e of EJ) {
      const a = el('a', 'card');
      a.href = '#' + e.id;
      a.append(el('span', 'badge ' + e.tipo, TIPOS[e.tipo]), el('h3', null, e.titulo), el('p', null, e.lenguaje),
        el('code', null, typeof e.archivo === 'function' ? 'secuencial_Misioneros*.java (2 versiones)' : e.archivo));
      $('[data-k=cards]', v).append(a);
    }
    $('#main').replaceChildren(v);
    document.title = 'Programación concurrente · Ejercicios';
  }

  // ---------- Vista de ejercicio ----------
  function vistaEjercicio(ej) {
    const v = $('#tpl-ej').content.cloneNode(true);
    const k = (n) => $(`[data-k="${n}"]`, v);
    document.title = ej.titulo + ' · Concurrencia';

    k('crumb').textContent = TIPOS[ej.tipo];
    k('titulo').textContent = ej.titulo;
    k('resumen').textContent = ej.resumen;
    k('badge').textContent = TIPOS[ej.tipo];
    k('badge').classList.add(ej.tipo);
    k('lenguaje').textContent = 'Original: ' + ej.lenguaje;
    ej.conceptos.forEach((c) => k('conceptos').append(el('li', null, c)));
    ej.notas.forEach((c) => k('notas').append(el('li', null, c)));
    ej.arranque.forEach((p, n) => {
      const li = el('li', null, p);
      li.tabIndex = 0;
      li.onclick = () => irAPaso(n);
      li.onkeydown = (e) => { if (e.key === 'Enter') irAPaso(n); };
      k('pasos').append(li);
    });

    const opts = {};
    for (const [clave, o] of Object.entries(ej.opciones || {})) {
      opts[clave] = o.valores[o.defecto][0];
      const sel = el('select');
      o.valores.forEach(([, texto], i) => sel.append(new Option(texto, i, false, i === o.defecto)));
      sel.onchange = () => { st.opts[clave] = o.valores[sel.value][0]; k2('archivo').textContent = archivo(); mostrarCodigo(); simular(); };
      const lab = el('label', null, o.etiqueta + ' ');
      lab.append(sel);
      k('opciones').append(lab);
    }

    const i = EJ.indexOf(ej), prev = EJ[i - 1], next = EJ[i + 1];
    pager(k('prev'), prev, '← Anterior');
    pager(k('next'), next, 'Siguiente →');

    $('#main').replaceChildren(v);
    const k2 = (n) => $(`#main [data-k="${n}"]`);
    st = { ej, opts, semilla: 1, eventos: [], i: 0, timer: null, jugando: false, tab: 'orig', colores: new Map() };
    k2('archivo').textContent = archivo();

    $('#play').onclick = () => (st.jugando ? pausar() : reproducir());
    $('#paso').onclick = () => { pausar(); avanzar(); };
    $('#atras').onclick = () => { pausar(); retroceder(); };
    $('#fin').onclick = () => { pausar(); st.i = st.eventos.length; pintar(); };
    $('#reiniciar').onclick = () => { pausar(); st.i = 0; pintar(); };
    $('#ver').onchange = pintar;
    $('#semilla').onchange = (e) => { st.semilla = Math.max(1, Number(e.target.value) || 1); simular(); };
    $('#azar').onclick = () => { $('#semilla').value = st.semilla = 1 + Math.floor(Math.random() * 9999); simular(); };
    $('#tab-orig').onclick = () => { st.tab = 'orig'; mostrarCodigo(); };
    $('#tab-js').onclick = () => { st.tab = 'js'; mostrarCodigo(); };

    mostrarCodigo();
    simular();
  }

  function pager(a, ej, texto) {
    if (!ej) return a.remove();
    a.href = '#' + ej.id;
    a.append(el('small', null, texto), el('span', null, ej.titulo));
  }

  const archivo = () => (typeof st.ej.archivo === 'function' ? st.ej.archivo(st.opts) : st.ej.archivo);

  // ---------- Código ----------
  async function mostrarCodigo() {
    const pre = $('#codigo'), yo = st;
    $('#tab-orig').setAttribute('aria-selected', st.tab === 'orig');
    $('#tab-js').setAttribute('aria-selected', st.tab === 'js');
    $('#tab-orig').textContent = 'Original · ' + archivo();
    if (st.tab === 'js') return (pre.textContent = dedent(st.ej.run.toString()));
    const f = archivo();
    pre.textContent = 'Cargando ' + f + '…';
    try {
      fuentes[f] ??= await fetch(f).then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
      if (yo === st && st.tab === 'orig' && archivo() === f) pre.textContent = fuentes[f];
    } catch {
      if (yo === st) pre.textContent = `No se pudo cargar ${f}.\nAbre la página desde un servidor (GitHub Pages o "python -m http.server"), no con doble clic.`;
    }
  }
  function dedent(s) {
    const lineas = s.split('\n');
    const ind = Math.min(...lineas.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return [lineas[0], ...lineas.slice(1).map((l) => l.slice(ind))].join('\n');
  }

  // ---------- Simulación y reproducción ----------
  async function simular() {
    pausar();
    const yo = st;
    $('#estado').textContent = 'Simulando…';
    const eventos = await Sim.simular(st.ej.run, { semilla: st.semilla, ...st.opts });
    if (yo !== st) return; // el usuario ya cambió de ejercicio
    st.eventos = eventos;
    st.i = 0;
    st.colores = new Map();
    for (const e of eventos) if (e.quien && e.tipo !== 'fin' && !st.colores.has(e.quien)) st.colores.set(e.quien, st.colores.size % 10);
    pintar();
  }

  const visible = (e) => $('#ver').checked || (e.tipo !== 'msg' && e.tipo !== 'traza');

  function avanzar() {
    let i = st.i;
    while (i < st.eventos.length && !visible(st.eventos[i])) i++;
    st.i = Math.min(i + 1, st.eventos.length);
    pintar();
  }
  function retroceder() {
    let i = st.i - 1;
    while (i > 0 && !visible(st.eventos[i - 1])) i--;
    st.i = Math.max(0, i);
    pintar();
  }
  function irAPaso(n) {
    const idx = st.eventos.findIndex((e) => e.tipo === 'paso' && e.paso === n);
    if (idx < 0) return;
    pausar();
    st.i = idx + 1;
    pintar();
  }

  function reproducir() {
    if (st.i >= st.eventos.length) st.i = 0;
    st.jugando = true;
    const tic = () => {
      avanzar();
      const ultimo = st.eventos[st.i - 1];
      const sig = st.eventos.slice(st.i).find(visible);
      if (!sig) { st.i = st.eventos.length; return pausar(); }
      // espera proporcional al tiempo virtual, con mínimo y máximo para que sea legible
      const ms = Math.min(1500, Math.max(90, (sig.t - ultimo.t) * 1000)) / Number($('#vel').value);
      st.timer = setTimeout(tic, ms);
    };
    tic();
  }
  function pausar() {
    clearTimeout(st.timer);
    st.jugando = false;
    if ($('#play')) pintar();
  }

  function pintar() {
    if (!$('#term')) return;
    const term = $('#term'), ev = st.eventos;
    term.replaceChildren();
    let pasoActual = -1;
    for (const e of ev.slice(0, st.i)) {
      if (e.tipo === 'paso') pasoActual = e.paso;
      if (visible(e)) term.append(linea(e));
    }
    if (!st.i) term.append(el('div', 'vacio', 'Pulsa ▶ Ejecutar o ⏭ Paso para arrancar el programa.'));
    term.scrollTop = term.scrollHeight;

    document.querySelectorAll('#main .steps li').forEach((li, n) => {
      li.classList.toggle('hecho', n < pasoActual);
      li.classList.toggle('actual', n === pasoActual);
    });
    const ult = ev[st.i - 1];
    $('#estado').textContent = `Evento ${st.i} de ${ev.length}` + (ult ? ` · t = ${ult.t.toFixed(2)} s` : '') + ` · semilla ${st.semilla}`;
    $('#play').textContent = st.jugando ? '⏸ Pausa' : st.i >= ev.length && ev.length ? '↻ Repetir' : '▶ Ejecutar';
    $('#paso').disabled = $('#fin').disabled = st.i >= ev.length;
    $('#atras').disabled = $('#reiniciar').disabled = st.i === 0;
  }

  function linea(e) {
    if (e.tipo === 'paso') return el('div', 'paso', `# Paso ${e.paso + 1} · ${st.ej.arranque[e.paso]}`);
    if (e.tipo === 'fin') return el('div', 'fin ' + e.quien, (e.quien === 'ok' ? '✓ ' : '✗ ') + e.texto);
    const d = el('div', 'ln ' + e.tipo);
    const x = el('span', 'x', e.texto);
    if (e.quien && e.tipo === 'out') x.style.color = `var(--p${st.colores.get(e.quien)})`;
    d.append(el('span', 't', e.t.toFixed(2)), x);
    return d;
  }

  document.addEventListener('keydown', (e) => {
    if (!st || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { pausar(); avanzar(); }
    if (e.key === 'ArrowLeft') { pausar(); retroceder(); }
  });
  window.addEventListener('hashchange', ruta);
  ruta();
})();
