import java.util.Random;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

class PuenteUnSoloCarril {
    private final Lock cerrojo = new ReentrantLock();
    private final Condition condicionPuente = cerrojo.newCondition();

    private String direccionActual = null; // Puede ser "NORTE", "SUR" o null
    private int autosEnPuente = 0;
    private int autosEsperandoNorte = 0;
    private int autosEsperandoSur = 0;
    
    private final int LIMITE_CONSECUTIVOS = 5; // Regla para evitar inanición
    private int consecutivosCruzados = 0;

    public void entrarPuente(String direccion, int idAuto) throws InterruptedException {
        cerrojo.lock();
        try {
            // Registrar que el auto está esperando en su respectiva fila
            if (direccion.equals("NORTE")) {
                autosEsperandoNorte++;
            } else {
                autosEsperandoSur++;
            }

            // Condición de espera obligatoria:
            // 1. El puente está ocupado por autos que van en dirección contraria.
            // O bien, 2. Ya pasaron muchos autos seguidos en esta dirección y hay autos esperando del otro lado.
            while ((direccionActual != null && !direccionActual.equals(direccion)) ||
                   (direccionActual != null && direccionActual.equals(direccion) && 
                    consecutivosCruzados >= LIMITE_CONSECUTIVOS && hayEsperaOpuesta(direccion))) {
                condicionPuente.await();
            }

            // El auto obtiene el derecho de paso; sale de la fila de espera
            if (direccion.equals("NORTE")) {
                autosEsperandoNorte--;
            } else {
                autosEsperandoSur--;
            }

            // Si el puente estaba completamente vacío, se define la nueva dirección activa
            if (direccionActual == null) {
                direccionActual = direccion;
                consecutivosCruzados = 0;
            }

            autosEnPuente++;
            consecutivosCruzados++;
            System.out.println("🚗 [ENTRA] Auto #" + idAuto + " hacia el " + direccion + " al puente. Autos dentro: " + autosEnPuente);

        } finally {
            cerrojo.unlock();
        }
    }

    public void salirPuente(String direccion, int idAuto) {
        cerrojo.lock();
        try {
            autosEnPuente--;
            System.out.println("🟢 [SALE]  Auto #" + idAuto + " hacia el " + direccion + " salió del puente. Autos dentro: " + autosEnPuente);

            // Si el puente se queda vacío, evaluamos dar prioridad al lado opuesto si hay tráfico
            if (autosEnPuente == 0) {
                if (direccion.equals("NORTE") && autosEsperandoSur > 0) {
                    direccionActual = "SUR";
                    consecutivosCruzados = 0;
                } else if (direccion.equals("SUR") && autosEsperandoNorte > 0) {
                    direccionActual = "NORTE";
                    consecutivosCruzados = 0;
                } else {
                    // Si nadie espera en el extremo opuesto o no hay autos en ninguna fila, el puente queda libre
                    direccionActual = null;
                }
                
                // Despertar a todos los hilos en espera para que evalúen la nueva situación del puente
                condicionPuente.signalAll();
            }
        } finally {
            cerrojo.unlock();
        }
    }

    private boolean hayEsperaOpuesta(String direccion) {
        if (direccion.equals("NORTE")) {
            return autosEsperandoSur > 0;
        }
        return autosEsperandoNorte > 0;
    }
}

// Clase que representa el hilo de cada vehículo
class Auto implements Runnable {
    private final int id;
    private final String direccion;
    private final PuenteUnSoloCarril puente;
    private final Random random = new Random();

    public Auto(int id, String direccion, PuenteUnSoloCarril puente) {
        this.id = id;
        this.direccion = direccion;
        this.puente = puente;
    }

    @Override
    public void run() {
        try {
            // Simula un tiempo de viaje aleatorio antes de llegar al puente
            Thread.sleep(random.nextInt(1500));
            System.out.println("⏱️ [LLEGADA] Auto #" + id + " llegó esperando ir al " + direccion);

            // Solicitar entrada al puente
            puente.entrarPuente(direccion, id);

            // Simula el tiempo que le toma cruzar el puente
            Thread.sleep(random.nextInt(1000) + 1000);

            // Notificar salida del puente
            puente.salirPuente(direccion, id);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

// Clase principal para ejecutar la simulación
public class monitor_PuenteUnCarril {
    public static void main(String[] args) {
        PuenteUnSoloCarril puente = new PuenteUnSoloCarril();
        Thread[] hilos = new Thread[10];
        Random random = new Random();

        System.out.println("🚀 Iniciando simulación del puente...");

        // Crear y lanzar 10 hilos (autos) con direcciones aleatorias
        for (int i = 0; i < hilos.length; i++) {
            String direccion = random.nextBoolean() ? "NORTE" : "SUR";
            hilos[i] = new Thread(new Auto(i + 1, direccion, puente));
            hilos[i].start();
        }

        // Esperar a que todos los autos terminen de cruzar antes de cerrar el programa
        for (Thread hilo : hilos) {
            try {
                hilo.join();
            } catch (InterruptedException e) {
                System.out.println("Error esperando hilos.");
            }
        }

        System.out.println("🏁 Todos los autos han cruzado a salvo.");
    }
}