# Repliyo · Contexto para agentes

## Investigación de proveedores

Antes de trabajar en Metricool, Zernio, transporte de inbox o migración de cuentas, consultar:

1. [Índice Zernio](docs/zernio/README.md).
2. [Investigación de sustitución](docs/zernio/research/2026-09-22/Investigacion-Zernio-Repliyo.md).
3. [API, mediciones y límites](docs/zernio/research/2026-09-22/API-Zernio-rapidez-y-limites.md).
4. [Bitácora](BITACORA.md) y [contexto del proyecto](replit.md).

El informe del 22/09/2026 es una evaluación, no una implementación. Código base auditado: `fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888`; verificar HEAD y despliegue antes de reutilizar conclusiones.

Las mediciones son 60 GET desde Windows y no prueban envío, latencia de recepción, SLA o superioridad frente a Metricool. Separar latencia HTTP de frescura. Preservar identidad por marca, historial, deduplicación, estados inciertos y todos los caminos de salida. No activar envíos, reconectar cuentas ni retirar Metricool por la existencia de esta investigación.

Los documentos y memorias de junio sobre WhatsApp describen el observer histórico. No asumir que sus endpoints, planes o capacidades son el contrato vigente: contrastarlos con el informe fechado y documentación oficial actual.

El repositorio es público. Mantener fuera los secretos, inventario interno de clientes, IDs de cuentas y facturación. El expediente completo y PDF están en la carpeta documental interna de Repliyo. Desarrollo local fuera de OneDrive; seguir las instrucciones del usuario y las reglas vigentes de PR/revisión.
