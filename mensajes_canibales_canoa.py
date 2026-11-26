# Canibales y canoa con paso de mensajes 

import multiprocessing
import time
import random

def pasajero(tipo, id_pas, buzon_barca, mi_buzon):
    print(f"[{tipo} {id_pas}] Esperando en la orilla para subir...")
    # SEND: Solicitar un lugar en la barca
    buzon_barca.put((tipo, id_pas, mi_buzon))
    
    # RECEIVE: Esperar a que el barquero arme un grupo seguro
    mi_buzon.get()
    
    print(f" [{tipo} {id_pas}] cruzando el río en la barca...")

def barquero(buzon_barca, total_pasajeros):
    cola_personas = []
    cola_canibales = []
    cruzaron = 0
    
    while cruzaron < total_pasajeros:
        # RECEIVE: Leer solicitudes a medida que llegan
        tipo, id_pas, buzon_personal = buzon_barca.get()
        
        if tipo == "PERSONA":
            cola_personas.append(buzon_personal)
        else:
            cola_canibales.append(buzon_personal)
            
        # --- Lógica de Emparejamiento ---
        # Evaluar si ya tenemos suficientes esperando para armar un viaje seguro
        viaje_listo = False
        pasajeros_viaje = []
        
        if len(cola_personas) >= 1 and len(cola_canibales) >= 1:
            print(" Barquero decide: Viaja 1 Persona y 1 Caníbal (Empate, nadie come a nadie)")
            pasajeros_viaje = [cola_personas.pop(0), cola_canibales.pop(0)]
            viaje_listo = True
        elif len(cola_personas) >= 2:
            print(" Barquero decide: Viajan 2 Personas (Grupo seguro)")
            pasajeros_viaje = [cola_personas.pop(0), cola_personas.pop(0)]
            viaje_listo = True
        elif len(cola_canibales) >= 2:
            print(" Barquero decide: Viajan 2 Caníbales (Grupo seguro)")
            pasajeros_viaje = [cola_canibales.pop(0), cola_canibales.pop(0)]
            viaje_listo = True
            
        # Si se formó un grupo, les damos permiso para cruzar
        if viaje_listo:
            for buzon_pasajero in pasajeros_viaje:
                buzon_pasajero.put("SUBE") # SEND: Autorización
            cruzaron += 2
            time.sleep(0.5) # Simula el tiempo del viaje

if __name__ == '__main__':
    buzon_central = multiprocessing.Queue()
    # Manager: sus colas (proxies) sí pueden viajar dentro de otra cola
    manager = multiprocessing.Manager()
    # 3 Personas y 3 Caníbales
    pasajeros = [
        ("PERSONA", 1), ("CANIBAL", 1), ("PERSONA", 2), 
        ("CANIBAL", 2), ("PERSONA", 3), ("CANIBAL", 3)
    ]
    
    procesos = []
    # main guarda los buzones: si suelta el proxy tras start(), el Manager lo borra
    buzones = []
    for tipo, id_pas in pasajeros:
        buzon_personal = manager.Queue()
        buzones.append(buzon_personal)
        p = multiprocessing.Process(target=pasajero, args=(tipo, id_pas, buzon_central, buzon_personal))
        procesos.append(p)
        p.start()

    coordinador = multiprocessing.Process(target=barquero, args=(buzon_central, len(pasajeros)))
    coordinador.start()
    coordinador.join()
    for p in procesos:
        p.join()
