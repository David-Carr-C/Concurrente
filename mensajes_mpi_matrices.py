import numpy as np
from mpi4py import MPI

N = 5  # Funciona con cualquier N >= 1 y cualquier size >= 1


def main():
    comm = MPI.COMM_WORLD
    rank = comm.Get_rank()
    size = comm.Get_size()

    base = N // size
    rem = N % size

    # Filas asignadas a cada rango
    row_counts = np.array(
        [base + (1 if r < rem else 0) for r in range(size)],
        dtype=np.int32,
    )
    # Cantidad de elementos (filas * N columnas) y desplazamientos en el buffer plano
    elem_counts = (row_counts * N).astype(np.int32)
    displs = np.zeros(size, dtype=np.int32)
    if size > 1:
        displs[1:] = np.cumsum(elem_counts[:-1])

    my_rows = int(row_counts[rank])

    A = None
    B = np.empty((N, N), dtype=np.float64)
    C = None

    local_A = np.empty((my_rows, N), dtype=np.float64)
    local_C = np.empty((my_rows, N), dtype=np.float64)

    if rank == 0:
        A = np.empty((N, N), dtype=np.float64)
        C = np.empty((N, N), dtype=np.float64)

        for i in range(N):
            for j in range(N):
                A[i, j] = float(i + j + 1)
                B[i, j] = 2.0 if i == j else 1.0

    # 1. Repartir bloques variables de filas de A
    comm.Scatterv(
        [A, elem_counts, displs, MPI.DOUBLE],
        [local_A, my_rows * N, MPI.DOUBLE],
        root=0,
    )

    # 2. Enviar toda la matriz B a todos los procesos
    comm.Bcast([B, MPI.DOUBLE], root=0)

    # 3. Cómputo local (si my_rows == 0, local_A @ B produce arreglo (0, N) sin error)
    local_C[:] = local_A @ B

    # 4. Reunir bloques variables en C dentro del proceso maestro (rank 0)
    comm.Gatherv(
        [local_C, my_rows * N, MPI.DOUBLE],
        [C, elem_counts, displs, MPI.DOUBLE],
        root=0,
    )

    if rank == 0:
        print(f"Matriz resultante C ({N}x{N}) con {size} procesos:")
        print(np.array2string(C, formatter={"float_kind": lambda x: f"{x:6.1f}"}))


if __name__ == "__main__":
    main()