# Kick Start Message para Nuevas Conversaciones

Copia y pega este mensaje al inicio de cada nueva conversación con el agente:

---

```
CONTEXTO DEL PROYECTO:

1. Lee `replit.md` para entender el sistema y las directrices de arquitectura.
2. Lee la sección "PLAN DE REFACTORIZACIÓN ARQUITECTÓNICA" en `DOCUMENTACION_COMPLETA.md` para entender el plan de mejora gradual.

REGLAS DE ARQUITECTURA (obligatorias):
- NO agregar código a routes.ts ni storage.ts
- Rutas nuevas → server/routes/{dominio}.routes.ts
- Datos nuevos → server/repositories/{Entidad}Repository.ts
- Lógica → server/services/{Dominio}Service.ts
- Componentes React < 500 líneas, divididos por dominio
- Código nuevo conecta con código existente pero en archivos separados

PATRÓN: Route → Service → Repository (código viejo se usa via imports, no se toca)

---

MI PETICIÓN:

```

---

## Ejemplo de uso

```
CONTEXTO DEL PROYECTO:

1. Lee `replit.md` para entender el sistema y las directrices de arquitectura.
2. Lee la sección "PLAN DE REFACTORIZACIÓN ARQUITECTÓNICA" en `DOCUMENTACION_COMPLETA.md` para entender el plan de mejora gradual.

REGLAS DE ARQUITECTURA (obligatorias):
- NO agregar código a routes.ts ni storage.ts
- Rutas nuevas → server/routes/{dominio}.routes.ts
- Datos nuevos → server/repositories/{Entidad}Repository.ts
- Lógica → server/services/{Dominio}Service.ts
- Componentes React < 500 líneas, divididos por dominio
- Código nuevo conecta con código existente pero en archivos separados

PATRÓN: Route → Service → Repository (código viejo se usa via imports, no se toca)

---

MI PETICIÓN:
Quiero agregar un sistema de etiquetas para los contactos del CRM. Cada contacto puede tener múltiples etiquetas, y quiero poder filtrar por etiqueta en la vista de CRM.
```

---

*Archivo creado: 16 Enero 2026*
