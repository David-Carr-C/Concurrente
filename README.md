# Programación concurrente · Ejercicios

Web: abre `index.html` desde GitHub Pages (o en local con `python -m http.server` y entra a http://localhost:8000).
Cada ejercicio se ejecuta en el navegador (port a JavaScript) paso a paso, con el código original al lado.

| Archivo | Problema | Tipo |
|---|---|---|
| `mensajes_productor_consumidor.py` | Productor–consumidor | Paso de mensajes |
| `mensajes_filosofos.py` | Filósofos comensales | Paso de mensajes |
| `mensajes_barbero_dormilon.py` | Barbero dormilón | Paso de mensajes |
| `mensajes_canibales_canoa.py` | Caníbales y personas en la canoa | Paso de mensajes |
| `mensajes_puente_un_carril.py` | Puente de un carril | Paso de mensajes |
| `mensajes_mpi_matrices.py` | Multiplicación de matrices (MPI) | Paso de mensajes |
| `monitor_PuenteUnCarril.java` | Puente de un carril | Memoria compartida (monitor) |
| `secuencial_MisionerosTabla.java` / `secuencial_MisionerosNotacion.java` | Misioneros y caníbales (BFS) | Secuencial |

## Ejecutar los originales

```sh
py mensajes_barbero_dormilon.py                  # cualquiera de los mensajes_*.py
mpiexec -n 3 py mensajes_mpi_matrices.py         # requiere mpi4py y numpy
javac monitor_PuenteUnCarril.java && java monitor_PuenteUnCarril
```

## Probar la web

`node test.js` corre todos los ports a JavaScript con 30 semillas y compara salidas.

## Publicar en GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
