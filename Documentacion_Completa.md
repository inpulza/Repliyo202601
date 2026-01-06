# Documentación Completa - Plan de Mejoras Repliyo

## Resumen Ejecutivo

Este documento contiene el plan de mejora técnica para el proyecto Repliyo (Social Media Inbox Management System), organizado en 3 fases principales con subfases y tareas específicas.

### Diagnóstico Actual (Enero 2026)

| Área | Puntuación | Estado |
|------|------------|--------|
| Componentes | 7/10 | UI reutilizable, pero componentes principales con lógica mezclada |
| Arquitectura | 8.5/10 | Híbrido layered/ports-adapters apropiado para SaaS |
| Testing | 4/10 | No existe, pero es recuperable gracias a la arquitectura |

### Justificación del Orden de Fases

**¿Por qué Componentes → Arquitectura → Testing?**

Aunque normalmente Testing-first reduce riesgos, en este proyecto el tamaño extremo y el estado entrelazado de componentes como Inbox (2,389 líneas) y CRMContextPanel hacen que los refactors de componentes sean **prerrequisito** para tener tests confiables. Si intentamos testear primero, los tests serían frágiles y cambiarían constantemente.

---

## FASE 1: COMPONENTES
**Objetivo:** Separar lógica de presentación, mejorar reutilización y preparar para testing
**Riesgo actual:** Componentes pesados dificultan mantenimiento y testing
**Duración estimada:** 2-3 semanas

### Subfase 1.1: Auditoría y Mapeo de Componentes Críticos

**Objetivo:** Entender qué lógica hay en cada componente antes de mover código

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.1.1 | Inventariar todos los `useState` y `useEffect` en Inbox.tsx | Lista completa de 25+ estados documentada |
| 1.1.2 | Identificar dependencias entre estados (cuáles se afectan mutuamente) | Diagrama de dependencias |
| 1.1.3 | Mapear props contracts entre Inbox → subcomponentes | Documentar tipos esperados |
| 1.1.4 | Repetir auditoría para CRMContextPanel.tsx | Mismo entregable |
| 1.1.5 | Identificar lógica duplicada entre componentes | Lista de candidatos a hooks |

### Subfase 1.2: Extracción de Lógica a Hooks y Servicios

**Objetivo:** Mover orquestación de datos fuera de componentes hacia hooks reutilizables

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.2.1 | Crear `useConversationState` - manejo de conversación activa | Hook funcional sin romper UI |
| 1.2.2 | Crear `useDraftManagement` - lógica de borradores IA | Separar de Inbox.tsx |
| 1.2.3 | Crear `useMessageSync` - sincronización y WebSocket | Reutilizable en otros componentes |
| 1.2.4 | Crear `useCRMPanel` - lógica del panel CRM | Separar de CRMContextPanel |
| 1.2.5 | Refactorizar NexusContext para exponer menos estado raw | Interfaz más limpia |
| 1.2.6 | Validar que la UI funciona igual después de cada extracción | Tests manuales pasan |

### Subfase 1.3: Estabilización de Interfaces de Usuario

**Objetivo:** Preparar componentes para testing automatizado

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.3.1 | Auditar `data-testid` existentes, documentar patrón | Convención establecida |
| 1.3.2 | Agregar `data-testid` faltantes en elementos interactivos | 100% cobertura en Inbox |
| 1.3.3 | Agregar `data-testid` en elementos de datos dinámicos | 100% cobertura en CRM Panel |
| 1.3.4 | Verificar accesibilidad básica (ARIA labels críticos) | Principales controles accesibles |

### Subfase 1.4: Guardrails y Observabilidad

**Objetivo:** Proteger refactors con feature flags y monitoreo

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.4.1 | Implementar sistema simple de feature flags | Toggle para nuevos hooks |
| 1.4.2 | Agregar logging en hooks críticos | Errores visibles en consola |
| 1.4.3 | Crear checklist de validación pre-deploy | Documento de QA |

---

## FASE 2: ARQUITECTURA
**Objetivo:** Modularizar backend para mantenibilidad y testability
**Riesgo actual:** storage.ts y routes.ts son archivos muy grandes
**Duración estimada:** 2-3 semanas

### Subfase 2.1: Modularización de Storage

**Objetivo:** Dividir storage.ts (4,310 líneas) en adaptadores por dominio

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.1.1 | Crear `storage/brandAdapter.ts` - métodos de brands | Migrar 10-15 métodos |
| 2.1.2 | Crear `storage/conversationAdapter.ts` | Migrar métodos de conversations |
| 2.1.3 | Crear `storage/messageAdapter.ts` | Migrar métodos de messages |
| 2.1.4 | Crear `storage/crmAdapter.ts` | Migrar métodos CRM (contacts, channels, limbo) |
| 2.1.5 | Crear `storage/reminderAdapter.ts` | Migrar métodos de reminders |
| 2.1.6 | Crear `storage/aiAdapter.ts` | Migrar métodos de AI agents y audit |
| 2.1.7 | Mantener `storage.ts` como facade que re-exporta | Compatibilidad hacia atrás |
| 2.1.8 | Extraer helpers comunes (paginación, errores) | `storage/helpers.ts` |

### Subfase 2.2: Codificación de Workflows Cross-Service

**Objetivo:** Formalizar flujos complejos (sync → CRM → reminders) en orquestadores

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.2.1 | Documentar flujo sync → CRM routing → reminder scheduling | Diagrama de secuencia |
| 2.2.2 | Crear `orchestrators/inboundMessageOrchestrator.ts` | Centralizar flujo de mensaje entrante |
| 2.2.3 | Definir interfaces claras entre servicios | Contratos TypeScript |
| 2.2.4 | Implementar circuit breaker para APIs externas (Metricool) | Resiliencia mejorada |

