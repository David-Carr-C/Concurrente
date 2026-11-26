// Cada ejercicio: metadatos + run(rt, opts), el port a JavaScript del programa original.
// La pestaña "JavaScript" de la web muestra el código de run() tal cual.
(function () {
  const EJERCICIOS = [
    {
      id: 'productor-consumidor',
      titulo: 'Productor–Consumidor',
      tipo: 'mensajes',
      lenguaje: 'Python · multiprocessing',
      archivo: 'mensajes_productor_consumidor.py',
      resumen: 'Dos procesos que no comparten memoria se comunican solo por un canal (Queue). El productor envía 5 paquetes y luego un mensaje de control; el consumidor los recibe en orden FIFO y se bloquea cuando el canal está vacío.',
      conceptos: [
        'send = canal.put(): no bloquea (el canal no tiene límite).',
        'receive = canal.get(): bloquea hasta que llega un mensaje.',
        'Mensaje centinela FIN_DE_TRANSMISION para avisar que no hay más datos.',
        'El consumidor es más lento (1–1.5 s) que el productor (0.5–1 s): los mensajes se acumulan en el canal.',
      ],
      notas: ['Se eliminó consumidorproductor2.py: era una copia idéntica.'],
      arranque: [
        'Crear el canal de mensajes: multiprocessing.Queue()',
        'Crear y arrancar el proceso productor',
        'Crear y arrancar el proceso consumidor',
        'main espera con join() a que ambos terminen',
      ],
      async run(rt) {
        const { Canal, sleep, uniform, print, spawn, join, paso } = rt;

        async function productor(canal_mensajes) {
          for (let i = 0; i < 5; i++) {
            const mensaje = `Paquete_de_datos_${i}`;
            print(`[Productor] Enviando: ${mensaje}`, 'Productor');
            canal_mensajes.put(mensaje); // SEND
            await sleep(uniform(0.5, 1.0));
          }
          canal_mensajes.put('FIN_DE_TRANSMISION'); // mensaje de control
          print('[Productor] Finalizó su trabajo.', 'Productor');
        }

        async function consumidor(canal_mensajes) {
          while (true) {
            const mensaje_recibido = await canal_mensajes.get(); // RECEIVE (bloquea)
            if (mensaje_recibido === 'FIN_DE_TRANSMISION') {
              print('[Consumidor] Mensaje de fin recibido. Terminando.', 'Consumidor');
              break;
            }
            print(`[Consumidor] Recibió y procesó: ${mensaje_recibido}`, 'Consumidor');
            await sleep(uniform(1.0, 1.5));
          }
        }

        paso(0); const canal = new Canal('canal');
        paso(1); const p = spawn(productor, canal);
        paso(2); const c = spawn(consumidor, canal);
        paso(3); await join(p, c);
      },
    },

    {
      id: 'filosofos',
      titulo: 'Filósofos comensales',
      tipo: 'mensajes',
      lenguaje: 'Python · multiprocessing',
      archivo: 'mensajes_filosofos.py',
      resumen: 'Cinco filósofos alternan entre pensar y comer; para comer necesitan los dos tenedores vecinos. Cada tenedor es un canal que contiene un único mensaje (token): recibir el token es tomar el tenedor y reenviarlo es soltarlo.',
      conceptos: [
        'Token de exclusión mutua: solo quien tiene el mensaje usa el recurso.',
        'get() bloquea si el vecino tiene el tenedor.',
        'Ruptura de simetría: el último filósofo pide primero el tenedor derecho, así no se puede cerrar el ciclo de espera (deadlock).',
        'Cada filósofo come 2 veces.',
      ],
      notas: [
        'Se eliminó filosofos2.c: tenía extensión .c pero era el mismo código Python.',
        'La primera línea de texto suelto se convirtió en comentario (rompía la sintaxis).',
      ],
      arranque: [
        'Crear 5 canales, uno por tenedor',
        'Enviar un token a cada canal (todos los tenedores libres)',
        'Lanzar los 5 filósofos con sus canales izquierdo/derecho (el último invertido)',
        'Esperar con join() a que todos coman 2 veces',
      ],
      async run(rt) {
        const { Canal, sleep, uniform, print, spawn, join, paso } = rt;

        async function filosofo(id_filosofo, canal_izquierdo, canal_derecho) {
          const yo = `Filósofo ${id_filosofo}`;
          for (let vez = 0; vez < 2; vez++) {
            print(`${yo} está pensando...`, yo);
            await sleep(uniform(0.5, 1.5));
            print(`${yo} tiene hambre. Esperando tenedores...`, yo);

            await canal_izquierdo.get(); // RECEIVE: toma el token (bloquea si otro lo tiene)
            print(`${yo} recibió tenedor izquierdo.`, yo);
            await canal_derecho.get();
            print(`${yo} recibió tenedor derecho.`, yo);

            print(`--- ${yo} ESTÁ COMIENDO ---`, yo); // sección crítica
            await sleep(uniform(1.0, 2.0));

            canal_izquierdo.put('TOKEN_TENEDOR'); // SEND: devuelve los tokens
            canal_derecho.put('TOKEN_TENEDOR');
            print(`${yo} terminó de comer y soltó los tenedores.`, yo);
          }
        }

        const num_filosofos = 5;
        paso(0); const canales_tenedores = Array.from({ length: num_filosofos }, (_, i) => new Canal(`tenedor_${i}`));
        paso(1); for (const canal of canales_tenedores) canal.put('TOKEN_TENEDOR');
        paso(2); const procesos = [];
        for (let i = 0; i < num_filosofos; i++) {
          let izq = canales_tenedores[i];
          let der = canales_tenedores[(i + 1) % num_filosofos];
          if (i === num_filosofos - 1) [izq, der] = [der, izq]; // ruptura de simetría
          procesos.push(spawn(filosofo, i, izq, der));
        }
        paso(3); await join(procesos);
      },
    },

    {
      id: 'barbero',
      titulo: 'Barbero dormilón',
      tipo: 'mensajes',
      lenguaje: 'Python · multiprocessing',
      archivo: 'mensajes_barbero_dormilon.py',
      resumen: 'Un barbero atiende clientes de uno en uno y la sala de espera tiene 3 sillas. La sala es un canal con capacidad 3: si está llena, el cliente se va. Cada cliente tiene un buzón propio por el que el barbero le avisa que terminó.',
      conceptos: [
        'Canal acotado: Queue(maxsize=3) = 3 sillas.',
        'put_nowait(): send sin esperar; lanza queue.Full si no hay silla.',
        'El barbero “duerme” bloqueado en get() cuando no hay clientes.',
        'Buzón de respuesta por cliente (patrón petición/respuesta).',
        'Poison pill "FIN" para cerrar la barbería.',
      ],
      notas: [
        'Primera línea de texto suelto → comentario.',
        'Error corregido: el cliente metía un multiprocessing.Queue dentro de otra Queue. Eso lanza RuntimeError al serializar y el programa se colgaba. Ahora main crea los buzones con multiprocessing.Manager().Queue() (proxies que sí viajan dentro de una cola) y guarda la referencia para que el Manager no los borre.',
      ],
      arranque: [
        'Crear la sala de espera Queue(maxsize=3) y el Manager para los buzones',
        'Arrancar el proceso barbero (se duerme esperando)',
        'Lanzar 8 clientes con su buzón, cada 0.1–0.3 s',
        'Esperar con join() a que todos los clientes terminen',
        'Enviar "FIN" al barbero y esperar a que cierre',
      ],
      async run(rt) {
        const { Canal, sleep, uniform, print, spawn, join, paso } = rt;

        async function barbero(sillas_espera) {
          print('[Barbero] No hay clientes. Me voy a dormir...', 'Barbero');
          while (true) {
            const mensaje = await sillas_espera.get(); // RECEIVE: si no hay nadie, "duerme" aquí
            if (mensaje === 'FIN') {
              print('[Barbero] Fin de la jornada. Cerrando la barbería.', 'Barbero');
              break;
            }
            const [id_cliente, buzon_cliente] = mensaje;
            print(`[Barbero] (Despierto/Ocupado) Cortando el pelo al Cliente ${id_cliente}...`, 'Barbero');
            await sleep(uniform(0.5, 1.0));
            print(`[Barbero] Terminé con el Cliente ${id_cliente}.`, 'Barbero');
            buzon_cliente.put('LISTO'); // SEND: avisa al cliente
          }
        }

        async function cliente(id_cliente, sillas_espera, buzon_personal) {
          const yo = `Cliente ${id_cliente}`;
          print(`[${yo}] Llegando a la barbería...`, yo);
          try {
            sillas_espera.putNowait([id_cliente, buzon_personal]); // SEND sin esperar: falla si no hay silla
            print(`[${yo}] Encontré lugar. Me senté a esperar.`, yo);
            await buzon_personal.get(); // RECEIVE: espera el "LISTO"
            print(`[${yo}] Corte terminado. Me voy contento.`, yo);
          } catch (e) {
            if (e.message !== 'queue.Full') throw e;
            print(`[${yo}] La sala está llena. Me voy a otro lado.`, yo);
          }
        }

        paso(0); const sillas_espera = new Canal('sillas_espera', 3);
        paso(1); const p_barbero = spawn(barbero, sillas_espera);
        paso(2); const clientes = [];
        for (let i = 1; i <= 8; i++) {
          clientes.push(spawn(cliente, i, sillas_espera, new Canal(`buzon_cliente_${i}`)));
          await sleep(uniform(0.1, 0.3));
        }
        paso(3); await join(clientes);
        paso(4); sillas_espera.put('FIN');
        await join(p_barbero);
      },
    },

    {
      id: 'canibales',
      titulo: 'Caníbales y personas en la canoa',
      tipo: 'mensajes',
      lenguaje: 'Python · multiprocessing',
      archivo: 'mensajes_canibales_canoa.py',
      resumen: 'Tres personas y tres caníbales cruzan el río en una canoa de 2 plazas. Un proceso barquero recibe las solicitudes y solo autoriza grupos seguros (1 y 1, 2 personas o 2 caníbales) enviando "SUBE" al buzón de cada pasajero.',
      conceptos: [
        'Coordinador central: toda la lógica vive en un único proceso, sin memoria compartida.',
        'Cada pasajero hace send(solicitud) y luego receive(autorización).',
        'El barquero empareja según quién está esperando en ese momento.',
        'Cada viaje tarda 0.5 s.',
      ],
      notas: [
        'Primera línea de texto suelto → comentario.',
        'Mismo error de Queue dentro de Queue: ahora los buzones son Manager().Queue().',
        'main ahora espera también a los pasajeros (antes podía terminar con procesos vivos).',
      ],
      arranque: [
        'Crear el buzón central de la barca y el Manager',
        'Lanzar los 6 pasajeros, cada uno con su buzón personal',
        'Lanzar el barquero (coordinador)',
        'Esperar al barquero y a los pasajeros',
      ],
      async run(rt) {
        const { Canal, sleep, print, spawn, join, paso } = rt;

        async function pasajero(tipo, id_pas, buzon_barca, mi_buzon) {
          const yo = `${tipo} ${id_pas}`;
          print(`[${yo}] Esperando en la orilla para subir...`, yo);
          buzon_barca.put([tipo, id_pas, mi_buzon]); // SEND: pide lugar
          await mi_buzon.get(); // RECEIVE: espera autorización
          print(` [${yo}] cruzando el río en la barca...`, yo);
        }

        async function barquero(buzon_barca, total_pasajeros) {
          const cola_personas = [], cola_canibales = [];
          let cruzaron = 0;
          while (cruzaron < total_pasajeros) {
            const [tipo, , buzon_personal] = await buzon_barca.get(); // RECEIVE
            (tipo === 'PERSONA' ? cola_personas : cola_canibales).push(buzon_personal);

            let pasajeros_viaje = [];
            if (cola_personas.length >= 1 && cola_canibales.length >= 1) {
              print(' Barquero decide: Viaja 1 Persona y 1 Caníbal (Empate, nadie come a nadie)', 'Barquero');
              pasajeros_viaje = [cola_personas.shift(), cola_canibales.shift()];
            } else if (cola_personas.length >= 2) {
              print(' Barquero decide: Viajan 2 Personas (Grupo seguro)', 'Barquero');
              pasajeros_viaje = [cola_personas.shift(), cola_personas.shift()];
            } else if (cola_canibales.length >= 2) {
              print(' Barquero decide: Viajan 2 Caníbales (Grupo seguro)', 'Barquero');
              pasajeros_viaje = [cola_canibales.shift(), cola_canibales.shift()];
            }
            if (pasajeros_viaje.length) {
              for (const buzon of pasajeros_viaje) buzon.put('SUBE'); // SEND: autorización
              cruzaron += 2;
              await sleep(0.5); // el viaje
            }
          }
        }

        paso(0); const buzon_central = new Canal('buzon_barca');
        const pasajeros = [['PERSONA', 1], ['CANIBAL', 1], ['PERSONA', 2], ['CANIBAL', 2], ['PERSONA', 3], ['CANIBAL', 3]];
        paso(1); const procesos = pasajeros.map(([tipo, id]) =>
          spawn(pasajero, tipo, id, buzon_central, new Canal(`buzon_${tipo}_${id}`)));
        paso(2); const coordinador = spawn(barquero, buzon_central, pasajeros.length);
        paso(3); await join(coordinador);
        await join(procesos);
      },
    },

    {
      id: 'puente-mensajes',
      titulo: 'Puente de un carril (mensajes)',
      tipo: 'mensajes',
      lenguaje: 'Python · multiprocessing',
      archivo: 'mensajes_puente_un_carril.py',
      resumen: 'Autos de ambos lados quieren cruzar un puente de un solo carril. Un coordinador recibe eventos LLEGADA y SALIDA, decide qué dirección tiene el paso y envía "GO" a máximo 2 autos a la vez.',
      conceptos: [
        'Todas las decisiones las toma el coordinador al recibir cada mensaje.',
        'Protocolo de 3 mensajes por auto: LLEGADA → GO → SALIDA.',
        'Si hay fila en ambos lados y el puente está vacío, elige al azar.',
        'Capacidad: 2 autos a la vez en el puente.',
      ],
      notas: [
        'Primera línea de texto suelto → comentario.',
        'Mismo error de Queue dentro de Queue: ahora los buzones son Manager().Queue().',
        'El mensaje SALIDA tenía los campos desordenados: ("SALIDA", direccion, None, None) → ("SALIDA", None, direccion, None).',
        'main ahora espera también a los autos.',
      ],
      arranque: [
        'Crear el buzón central del puente y el Manager',
        'Lanzar 6 autos (IZQ/DER) con su buzón personal',
        'Lanzar el coordinador del puente',
        'Esperar al coordinador y a los autos',
      ],
      async run(rt) {
        const { Canal, sleep, uniform, choice, print, spawn, join, paso } = rt;

        async function auto(id_auto, direccion, buzon_puente, mi_buzon) {
          const yo = `Auto ${id_auto}`;
          print(` ${yo} (${direccion}) llega y pide paso.`, yo);
          buzon_puente.put(['LLEGADA', id_auto, direccion, mi_buzon]); // 1. SEND: llegada
          await mi_buzon.get(); // 2. RECEIVE: espera el "GO"
          print(` ---> ${yo} (${direccion}) CRUZANDO...`, yo);
          await sleep(uniform(0.1, 0.4));
          print(` ${yo} (${direccion}) SALIÓ del puente.`, yo);
          buzon_puente.put(['SALIDA', null, direccion, null]); // 3. SEND: salida
        }

        async function coordinador_puente(buzon_puente, total_autos) {
          let autos_en_puente = 0, direccion_actual = null, procesados = 0;
          const cola_izq = [], cola_der = [];
          while (procesados < total_autos) {
            const [evento, id_auto, direccion, buzon_auto] = await buzon_puente.get(); // RECEIVE
            if (evento === 'SALIDA') {
              autos_en_puente--;
              procesados++;
              if (autos_en_puente === 0) direccion_actual = null; // puente vacío
            } else if (evento === 'LLEGADA') {
              (direccion === 'IZQ' ? cola_izq : cola_der).push([id_auto, buzon_auto]);
            }
            // Si el puente está vacío y hay fila, elegimos quién pasa
            if (direccion_actual === null) {
              if (cola_izq.length && !cola_der.length) direccion_actual = 'IZQ';
              else if (cola_der.length && !cola_izq.length) direccion_actual = 'DER';
              else if (cola_izq.length && cola_der.length) direccion_actual = choice(['IZQ', 'DER']);
            }
            // Despachar autos (máximo 2 a la vez)
            const cola = direccion_actual === 'IZQ' ? cola_izq : direccion_actual === 'DER' ? cola_der : [];
            while (cola.length && autos_en_puente < 2) {
              const [, buzon] = cola.shift();
              buzon.put('GO'); // SEND: autorizar paso
              autos_en_puente++;
            }
          }
        }

        paso(0); const buzon_central = new Canal('buzon_puente');
        const autos = [[1, 'IZQ'], [2, 'DER'], [3, 'IZQ'], [4, 'IZQ'], [5, 'DER'], [6, 'DER']];
        paso(1); const procesos = autos.map(([id, dir]) => spawn(auto, id, dir, buzon_central, new Canal(`buzon_auto_${id}`)));
        paso(2); const coordinador = spawn(coordinador_puente, buzon_central, autos.length);
        paso(3); await join(coordinador);
        await join(procesos);
      },
    },

    {
      id: 'mpi-matrices',
      titulo: 'Multiplicación de matrices (MPI)',
      tipo: 'mensajes',
      lenguaje: 'Python · mpi4py + numpy',
      archivo: 'mensajes_mpi_matrices.py',
      resumen: 'C = A·B con matrices 5×5 repartidas entre P procesos. El rank 0 reparte bloques de filas de A (Scatterv), envía B completa a todos (Bcast), cada rank multiplica su parte y el rank 0 reúne el resultado (Gatherv).',
      conceptos: [
        'SPMD: todos los procesos ejecutan el mismo programa; el rank decide su papel.',
        'Scatterv reparte bloques de tamaño variable (5 filas no siempre se dividen exacto).',
        'Bcast: un mensaje del root a todos.',
        'Gatherv: todos envían su bloque al root.',
        'En la web, cada rank es un proceso con su propio buzón.',
      ],
      notas: [
        'Antes se llamaba proyecto.py.',
        'Se ejecuta con: mpiexec -n 3 python mensajes_mpi_matrices.py (requiere mpi4py y numpy).',
      ],
      opciones: { procesos: { etiqueta: 'Procesos (-n)', valores: [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], defecto: 2 } },
      arranque: [
        'mpiexec lanza P copias del programa (ranks 0..P-1)',
        'Calcular cuántas filas le tocan a cada rank',
        'Rank 0 crea A[i][j] = i+j+1 y B (2 en la diagonal, 1 fuera)',
        'Scatterv: rank 0 envía a cada rank su bloque de filas de A',
        'Bcast: rank 0 envía B completa a todos',
        'Cada rank calcula local_C = local_A · B',
        'Gatherv: todos envían su bloque al rank 0',
        'Rank 0 imprime C',
      ],
      async run(rt, opts) {
        const { Canal, print, traza, spawn, join, paso } = rt;
        const N = 5, size = opts.procesos;
        const buzones = Array.from({ length: size }, (_, r) => new Canal(`rank ${r}`)); // un buzón por proceso

        async function main(rank) {
          const yo = `Rank ${rank}`;
          if (rank === 0) paso(1);
          const base = Math.floor(N / size), rem = N % size;
          const row_counts = Array.from({ length: size }, (_, r) => base + (r < rem ? 1 : 0));
          const displs = row_counts.map((_, r) => row_counts.slice(0, r).reduce((a, b) => a + b, 0)); // en filas

          let A = null, B = null, C = null;
          if (rank === 0) {
            paso(2);
            A = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => i + j + 1));
            B = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 2 : 1)));
          }

          // 1. Scatterv
          if (rank === 0) {
            paso(3);
            for (let r = 0; r < size; r++) buzones[r].put(A.slice(displs[r], displs[r] + row_counts[r]));
          }
          const local_A = await buzones[rank].get();

          // 2. Bcast
          if (rank === 0) {
            paso(4);
            for (let r = 0; r < size; r++) buzones[r].put(B);
          }
          B = await buzones[rank].get();

          // 3. Cómputo local
          if (rank === 0) paso(5);
          const local_C = local_A.map((fila) => B[0].map((_, j) => fila.reduce((s, a, k) => s + a * B[k][j], 0)));
          traza(`[${yo}] calculó ${local_C.length} fila(s) de C`, yo);

          // 4. Gatherv
          if (rank === 0) paso(6);
          buzones[0].put([rank, local_C]);
          if (rank === 0) {
            C = new Array(N);
            for (let k = 0; k < size; k++) {
              const [r, bloque] = await buzones[0].get();
              bloque.forEach((fila, i) => { C[displs[r] + i] = fila; });
            }
            paso(7);
            print(`Matriz resultante C (${N}x${N}) con ${size} procesos:`, yo);
            const f = (x) => x.toFixed(1).padStart(6);
            C.forEach((fila, i) => print(`${i === 0 ? '[[' : ' ['}${fila.map(f).join(' ')}]${i === N - 1 ? ']' : ''}`, yo));
          }
        }

        paso(0);
        await join(Array.from({ length: size }, (_, rank) => spawn(main, rank)));
      },
    },

    {
      id: 'puente-monitor',
      titulo: 'Puente de un carril (monitor)',
      tipo: 'monitor',
      lenguaje: 'Java · hilos + ReentrantLock',
      archivo: 'monitor_PuenteUnCarril.java',
      resumen: 'El mismo problema del puente pero con hilos Java que comparten memoria. El objeto puente es un monitor: un ReentrantLock protege el estado y una Condition hace esperar a los autos. Tras 5 autos seguidos en una dirección, cede el paso si hay espera del otro lado (evita inanición).',
      conceptos: [
        'Memoria compartida: los 10 hilos leen y escriben los mismos contadores.',
        'Exclusión mutua con lock() / unlock().',
        'condicion.await() suelta el cerrojo y duerme; signalAll() despierta a todos para que re-evalúen.',
        'while (no puedo pasar) await(): siempre se vuelve a comprobar al despertar.',
        'Límite de 5 cruces consecutivos contra la inanición.',
      ],
      notas: [
        'Tenía extensión .c pero es Java: renombrado a .java.',
        'La clase pública Main se renombró a monitor_PuenteUnCarril para que coincida con el archivo.',
        'En JavaScript hay un solo hilo, así que el cerrojo es implícito: el estado solo cambia entre dos await.',
        'Compilar y ejecutar: javac monitor_PuenteUnCarril.java && java monitor_PuenteUnCarril',
      ],
      arranque: [
        'Crear el monitor PuenteUnSoloCarril',
        'Imprimir el inicio de la simulación',
        'Crear y arrancar 10 hilos Auto con dirección aleatoria',
        'Esperar con join() a todos los hilos',
        'Anunciar que todos cruzaron',
      ],
      async run(rt) {
        const { Condicion, sleep, randint, random, print, spawn, join, paso } = rt;

        class PuenteUnSoloCarril {
          constructor() {
            // lock implícito (un solo hilo en JS); la Condition sí hace falta
            this.condicionPuente = new Condicion();
            this.direccionActual = null; // "NORTE", "SUR" o null
            this.autosEnPuente = 0;
            this.autosEsperandoNorte = 0;
            this.autosEsperandoSur = 0;
            this.LIMITE_CONSECUTIVOS = 5; // regla contra la inanición
            this.consecutivosCruzados = 0;
          }

          async entrarPuente(direccion, idAuto) {
            if (direccion === 'NORTE') this.autosEsperandoNorte++; else this.autosEsperandoSur++;

            // Espera si va gente en sentido contrario, o si ya pasaron 5 seguidos y hay espera enfrente
            while ((this.direccionActual !== null && this.direccionActual !== direccion) ||
                   (this.direccionActual === direccion &&
                    this.consecutivosCruzados >= this.LIMITE_CONSECUTIVOS && this.hayEsperaOpuesta(direccion))) {
              await this.condicionPuente.await();
            }

            if (direccion === 'NORTE') this.autosEsperandoNorte--; else this.autosEsperandoSur--;
            if (this.direccionActual === null) {
              this.direccionActual = direccion;
              this.consecutivosCruzados = 0;
            }
            this.autosEnPuente++;
            this.consecutivosCruzados++;
            print(`🚗 [ENTRA] Auto #${idAuto} hacia el ${direccion} al puente. Autos dentro: ${this.autosEnPuente}`, `Auto #${idAuto}`);
          }

          salirPuente(direccion, idAuto) {
            this.autosEnPuente--;
            print(`🟢 [SALE]  Auto #${idAuto} hacia el ${direccion} salió del puente. Autos dentro: ${this.autosEnPuente}`, `Auto #${idAuto}`);
            if (this.autosEnPuente === 0) {
              if (direccion === 'NORTE' && this.autosEsperandoSur > 0) {
                this.direccionActual = 'SUR';
                this.consecutivosCruzados = 0;
              } else if (direccion === 'SUR' && this.autosEsperandoNorte > 0) {
                this.direccionActual = 'NORTE';
                this.consecutivosCruzados = 0;
              } else {
                this.direccionActual = null;
              }
              this.condicionPuente.signalAll(); // que todos re-evalúen
            }
          }

          hayEsperaOpuesta(direccion) {
            return direccion === 'NORTE' ? this.autosEsperandoSur > 0 : this.autosEsperandoNorte > 0;
          }
        }

        async function auto(id, direccion, puente) { // run() del hilo
          await sleep(randint(1500) / 1000); // viaje hasta el puente
          print(`⏱️ [LLEGADA] Auto #${id} llegó esperando ir al ${direccion}`, `Auto #${id}`);
          await puente.entrarPuente(direccion, id);
          await sleep((randint(1000) + 1000) / 1000); // cruzar
          puente.salirPuente(direccion, id);
        }

        paso(0); const puente = new PuenteUnSoloCarril();
        paso(1); print('🚀 Iniciando simulación del puente...', 'main');
        paso(2); const hilos = [];
        for (let i = 0; i < 10; i++) {
          const direccion = random() < 0.5 ? 'NORTE' : 'SUR';
          hilos.push(spawn(auto, i + 1, direccion, puente));
        }
        paso(3); await join(hilos);
        paso(4); print('🏁 Todos los autos han cruzado a salvo.', 'main');
      },
    },

    {
      id: 'misioneros',
      titulo: 'Misioneros y caníbales (BFS)',
      tipo: 'secuencial',
      lenguaje: 'Java',
      archivo: (o) => (o.formato === 'tabla' ? 'secuencial_MisionerosTabla.java' : 'secuencial_MisionerosNotacion.java'),
      resumen: 'Tres misioneros y tres caníbales cruzan con un bote de 2 plazas sin que en ninguna orilla haya más caníbales que misioneros. No es concurrente: es una búsqueda en anchura (BFS) sobre los estados que encuentra la solución más corta, de 11 viajes.',
      conceptos: [
        'Estado = (misioneros izq, caníbales izq, lado del bote); el padre permite reconstruir el camino.',
        'Movimientos posibles: 1M, 2M, 1C, 2C o 1M+1C.',
        'Un estado es válido si en ninguna orilla los misioneros quedan en minoría.',
        'BFS con conjunto de visitados garantiza el camino mínimo.',
      ],
      notas: [
        'Los dos archivos tenían extensión .c pero eran Java con la misma clase: ahora son secuencial_MisionerosTabla.java y secuencial_MisionerosNotacion.java.',
        'Mismo algoritmo; solo cambia el formato de salida (elígelo en “Formato”).',
        'En JS, equals/hashCode se sustituyen por una clave de texto en un Set.',
      ],
      opciones: { formato: { etiqueta: 'Formato', valores: [['tabla', 'Tabla'], ['notacion', 'Notación F[ ] / D[ ]']], defecto: 0 } },
      arranque: [
        'Crear el estado inicial (3M, 3C, bote a la izquierda) y la cola BFS',
        'Explorar estados en anchura hasta llegar al objetivo',
        'Reconstruir el camino y mostrar la solución',
      ],
      async run(rt, opts) {
        const { print, traza, paso } = rt;

        class Estado {
          constructor(m, c, b, padre) {
            this.misionerosIzq = m;
            this.canibalesIzq = c;
            this.bote = b; // 1 = orilla izquierda, 0 = derecha
            this.padre = padre;
          }
          esValido() {
            const m = this.misionerosIzq, c = this.canibalesIzq;
            if (m < 0 || c < 0 || m > 3 || c > 3) return false;
            if (m > 0 && m < c) return false; // orilla izquierda
            if (3 - m > 0 && 3 - m < 3 - c) return false; // orilla derecha
            return true;
          }
          esObjetivo() { return this.misionerosIzq === 0 && this.canibalesIzq === 0 && this.bote === 0; }
          clave() { return `${this.misionerosIzq},${this.canibalesIzq},${this.bote}`; } // sustituye equals/hashCode
        }

        function resolver() {
          paso(0);
          const inicial = new Estado(3, 3, 1, null);
          const cola = [inicial];
          const visitados = new Set([inicial.clave()]);
          const movimientos = [[1, 0], [2, 0], [0, 1], [0, 2], [1, 1]]; // {misioneros, caníbales}

          paso(1);
          while (cola.length) {
            const actual = cola.shift();
            traza(`Explorando: ${actual.misionerosIzq}M ${actual.canibalesIzq}C a la izquierda, bote ${actual.bote ? 'izquierda' : 'derecha'}`, 'BFS');
            if (actual.esObjetivo()) {
              paso(2);
              imprimirSolucion(actual);
              return;
            }
            for (const [dm, dc] of movimientos) {
              const siguiente = actual.bote === 1
                ? new Estado(actual.misionerosIzq - dm, actual.canibalesIzq - dc, 0, actual)
                : new Estado(actual.misionerosIzq + dm, actual.canibalesIzq + dc, 1, actual);
              if (siguiente.esValido() && !visitados.has(siguiente.clave())) {
                cola.push(siguiente);
                visitados.add(siguiente.clave());
              }
            }
          }
          print('No se encontró solución.');
        }

        function imprimirSolucion(objetivo) {
          const camino = [];
          for (let e = objetivo; e; e = e.padre) camino.unshift(e);

          if (opts.formato === 'tabla') {
            print(`Solución encontrada (${camino.length - 1} pasos):\n`);
            print(`${'Orilla Izquierda'.padEnd(18)} ${'Bote'.padEnd(12)} ${'Orilla Derecha'.padEnd(18)}`);
            print('--------------------------------------------------');
            camino.forEach((e, i) => {
              const orillaIzq = `${e.misionerosIzq}M, ${e.canibalesIzq}C`;
              const orillaDer = `${3 - e.misionerosIzq}M, ${3 - e.canibalesIzq}C`;
              const posicionBote = e.bote === 1 ? '\\_/>        ' : '        <\\_/';
              if (i > 0) {
                const ant = camino[i - 1];
                print(`        Viajan: ${Math.abs(e.misionerosIzq - ant.misionerosIzq)}M y ${Math.abs(e.canibalesIzq - ant.canibalesIzq)}C`, 'Bote');
              }
              print(`${orillaIzq.padEnd(18)} ${posicionBote.padEnd(12)} ${orillaDer.padEnd(18)}`);
              print('');
            });
          } else {
            print('Lado A = F[Misioneros, Canibales, M_Movidos, C_Movidos]');
            print('Lado B = D[Misioneros, Canibales]');
            print('-------------------------------------------------------');
            camino.forEach((e, i) => {
              const ant = camino[i - 1];
              const mMov = ant ? Math.abs(e.misionerosIzq - ant.misionerosIzq) : 0;
              const cMov = ant ? Math.abs(e.canibalesIzq - ant.canibalesIzq) : 0;
              const direccionBote = i === 0 ? '   INICIO   ' : e.bote === 0 ? '   --->   ' : '   <---   ';
              print(`F[${e.misionerosIzq},${e.canibalesIzq},${mMov},${cMov}]${direccionBote}D[${3 - e.misionerosIzq},${3 - e.canibalesIzq}]`);
            });
          }
        }

        resolver();
      },
    },
  ];

  if (typeof module !== 'undefined') module.exports = EJERCICIOS;
  else window.EJERCICIOS = EJERCICIOS;
})();
