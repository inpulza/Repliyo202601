# Kick Start para Proyectos Nuevos (desde Figma o desde cero)

Usa este mensaje al INICIAR cualquier proyecto nuevo para evitar problemas de arquitectura desde el día 1.

---

## Mensaje para copiar y pegar:

```
ANTES DE EMPEZAR A CODIFICAR, LEE ESTO:

ARQUITECTURA OBLIGATORIA DESDE EL DÍA 1:

1. ESTRUCTURA DE CARPETAS (crear desde el inicio):
   server/
   ├── routes/          # Una ruta por dominio (auth.routes.ts, users.routes.ts, etc.)
   ├── services/        # Lógica de negocio (AuthService.ts, UserService.ts, etc.)
   ├── repositories/    # Acceso a datos (UserRepository.ts, etc.)
   └── adapters/        # APIs externas (EmailAdapter.ts, PaymentAdapter.ts, etc.)
   
   client/src/
   ├── components/      # Organizados por dominio (auth/, dashboard/, etc.)
   ├── hooks/           # Hooks reutilizables (useAuth.ts, useApi.ts, etc.)
   ├── pages/           # Solo containers, máximo 300 líneas
   └── lib/             # Utilidades compartidas

2. REGLAS ESTRICTAS:
   - NUNCA crear un solo archivo routes.ts gigante → dividir por dominio desde el inicio
   - NUNCA crear un solo archivo storage.ts gigante → usar repositorios separados
   - NUNCA componentes React > 500 líneas → dividir en sub-componentes
   - NUNCA lógica de negocio en frontend → siempre en services/ del backend
   - NUNCA lógica de negocio en routes → las rutas solo validan y llaman servicios

3. PATRÓN DE CAPAS (seguir siempre):
   Route (validación) → Service (lógica) → Repository (datos)
                     ↘ Adapter (APIs externas)

4. ANTES DE CADA FEATURE:
   - Definir el modelo de datos en shared/schema.ts
   - Crear el repositorio correspondiente
   - Crear el servicio con la lógica
   - Crear la ruta que conecta todo
   - Crear los componentes de UI (pequeños y reutilizables)

5. DOCUMENTAR EN replit.md:
   - Decisiones de arquitectura
   - Estructura del proyecto
   - Preferencias del usuario

IDIOMA: Responde en español.

---

MI PROYECTO:
[Describe tu proyecto aquí - qué hace, qué diseños tienes, etc.]

DISEÑO DE FIGMA:
[Pega el link o describe las pantallas principales]
```

---

## Por qué esto es importante

Sin estas reglas, después de meses de desarrollo terminarás con:
- Archivos de 10,000+ líneas imposibles de mantener
- Lógica mezclada entre frontend y backend
- Componentes gigantes que nadie entiende
- Deuda técnica que cuesta semanas arreglar

Con estas reglas desde el día 1:
- Código organizado y fácil de entender
- Fácil agregar features nuevos
- Fácil para otros desarrolladores unirse
- Menos bugs por código más simple

---

## Ejemplo de uso

```
ANTES DE EMPEZAR A CODIFICAR, LEE ESTO:

ARQUITECTURA OBLIGATORIA DESDE EL DÍA 1:
[... todo el bloque de arriba ...]

---

MI PROYECTO:
App de reservas para restaurantes. Los usuarios pueden ver restaurantes, hacer reservas, y los restaurantes pueden gestionar sus mesas y horarios.

DISEÑO DE FIGMA:
https://figma.com/file/xxx

Pantallas principales:
1. Landing page con búsqueda
2. Lista de restaurantes con filtros
3. Detalle de restaurante con calendario de reservas
4. Dashboard del restaurante para gestionar reservas
5. Perfil de usuario con historial
```

---

*Archivo creado: 16 Enero 2026*
*Usar al inicio de CUALQUIER proyecto nuevo*