### Subfase 2.3: Reorganización de Routes

**Objetivo:** Dividir routes.ts (4,172 líneas) y mejorar validación

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.3.1 | Crear `routes/authRoutes.ts` | Migrar rutas de autenticación |
| 2.3.2 | Crear `routes/brandRoutes.ts` | Migrar rutas de brands |
| 2.3.3 | Crear `routes/conversationRoutes.ts` | Migrar rutas de inbox |
| 2.3.4 | Crear `routes/crmRoutes.ts` | Migrar rutas CRM |
| 2.3.5 | Crear `routes/reminderRoutes.ts` | Migrar rutas de reminders |
| 2.3.6 | Estandarizar validación Zod en middleware | Reducir código repetitivo |
| 2.3.7 | Mantener `routes.ts` como registro central | Compatibilidad |

---

## FASE 3: TESTING
**Objetivo:** Establecer suite de tests para prevenir regresiones
**Riesgo actual:** Cambios pueden romper funcionalidad sin detectarlo
**Duración estimada:** 2-3 semanas

### Subfase 3.1: Configuración de Infraestructura de Testing

**Objetivo:** Preparar herramientas y base de datos de pruebas

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 3.1.1 | Elegir framework: Vitest (recomendado) o Jest | Decisión documentada |
| 3.1.2 | Configurar `vitest.config.ts` | Tests ejecutan sin errores |
| 3.1.3 | Configurar base de datos PostgreSQL de pruebas | Conexión funcional |
| 3.1.4 | Crear fixtures/seeds para datos de prueba | Brands, users, conversations de prueba |
| 3.1.5 | Configurar mocks para APIs externas (Metricool, OpenAI) | Mocks funcionales |
| 3.1.6 | Configurar coverage reports | Reporte generado |

### Subfase 3.2: Tests Unitarios de Servicios Críticos

**Objetivo:** Cubrir lógica de negocio más riesgosa

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| 3.2.1 | Tests para storage adapters (CRUD básico) | ALTA |
| 3.2.2 | Tests para `crmTrafficController` (routing lógica) | ALTA |
| 3.2.3 | Tests para `reminderService` (scheduling, eligibility) | ALTA |
| 3.2.4 | Tests para `syncService` (manejo de errores, cooldowns) | ALTA |
| 3.2.5 | Tests para `thankYouDetector` (detección de cierre) | MEDIA |
| 3.2.6 | Tests para `conversationLifecycleService` | MEDIA |
| 3.2.7 | Tests para helpers de schema (getEffectiveChannelSettings) | BAJA |

### Subfase 3.3: Tests de Integración y Regresión

**Objetivo:** Validar flujos end-to-end críticos

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| 3.3.1 | Test de integración: autenticación (login/logout/session) | ALTA |
| 3.3.2 | Test de integración: fetch de inbox (conversations + messages) | ALTA |
| 3.3.3 | Test de integración: ciclo de vida de reminder | ALTA |
| 3.3.4 | Test de integración: CRM contact creation con channel | MEDIA |
| 3.3.5 | Test de integración: merge de contactos | MEDIA |
| 3.3.6 | Configurar CI para ejecutar tests en cada push | ALTA |
| 3.3.7 | Establecer umbral mínimo de coverage (ej: 40% inicial) | MEDIA |

---

## Matriz de Dependencias entre Fases

```
FASE 1 (Componentes)
    │
    ├─► Subfase 1.2 depende de Subfase 1.1
    │
    └─► Subfase 1.3 puede ejecutarse en paralelo con 1.2
    
FASE 2 (Arquitectura)
    │
    ├─► Puede comenzar después de Subfase 1.2
    │
    └─► Subfase 2.2 depende de Subfase 2.1
    
FASE 3 (Testing)
    │
    ├─► Subfase 3.1 puede comenzar en paralelo con Fase 2
    │
    └─► Subfases 3.2 y 3.3 dependen de Fases 1 y 2 completadas
```

---

## Estimación de Esfuerzo Total

| Fase | Subfases | Tareas | Duración Estimada |
|------|----------|--------|-------------------|
| Fase 1: Componentes | 4 | 18 | 2-3 semanas |
| Fase 2: Arquitectura | 3 | 19 | 2-3 semanas |
| Fase 3: Testing | 3 | 17 | 2-3 semanas |
| **TOTAL** | **10** | **54** | **6-9 semanas** |

---

## Principios de Implementación

1. **No romper producción:** Cada cambio debe ser backwards-compatible
2. **Commits pequeños:** Una tarea = un commit verificable
3. **Feature flags:** Usar toggles para activar/desactivar refactors
4. **Validación continua:** Probar manualmente después de cada subfase
5. **Documentar decisiones:** Actualizar este documento con cambios

---

## Notas Importantes

- **storage.ts mantiene compatibilidad:** Al modularizar, storage.ts se convierte en "facade" que re-exporta, evitando romper imports existentes
- **routes.ts mantiene registro central:** Similar al storage, routes.ts registra las rutas modulares
- **Testing gradual:** Comenzar con 40% coverage y aumentar progresivamente
- **Priorizar servicios críticos:** sync, CRM routing, reminders son los más riesgosos

---

*Documento creado: Enero 2026*
*Última actualización: [Actualizar con cada implementación]*
