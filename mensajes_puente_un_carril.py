# Puente un carril con paso de mensajes

import multiprocessing
import time
import random

def auto(id_auto, direccion, buzon_puente, mi_buzon):
    print(f" Auto {id_auto} ({direccion}) llega y pide paso.")
    # 1. SEND: Enviar solicitud de llegada al puente
    buzon_puente.put(("LLEGADA", id_auto, direccion, mi_buzon))
    
    # 2. RECEIVE: Esperar la confirmación del puente para avanzar
    mi_buzon.get()
    
    print(f" ---> Auto {id_auto} ({direccion}) CRUZANDO...")
    time.sleep(random.uniform(0.1, 0.4))
    
    print(f" Auto {id_auto} ({direccion}) SALIÓ del puente.")
    # 3. SEND: Avisar al puente que ya salimos para liberar espacio
    buzon_puente.put(("SALIDA", None, direccion, None))

def coordinador_puente(buzon_puente, total_autos):
    autos_en_puente = 0
    direccion_actual = None
    cola_izq = []
    cola_der = []
    procesados = 0
    
    while procesados < total_autos:
        # RECEIVE: El coordinador escucha todos los eventos (llegadas y salidas)
        evento, id_auto, direccion, buzon_auto = buzon_puente.get()
        
        if evento == "SALIDA":
            autos_en_puente -= 1
            procesados += 1
            if autos_en_puente == 0:
                direccion_actual = None # Puente completamente vacío
        
        elif evento == "LLEGADA":
            if direccion == "IZQ": cola_izq.append((id_auto, buzon_auto))
            else: cola_der.append((id_auto, buzon_auto))

        # --- Lógica de control de tráfico ---
        # Si el puente está vacío y hay fila, elegimos quién pasa
        if direccion_actual is None:
            if cola_izq and not cola_der: direccion_actual = "IZQ"
            elif cola_der and not cola_izq: direccion_actual = "DER"
            elif cola_izq and cola_der:
                # Evitar inanición: alternar turnos al azar o forzar cambio
                direccion_actual = random.choice(["IZQ", "DER"])

        # Despachar autos si hay espacio (máximo 2 a la vez para no bloquear)
        if direccion_actual == "IZQ":
            while cola_izq and autos_en_puente < 2:
                id_a, buzon = cola_izq.pop(0)
                buzon.put("GO") # SEND: Autorizar paso
                autos_en_puente += 1
        elif direccion_actual == "DER":
            while cola_der and autos_en_puente < 2:
                id_a, buzon = cola_der.pop(0)
                buzon.put("GO") # SEND: Autorizar paso
                autos_en_puente += 1

if __name__ == '__main__':
    buzon_central = multiprocessing.Queue()
    # Manager: sus colas (proxies) sí pueden viajar dentro de otra cola
    manager = multiprocessing.Manager()
    autos = [
        (1, "IZQ"), (2, "DER"), (3, "IZQ"), (4, "IZQ"), (5, "DER"), (6, "DER")
    ]
    
    procesos = []
    # main guarda los buzones: si suelta el proxy tras start(), el Manager lo borra
    buzones = []
    for id_a, dir_a in autos:
        # Cada auto tiene su propio buzón para escuchar al coordinador
        buzon_personal = manager.Queue()
        buzones.append(buzon_personal)
        p = multiprocessing.Process(target=auto, args=(id_a, dir_a, buzon_central, buzon_personal))
        procesos.append(p)
        p.start()

    # Iniciar el coordinador
    coordinador = multiprocessing.Process(target=coordinador_puente, args=(buzon_central, len(autos)))
    coordinador.start()
    coordinador.join()
    for p in procesos:
        p.join()
