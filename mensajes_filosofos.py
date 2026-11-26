# Este es el de filosofos

import multiprocessing
import time
import random

def filosofo(id_filosofo, canal_izquierdo, canal_derecho):
    for _ in range(2): # Cada filósofo intentará comer 2 veces
        print(f"Filósofo {id_filosofo} está pensando...")
        time.sleep(random.uniform(0.5, 1.5))
        
        print(f"Filósofo {id_filosofo} tiene hambre. Esperando tenedores...")
        
        # Operación RECEIVE: Toma los tokens (se bloquea si alguien más lo tiene)
        canal_izquierdo.get() 
        print(f"Filósofo {id_filosofo} recibió tenedor izquierdo.")
        
        canal_derecho.get()
        print(f"Filósofo {id_filosofo} recibió tenedor derecho.")
        
        # Sección Crítica (Comiendo)
        print(f"--- Filósofo {id_filosofo} ESTÁ COMIENDO ---")
        time.sleep(random.uniform(1.0, 2.0))
        
        # Operación SEND: Devuelve los tokens a los canales para liberar los tenedores
        canal_izquierdo.put("TOKEN_TENEDOR")
        canal_derecho.put("TOKEN_TENEDOR")
        print(f"Filósofo {id_filosofo} terminó de comer y soltó los tenedores.")

if __name__ == '__main__':
    num_filosofos = 5
    
    # Cada tenedor es un canal de mensajes
    canales_tenedores = [multiprocessing.Queue() for _ in range(num_filosofos)]
    
    # Inicialización: Enviamos un único mensaje ("token") a cada canal de tenedor
    for canal in canales_tenedores:
        canal.put("TOKEN_TENEDOR")
        
    procesos = []
    
    for i in range(num_filosofos):
        # Asignación de canales contiguos
        izq = canales_tenedores[i]
        der = canales_tenedores[(i + 1) % num_filosofos]
        
        # Ruptura de simetría para evitar interbloqueo (deadlock)
        # El último filósofo solicita primero el derecho y luego el izquierdo
        if i == num_filosofos - 1:
            izq, der = der, izq
            
        p = multiprocessing.Process(target=filosofo, args=(i, izq, der))
        procesos.append(p)
        p.start()
        
    for p in procesos:
        p.join()