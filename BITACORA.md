# Bitácora de Repliyo

## 2026-09-22 · Investigación Zernio/Metricool y rendimiento API

Jordan pidió que la investigación fuera localizable desde la documentación, las bitácoras y los archivos de agentes. Se añade una edición técnica pública; el expediente íntegro permanece en la carpeta documental de Repliyo.

- [Informe](docs/zernio/research/2026-09-22/Investigacion-Zernio-Repliyo.md), [anexo API](docs/zernio/research/2026-09-22/API-Zernio-rapidez-y-limites.md) y [muestras anonimizadas](docs/zernio/research/2026-09-22/zernio-api-benchmark-2026-09-22.json).
- Código auditado: `fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888`. No se verificó SHA desplegado.
- Dictamen: viabilidad como sustituto del transporte Metricool, pendiente desarrollo y validación por canal. API/SDK + webhooks + reconciliación recomendado.
- Benchmark 22/09/2026 17:37:02–17:37:34 UTC: 60 GET, 60 HTTP 200, mediana por endpoint 145,53–654,92 ms; máximo 1.626,22 ms. Cabecera de cuota: 600/min, compartida por equipo.
- Limitaciones: muestra corta desde Windows, caché posible, sin envíos, sin comparación con Metricool/MCP ni latencia extremo a extremo.
- Pendiente: inventario productivo, LinkedIn personal, pruebas Facebook/YouTube/LinkedIn, hilos, historial y todos los caminos de salida.
- Cambio documental solamente. Sin migraciones SQL, runtime, flags, dependencias, conexiones, despliegue o mensajes enviados.

Consultar [README](README.md), [AGENTS](AGENTS.md) y [índice Zernio](docs/zernio/README.md). La propuesta de arquitectura no activa funcionalidades.
