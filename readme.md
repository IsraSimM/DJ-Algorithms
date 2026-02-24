# DJ Simulador

Simulador visual de algoritmos de planificacion tipo CPU, usando canciones como procesos. Permite comparar politicas y ver metricas en tiempo real.

**Incluye**
- Cola de solicitudes, cancion en ejecucion y lista de completadas.
- Algoritmos: FCFS, SJF (con opcion preemptiva), Round Robin, Prioridades (preemptivo), Multilevel Queue.
- Control de quantum, velocidad de simulacion, interrupcion manual y limite de canciones.
- Historial tipo Gantt, metricas (espera, respuesta, turnaround, uso de CPU).
- Comparador rapido entre algoritmos.

**Como ejecutar**
- Abrir `party.html` en el navegador.
- Alternativa con servidor local:
  - `python -m http.server` en `DJS` y abrir `http://localhost:8000/party.html`.

**Como usar**
- Elegi el algoritmo en el selector superior.
- Ajusta `Quantum`, `Preemptivo` y `Velocidad` segun el caso.
- Usa `Agregar cancion` o `Aleatoria` para sumar procesos.
- `Iniciar`, `Pausar`, `Reset` controlan la simulacion.
- `Comparar` calcula metricas promedio para cada politica.

**Datos de canciones**
Las canciones iniciales se cargan desde `songs.json`. Campos:
- `id`: numero unico.
- `nombre`: nombre de la cancion.
- `duracion_total`: duracion en segundos.
- `duracion_restante`: se inicializa igual a `duracion_total`.
- `prioridad`: 1 a 5.
- `tiempo_llegada`: segundo en el que entra a la cola.

Ejemplo:
```json
{ "id": 1, "nombre": "Rock", "duracion_total": 6, "duracion_restante": 6, "prioridad": 2, "tiempo_llegada": 0 }
```

**Archivos principales**
- `party.html`: estructura de la interfaz.
- `styles.css`: estilos.
- `party.js`: logica de simulacion y UI.
- `songs.json`: dataset inicial.

**Deploy en Netlify**
Este proyecto ya incluye `netlify.toml` dentro de `DJS`.
- Base directory: `DJS`
- Publish directory: `.`
