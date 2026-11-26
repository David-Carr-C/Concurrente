import java.util.*;

public class secuencial_MisionerosNotacion {

    static class Estado {
        int misionerosIzq;
        int canibalesIzq;
        int bote; 
        Estado padre; 

        public Estado(int m, int c, int b, Estado padre) {
            this.misionerosIzq = m;
            this.canibalesIzq = c;
            this.bote = b;
            this.padre = padre;
        }

        public boolean esValido() {
            if (misionerosIzq < 0 || canibalesIzq < 0 || misionerosIzq > 3 || canibalesIzq > 3) {
                return false;
            }
            
            int misionerosDer = 3 - misionerosIzq;
            int canibalesDer = 3 - canibalesIzq;

            if (misionerosIzq > 0 && misionerosIzq < canibalesIzq) return false;
            if (misionerosDer > 0 && misionerosDer < canibalesDer) return false;

            return true;
        }

        public boolean esObjetivo() {
            return misionerosIzq == 0 && canibalesIzq == 0 && bote == 0;
        }

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
        Estado inicial = new Estado(3, 3, 1, null);
        Queue<Estado> cola = new LinkedList<>();
        Set<Estado> visitados = new HashSet<>();

        cola.add(inicial);
        visitados.add(inicial);

        int[][] movimientos = {
            {1, 0}, {2, 0}, 
            {0, 1}, {0, 2}, 
            {1, 1}          
        };

        while (!cola.isEmpty()) {
            Estado actual = cola.poll();

            if (actual.esObjetivo()) {
                imprimirSolucion(actual);
                return;
            }

            for (int[] mov : movimientos) {
                int nuevoM, nuevoC, nuevoB;

                if (actual.bote == 1) { 
                    nuevoM = actual.misionerosIzq - mov[0];
                    nuevoC = actual.canibalesIzq - mov[1];
                    nuevoB = 0;
                } else { 
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
        
        Collections.reverse(camino);

        System.out.println("Lado A = F[Misioneros, Canibales, M_Movidos, C_Movidos]");
        System.out.println("Lado B = D[Misioneros, Canibales]");
        System.out.println("-------------------------------------------------------");

        for (int i = 0; i < camino.size(); i++) {
            Estado e = camino.get(i);
            int mDer = 3 - e.misionerosIzq;
            int cDer = 3 - e.canibalesIzq;
            
            int mMov = 0;
            int cMov = 0;
            
            if (i > 0) {
                Estado anterior = camino.get(i - 1);
                mMov = Math.abs(e.misionerosIzq - anterior.misionerosIzq);
                cMov = Math.abs(e.canibalesIzq - anterior.canibalesIzq);
            }

            // Formatear las salidas según lo solicitado
            String ladoA = String.format("F[%d,%d,%d,%d]", e.misionerosIzq, e.canibalesIzq, mMov, cMov);
            String ladoB = String.format("D[%d,%d]", mDer, cDer);
            
            // Flecha indicadora para saber hacia dónde se movió el bote
            String direccionBote = (i == 0) ? "   INICIO   " : ((e.bote == 0) ? "   --->   " : "   <---   ");

            System.out.println(ladoA + direccionBote + ladoB);
        }
    }

    public static void main(String[] args) {
        resolver();
    }
}