import multiprocessing
import time
import random

def productor(canal_mensajes):
    for i in range(5):
        mensaje = f"Paquete_de_datos_{i}"
        print(f"[Productor] Enviando: {mensaje}")
        # Operación SEND: Enviamos el mensaje al canal
        canal_mensajes.put(mensaje) 
        time.sleep(random.uniform(0.5, 1.0))
    
    # Enviamos un mensaje de control para indicar que terminamos
    canal_mensajes.put("FIN_DE_TRANSMISION")
    print("[Productor] Finalizó su trabajo.")

def consumidor(canal_mensajes):
    while True:
        # Operación RECEIVE: Esperamos y recibimos un mensaje del canal
        mensaje_recibido = canal_mensajes.get() 
        
        if mensaje_recibido == "FIN_DE_TRANSMISION":
            print("[Consumidor] Mensaje de fin recibido. Terminando.")
            break
            
        print(f"[Consumidor] Recibió y procesó: {mensaje_recibido}")
        time.sleep(random.uniform(1.0, 1.5))

if __name__ == '__main__':
    # Este es el canal por donde pasarán los mensajes
    canal = multiprocessing.Queue()
    
    # Creamos procesos independientes (no comparten memoria)
    p = multiprocessing.Process(target=productor, args=(canal,))
    c = multiprocessing.Process(target=consumidor, args=(canal,))
    
    p.start()
    c.start()
    
    p.join()
    c.join()