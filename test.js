// Comprueba los ports a JavaScript: node test.js
const assert = require('assert');
const Sim = require('./assets/sim.js');
const EJ = require('./assets/ejercicios.js');

const salida = (evs) => evs.filter((e) => e.tipo === 'out').map((e) => e.texto).join('\n');
const defectos = (ej) => Object.fromEntries(Object.entries(ej.opciones || {}).map(([k, o]) => [k, o.valores[o.defecto][0]]));

(async () => {
  // Todos terminan sin interbloqueo, con varias semillas, y pasan por todos los pasos del arranque
  for (const ej of EJ) {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const evs = await Sim.simular(ej.run, { semilla, ...defectos(ej) });
      assert.equal(evs.at(-1).quien, 'ok', `${ej.id} semilla ${semilla}: ${evs.at(-1).texto}`);
      assert.equal(new Set(evs.filter((e) => e.tipo === 'paso').map((e) => e.paso)).size, ej.arranque.length, ej.id);
    }
  }

  // MPI: la matriz no depende del número de procesos; fila 0 = 15 + A[0][j]
  const mpi = EJ.find((e) => e.id === 'mpi-matrices');
  const matriz = async (p) => salida(await Sim.simular(mpi.run, { procesos: p })).split('\n').slice(1).join('\n');
  const m1 = await matriz(1);
  assert.ok(m1.startsWith('[[  16.0   17.0   18.0   19.0   20.0]'));
  for (const p of [2, 3, 4, 5]) assert.equal(await matriz(p), m1);

  // Misioneros: misma salida que secuencial_MisionerosNotacion.java
  const mis = EJ.find((e) => e.id === 'misioneros');
  assert.equal(salida(await Sim.simular(mis.run, { formato: 'notacion' })), [
    'Lado A = F[Misioneros, Canibales, M_Movidos, C_Movidos]',
    'Lado B = D[Misioneros, Canibales]',
    '-------------------------------------------------------',
    'F[3,3,0,0]   INICIO   D[0,0]', 'F[3,1,0,2]   --->   D[0,2]', 'F[3,2,0,1]   <---   D[0,1]',
    'F[3,0,0,2]   --->   D[0,3]', 'F[3,1,0,1]   <---   D[0,2]', 'F[1,1,2,0]   --->   D[2,2]',
    'F[2,2,1,1]   <---   D[1,1]', 'F[0,2,2,0]   --->   D[3,1]', 'F[0,3,0,1]   <---   D[3,0]',
    'F[0,1,0,2]   --->   D[3,2]', 'F[1,1,1,0]   <---   D[2,2]', 'F[0,0,1,1]   --->   D[3,3]',
  ].join('\n'));

  console.log(`OK: ${EJ.length} ejercicios`);
})().catch((e) => { console.error(e); process.exit(1); });
