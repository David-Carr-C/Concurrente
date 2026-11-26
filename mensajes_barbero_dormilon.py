# Barbero dormilon con paso de mensajes


import multiprocessing
import time
import random
import queue # Necesario para manejar la excepción de "Cola llena"

def barbero(sillas_espera):
    print("[Barbero] No hay clientes. Me voy a dormir...")
    
    while True:
        # RECEIVE: El barbero intenta sacar a un cliente de la sala de espera.
        # Si la cola está vacía, se bloquea indefinidamente (se queda "durmiendo").
        mensaje = sillas_espera.get() 
        
        if mensaje == "FIN":
            print("[Barbero] Fin de la jornada. Cerrando la barbería.")
            break
            
        id_cliente, buzon_cliente = mensaje
        
        print(f"[Barbero] (Despierto/Ocupado) Cortando el pelo al Cliente {id_cliente}...")
        time.sleep(random.uniform(0.5, 1.0)) # Simulamos el tiempo del corte de pelo
        
        print(f"[Barbero] Terminé con el Cliente {id_cliente}.")
        
        # SEND: Le avisa al cliente que ya terminó para que se pueda ir
        buzon_cliente.put("LISTO")

def cliente(id_cliente, sillas_espera, buzon_personal):
    print(f"[Cliente {id_cliente}] Llegando a la barbería...")
    
    # Cada cliente tiene su propio buzón (creado por main con un Manager, porque una
    # multiprocessing.Queue normal no se puede enviar dentro de otra Queue)
    
    try:
        # SEND: El cliente intenta entrar a la sala de espera (enviar su mensaje a la cola).
        # put_nowait() intenta enviar el mensaje al instante. Si la cola (sala) está 
        # llena a su capacidad máxima, lanza inmediatamente un error "queue.Full".
        sillas_espera.put_nowait((id_cliente, buzon_personal))
        print(f"[Cliente {id_cliente}] Encontré lugar. Me senté a esperar.")
        
        # RECEIVE: El cliente espera en su silla hasta que el barbero le manda "LISTO"
        buzon_personal.get()
        print(f"[Cliente {id_cliente}] Corte terminado. Me voy contento.")
        
    except queue.Full:
        # Si saltó el error, significa que maxsize se alcanzó.
        print(f"[Cliente {id_cliente}] La sala está llena. Me voy a otro lado.")

if __name__ == '__main__':
    # Creamos la sala de espera (Buzón central). 
    # El maxsize = 3 significa que solo hay 3 sillas para esperar.
    capacidad_sala = 3
    sillas_espera = multiprocessing.Queue(maxsize=capacidad_sala)
    manager = multiprocessing.Manager()

    # Iniciamos el proceso del Barbero
    p_barbero = multiprocessing.Process(target=barbero, args=(sillas_espera,))
    p_barbero.start()

    # Simulamos la llegada de 8 clientes a la barbería
    procesos_clientes = []
    # main guarda los buzones: si suelta el proxy tras start(), el Manager lo borra
    buzones = []
    for i in range(1, 9):
        buzones.append(manager.Queue())
        p = multiprocessing.Process(target=cliente, args=(i, sillas_espera, buzones[-1]))
        procesos_clientes.append(p)
        p.start()
        # Hacemos que los clientes lleguen en intervalos aleatorios rápidos 
        # para forzar que la sala de espera se llene
        time.sleep(random.uniform(0.1, 0.3)) 

    # Esperamos a que todos los clientes terminen (ya sea que se cortaron el pelo o se fueron)
    for p in procesos_clientes:
        p.join()

    # Enviamos el mensaje de FIN (Poison pill) para que el barbero se vaya a casa
    sillas_espera.put("FIN")
    p_barbero.join()