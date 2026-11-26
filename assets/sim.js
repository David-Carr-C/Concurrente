// Runtime mínimo para simular procesos concurrentes en JavaScript.
// Cada "proceso" es una función async. El tiempo es virtual: sleep() no espera de verdad,
// el planificador salta al siguiente instante. Con la misma semilla, la ejecución es idéntica.
(function () {
  // Una macrotarea: deja correr todas las microtareas (todos los procesos avanzan hasta bloquearse).
  const tick = () => new Promise((r) => {
    const c = new MessageChannel();
    c.port1.onmessage = () => { c.port1.close(); r(); };
    c.port2.postMessage(0);
  });

  async function simular(main, opciones = {}) {
    let ahora = 0, orden = 0, pasoActual = -1;
    const timers = [], eventos = [];
    const ev = (tipo, texto, quien = '') => eventos.push({ t: ahora, tipo, texto, quien, paso: pasoActual });

    // Generador pseudoaleatorio con semilla (mulberry32)
    let s = (opciones.semilla ?? 1) >>> 0;
    const random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Canal de mensajes FIFO (equivale a multiprocessing.Queue)
    class Canal {
      constructor(nombre = 'canal', maxsize = Infinity) {
        Object.assign(this, { nombre, maxsize, items: [], esperando: [] });
      }
      // ponytail: put() nunca bloquea aunque el canal esté lleno; solo putNowait respeta maxsize (lo único que usan los ejercicios)
      put(x) {
        ev('msg', `→ ${this.nombre}: ${fmt(x)}`);
        if (this.esperando.length) this.esperando.shift()(x);
        else this.items.push(x);
      }
      putNowait(x) {
        if (this.items.length >= this.maxsize) throw new Error('queue.Full');
        this.put(x);
      }
      get() {
        const p = this.items.length ? Promise.resolve(this.items.shift()) : new Promise((r) => this.esperando.push(r));
        return p.then((x) => { ev('msg', `← ${this.nombre}: ${fmt(x)}`); return x; });
      }
    }

    // Variable de condición de un monitor (Java Condition). El lock es implícito: JS tiene un solo hilo.
    class Condicion {
      constructor() { this.esperando = []; }
      await() { return new Promise((r) => this.esperando.push(r)); }
      signalAll() { this.esperando.splice(0).forEach((r) => r()); }
    }

    const fmt = (x) =>
      x instanceof Canal ? x.nombre
      : Array.isArray(x) ? (Array.isArray(x[0]) ? `matriz ${x.length}x${x[0].length}` : `(${x.map(fmt).join(', ')})`)
      : typeof x === 'string' ? `"${x}"`
      : x == null ? 'None' : String(x);

    const rt = {
      Canal, Condicion, random,
      uniform: (a, b) => a + (b - a) * random(),
      randint: (n) => Math.floor(random() * n),
      choice: (arr) => arr[Math.floor(random() * arr.length)],
      sleep: (seg) => new Promise((r) => timers.push({ t: ahora + seg, orden: orden++, r })),
      print: (texto, quien) => ev('out', texto, quien),
      traza: (texto, quien) => ev('traza', texto, quien),
      paso: (n) => { pasoActual = n; ev('paso', '', ''); },
      // Arranca un proceso (como Process.start()): empieza a correr después de que main siga
      spawn: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
      join: (...ps) => Promise.all(ps.flat()),
    };

    let terminado = false, error = null;
    Promise.resolve().then(() => main(rt, opciones)).then(() => { terminado = true; }, (e) => { error = e; });

    for (let n = 0; n < 100000 && !terminado && !error; n++) {
      await tick();
      if (terminado || error || !timers.length) break; // sin timers y sin terminar = todos bloqueados
      timers.sort((a, b) => a.t - b.t || a.orden - b.orden);
      const { t, r } = timers.shift();
      ahora = t;
      r();
    }
    await tick();
    if (error) ev('fin', 'Error: ' + (error.message || error), 'mal');
    else if (!terminado) ev('fin', 'Bloqueado: ningún proceso puede avanzar (interbloqueo)', 'mal');
    else ev('fin', `Programa terminado (t = ${ahora.toFixed(2)} s)`, 'ok');
    return eventos;
  }

  const Sim = { simular };
  if (typeof module !== 'undefined') module.exports = Sim;
  else window.Sim = Sim;
})();
