import java.util.*;

public class secuencial_MisionerosTabla {

    // Clase interna para representar cada estado en el que se encuentra el río
    static class Estado {
        int misionerosIzq;
        int canibalesIzq;
        int bote; // 1 si está en la orilla izquierda, 0 si está en la orilla derecha
        Estado padre; // Para rastrear el camino de la solución

        public Estado(int m, int c, int b, Estado padre) {
            this.misionerosIzq = m;
            this.canibalesIzq = c;
            this.bote = b;
            this.padre = padre;
        }

        // Verifica si el estado cumple las reglas (nadie es comido)
        public boolean esValido() {
            // No podemos tener números negativos ni mayores a 3
            if (misionerosIzq < 0 || canibalesIzq < 0 || misionerosIzq > 3 || canibalesIzq > 3) {
                return false;
            }
            
            int misionerosDer = 3 - misionerosIzq;
            int canibalesDer = 3 - canibalesIzq;

            // Regla principal: si hay misioneros en una orilla, no pueden ser superados en número por los caníbales
            if (misionerosIzq > 0 && misionerosIzq < canibalesIzq) return false;
            if (misionerosDer > 0 && misionerosDer < canibalesDer) return false;

            return true;
        }

        // Verifica si hemos alcanzado el objetivo (todos en la orilla derecha)
        public boolean esObjetivo() {
            return misionerosIzq == 0 && canibalesIzq == 0 && bote == 0;
        }

        // Métodos equals y hashCode necesarios para usar HashSet y no repetir estados
        @Override
        public boolean equals(Object obj) {
            if (!(obj instanceof Estado)) return false;
            Estado otro = (Estado) obj;
            return this.misionerosIzq == otro.misionerosIzq &&
                   this.canibalesIzq == otro.canibalesIzq &&
                   this.bote == otro.bote;
        }

        @Override
        public int hashCode() {
            return Objects.hash(misionerosIzq, canibalesIzq, bote);
        }
    }

    public static void resolver() {
        // Estado inicial: 3 Misioneros, 3 Caníbales y 1 Bote en la orilla Izquierda
        Estado inicial = new Estado(3, 3, 1, null);
        Queue<Estado> cola = new LinkedList<>();
        Set<Estado> visitados = new HashSet<>();

        cola.add(inicial);
        visitados.add(inicial);

        // Movimientos posibles en el bote: {Misioneros, Caníbales}
        int[][] movimientos = {
            {1, 0}, {2, 0}, // Solo misioneros
            {0, 1}, {0, 2}, // Solo caníbales
            {1, 1}          // Uno y uno
        };

        while (!cola.isEmpty()) {
            Estado actual = cola.poll();

            if (actual.esObjetivo()) {
                imprimirSolucion(actual);
                return;
            }

            // Generar todos los estados posibles a partir del actual
            for (int[] mov : movimientos) {
                int nuevoM, nuevoC, nuevoB;

                if (actual.bote == 1) { // El bote viaja de Izquierda a Derecha
                    nuevoM = actual.misionerosIzq - mov[0];
                    nuevoC = actual.canibalesIzq - mov[1];
                    nuevoB = 0;
                } else { // El bote viaja de Derecha a Izquierda
                    nuevoM = actual.misionerosIzq + mov[0];
                    nuevoC = actual.canibalesIzq + mov[1];
                    nuevoB = 1;
                }

                Estado siguiente = new Estado(nuevoM, nuevoC, nuevoB, actual);

                if (siguiente.esValido() && !visitados.contains(siguiente)) {
                    cola.add(siguiente);
                    visitados.add(siguiente);
                }
            }
        }
        System.out.println("No se encontró solución.");
    }

    private static void imprimirSolucion(Estado objetivo) {
        List<Estado> camino = new ArrayList<>();
        Estado actual = objetivo;
        
        while (actual != null) {
            camino.add(actual);
            actual = actual.padre;
        }
        
        // Revertir para imprimir desde el inicio al fin
        Collections.reverse(camino);

        System.out.println("Solución encontrada (" + (camino.size() - 1) + " pasos):\n");
        System.out.printf("%-18s %-12s %-18s\n", "Orilla Izquierda", "Bote", "Orilla Derecha");
        System.out.println("--------------------------------------------------");

        for (int i = 0; i < camino.size(); i++) {
            Estado e = camino.get(i);
            int mDer = 3 - e.misionerosIzq;
            int cDer = 3 - e.canibalesIzq;
            
            String orillaIzq = e.misionerosIzq + "M, " + e.canibalesIzq + "C";
            String orillaDer = mDer + "M, " + cDer + "C";
            String posicionBote = (e.bote == 1) ? "\\_/>        " : "        <\\_/";

            if(i > 0) {
                Estado anterior = camino.get(i-1);
                int diffM = Math.abs(e.misionerosIzq - anterior.misionerosIzq);
                int diffC = Math.abs(e.canibalesIzq - anterior.canibalesIzq);
                System.out.println("        Viajan: " + diffM + "M y " + diffC + "C");
            }

            System.out.printf("%-18s %-12s %-18s\n", orillaIzq, posicionBote, orillaDer);
            System.out.println();
        }
    }

    public static void main(String[] args) {
        resolver();
    }
}