# Guía de Diseño: Sistema UX/UI para CRM Conversacional

## Resumen del Documento

**Fuente**: `Guía_de_Diseño_CRM_SaaS_Conversacional_1767176108783.pdf`  
**Ciclo**: 2024-2025  
**Propósito**: Sistema de diseño normativo para frontend de CRM conversacional

---

## 1. Paradigma del Layout de 3 Paneles

### Estructura Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INBOX LAYOUT                                │
├──────────┬──────────────────┬───────────────────────────────────────────┤
│  Panel A │     Panel B      │              Panel C                       │
│          │                  │                                           │
│ Navegación│ Lista de        │         Conversation View                 │
│  Global  │ Conversaciones   │                                           │
│          │                  │  ┌─────────────────────┬─────────────┐    │
│ 60-200px │    280-320px     │  │   Timeline          │  Sidebar    │    │
│          │                  │  │   Unificada         │  Contexto   │    │
│ Colapsable│                 │  │                     │  (CRM)      │    │
│          │                  │  └─────────────────────┴─────────────┘    │
└──────────┴──────────────────┴───────────────────────────────────────────┘
```

---

## 2. Panel A: Navegación Global

### Estados del Sidebar

| Estado | Ancho | Contenido | Uso |
|--------|-------|-----------|-----|
| **Expandido** | ~200px | Etiquetas de texto completo | Usuarios nuevos, reorganización |
| **Colapsado (Rail)** | ~60px | Solo iconos | Usuarios expertos, memoria muscular |

### Jerarquía de Elementos

1. **Buzones del Sistema** (Inmutables, parte superior)
   - Todo
   - Mío (Assigned to me)
   - Sin Asignar
   - Menciones

2. **Vistas Dinámicas y Equipos** (Reordenables via drag-and-drop)
   - Filtros guardados por usuario
   - Vistas de equipo compartidas
   - Ej: "Soporte Nivel 1", "Ventas LATAM"

3. **Filtrado por Canal**
   - WhatsApp, Email, Messenger, Instagram
   - Especialización por canal

### Filosofía Inbox Zero

Secciones explícitas:
- **Abierto** (trabajo activo)
- **Archivado/Hecho** (Done)
- **Pospuesto** (Snoozed/Later)

**Contadores dinámicos**: WebSockets para tiempo real  
**Badges de color**:
- 🔴 Rojo = urgencia crítica / SLA vencido
- 🔵 Azul/Gris = informativo

---

## 3. Panel B: Lista de Conversaciones

### Anatomía de la Tarjeta de Conversación

```
┌─────────────────────────────────────────────────┐
│ ┌────┐                                          │
│ │    │  Nombre del Usuario (bold)      12:34 PM │
│ │ AV │  Las dos primeras líneas del último      │
│ │    │  mensaje con truncamiento suave...       │
│ └──●─┘                                     📱   │
│  online                               WhatsApp  │
└─────────────────────────────────────────────────┘
```

**Elementos**:
- Avatar circular (40px) con indicador online (punto verde/gris)
- Nombre en negrita, truncamiento inteligente
- Snippet de 2 líneas del último mensaje
- Contenido multimedia: `[Imagen]`, `[Audio]` en gris cursiva
- Badge de canal (esquina inferior derecha)
- Timestamp con indicador SLA

### Estados de Lectura

| Estado | Tipografía | Indicador |
|--------|------------|-----------|
| No leído | **Bold** | Punto azul izquierdo |
| Leído | Regular | Sin punto |

### Indicadores de SLA en Riesgo

- Borde izquierdo rojo
- Fondo amarillo pálido
- Timestamp en color rojo

### Acciones Masivas (Bulk Actions)

**Patrón de revelación progresiva**:
- Hover sobre avatar → se transforma en checkbox
- Selección múltiple → barra flotante aparece
- Acciones: Asignar, Cerrar, Fusionar, Cambiar Estado

### Atajos de Teclado (Keyboard First)

| Tecla | Acción |
|-------|--------|
| `j` | Mover abajo |
| `k` | Mover arriba |
| `e` | Archivar |
| `Enter` | Abrir conversación |

---

## 4. Panel C: Conversation View

### Header de Conversación

Componentes:
- Asunto/Nombre del contacto
- **Botones primarios**: "Resolver" (Solve), "Posponer" (Snooze)
- Menú "..." con acciones secundarias: Fusionar, Imprimir, Bloquear, Spam

### Composer (Editor de Respuesta)

**Channel-Aware** (Consciente del canal):

| Canal | Comportamiento |
|-------|----------------|
| **WhatsApp** | Texto plano, emojis, plantillas HSM. Restricción HTML |
| **Email** | Barra de formato rico, adjuntos grandes, firmas |

**Botón de Envío Dividido (Split Button)**:
- Enviar y Cerrar (Send & Close)
- Enviar y Posponer (Send & Snooze)
- Enviar y Esperar (Send & Wait)

### Sidebar de Contexto (CRM)

Panel colapsable a la derecha:
- Datos del cliente (nombre, empresa, plan, LTV)
- Historial de eventos (páginas visitadas, acciones)
- Widgets de apps integradas
- **Personalizable** por equipo

---

## 5. Línea de Tiempo Unificada

### Diferenciación Visual de Canales

| Canal | Color Acento | Icono |
|-------|--------------|-------|
| WhatsApp | Verde #25D366 | Logo WhatsApp |
| Messenger | Azul #0084FF | Burbuja azul |
| Email | Gris Neutro | Sobre |
| Instagram | Gradiente | Logo Instagram |

**Ubicación del badge**: Junto al timestamp o borde inferior de burbuja

### Tipos de Bloques

| Tipo | Diseño | Alineación |
|------|--------|------------|
| **Chat (WhatsApp, Messenger)** | Burbujas redondeadas | Izq=cliente, Der=agente |
| **Email** | Tarjetas ancho completo | Full-width |
| **Notas Internas** | Fondo amarillo/gris + candado | Full-width, distintivo |
| **Eventos Sistema** | Texto pequeño, gris, centrado | Colapsables |

### Notas Internas (Crítico)

**Tratamiento visual inconfundible**:
- Fondo: Amarillo pálido #FFF9C4 (claro) / Gris oscuro (dark mode)
- Icono de candado prominente
- Borde distintivo

**Propósito**: Evitar envío accidental de información privada al cliente.

### Rich Media

| Tipo | Comportamiento |
|------|----------------|
| **Imágenes** | Preview inline, lightbox al clic |
| **Archivos** | Tarjeta con icono tipo + nombre + peso |
| **Audio** | Waveform + controles velocidad (1x, 1.5x, 2x) |

---

## 6. Flujo de Cierre Inteligente (UI)

### Solved vs Closed en UI

| Característica | Solved | Closed |
|----------------|--------|--------|
| **Quién lo activa** | Agente (manual) | Sistema (automático) |
| **Botón en UI** | Prominente en Composer | No accionable (etiqueta) |
| **Reapertura** | Sí (respuesta cliente) | No (nuevo ticket) |
| **Visibilidad** | Fuera de "Mío", accesible en búsqueda | Solo historial/reportes |

**Best Practice**: El botón principal debe ser "Marcar como Resuelto", NO "Cerrar".

### Modal de Cierre con Resumen IA

```
┌─────────────────────────────────────────────────────┐
│  ✨ Resumen Generado por IA                    [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ El cliente consultó sobre precios de ITIN   │   │
│  │ para su negocio. Se le proporcionó info y   │   │
│  │ se redirigió al WhatsApp para cotización.   │   │
│  └─────────────────────────────────────────────┘   │
│                          [Editar resumen...]        │
│                                                     │
│  Sentimiento: ⭐ Positivo                           │
│  Categoría: [Consulta de Precios ▼]                │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │ ¿Fue útil este resumen?   👍   👎        │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│             [Cancelar]  [Confirmar y Cerrar]       │
└─────────────────────────────────────────────────────┘
```

**Elementos clave**:
- Resumen editable (human-in-the-loop)
- Selector de categoría de cierre
- Feedback thumbs up/down para mejorar modelo
- Doble acción: revisar + cerrar

### Prevención de Reapertura (Thank You Detection)

**Manejo en UI cuando se detecta "Gracias"**:

Opción 1: El mensaje de agradecimiento se añade como nota cerrada, sin cambiar estado.

Opción 2 (ambiguo): Mostrar alerta al agente:
```
┌──────────────────────────────────────────────┐
│ ⚠️ El cliente respondió a ticket resuelto   │
│                                              │
│ "Muchas gracias, todo perfecto"              │
│                                              │
│ ¿Este mensaje requiere reapertura?           │
│                                              │
│  [Crear nueva conversación]  [Reabrir]       │
│              [Mantener cerrado]              │
└──────────────────────────────────────────────┘
```

### Mensajes Automáticos (Bump-Bump-Solve)

En la línea de tiempo, marcar claramente:
- Icono de robot
- Texto "Automated System Message" o "Bot Action"
- Estilo visual diferenciado (gris, cursiva)

---

## 7. Fusión de Identidad (Merge UI)

### Notificación de Duplicado Detectado

Banner contextual (no intrusivo):
```
┌──────────────────────────────────────────────────────┐
│ 👤 Posible duplicado detectado: Juan Pérez          │
│    📱 Mismo número de teléfono                [Ver] │
└──────────────────────────────────────────────────────┘
```

### Modal de Comparación Lado a Lado

```
┌─────────────────────────────────────────────────────────────┐
│               Fusionar Contactos                       [X]  │
├────────────────────────────┬────────────────────────────────┤
│     PERFIL PRINCIPAL       │      PERFIL SECUNDARIO         │
│        (Se mantiene)       │      (Se eliminará)            │
├────────────────────────────┼────────────────────────────────┤
│ Nombre: Juan Pérez      ◉  │  ○  Juan P. García             │
│ Email: juan@email.com   ◉  │  ○  jp.garcia@otro.com         │
│ Teléfono: +34600...     ○  │  ◉  +34611... (más reciente)   │
│ Empresa: ACME Corp      ◉  │  ○  ACME S.L.                  │
├────────────────────────────┴────────────────────────────────┤
│ ⚠️ Se moverán 12 conversaciones y 34 mensajes              │
│                                                             │
│ □ Entiendo que esta acción no se puede deshacer            │
│                                                             │
│            [Cancelar]        [Fusionar Contactos]           │
└─────────────────────────────────────────────────────────────┘
```

**Elementos clave**:
- Selección granular campo por campo (radio buttons)
- Indicación de qué se moverá
- Checkbox de confirmación (fricción positiva)
- Razón de match visible (icono teléfono = coincidencia)

---

## 8. Sistema Visual 2024-2025

### Filosofía: "Claridad Densa"

Alta densidad de información + reducción de carga cognitiva mediante:
- Espacio en blanco estratégico
- Tipografía clara
- Color funcional (no decorativo)

### Tipografía

| Nivel | Tamaño | Peso |
|-------|--------|------|
| Encabezados | 16px+ | Bold |
| Cuerpo | 14px | Regular |
| Metadatos | 12px | Medium/Regular |

**Familia recomendada**: Inter, Roboto Flex (sans-serif variable)

### Escala de Espaciado

Base-4: Todo múltiplo de 4px
- 4px, 8px, 12px, 16px, 24px, 32px

### Modo Oscuro

**Obligatorio en 2025**

| Elemento | Valor |
|----------|-------|
| Fondo base | #121212 (evitar #000000 puro) |
| Superficies elevadas | Grises más claros |
| Contraste | WCAG AA mínimo |

**Tokens semánticos** (no hex fijos):
- `bg-surface-primary`
- `text-content-secondary`
- `border-subtle`

### Estados de Carga

**Skeleton Screens** en lugar de spinners:
- Bloques grises pulsantes
- Imitan estructura de 3 paneles
- Mejoran percepción de velocidad

### Micro-interacciones

- Animaciones < 200ms
- Funcionales, no decorativas
- Guían el ojo en cambios de estado

---

## 9. Accesibilidad (A11y)

### Navegación por Teclado

- Todos los elementos interactivos focalizables
- Focus ring visible y de alto contraste
- Teclas: Tab, Enter, Flechas

### Lectores de Pantalla

Etiquetas ARIA obligatorias:
```html
<span aria-label="Mensaje de WhatsApp">📱</span>
<button aria-label="Marcar como resuelto">Resolver</button>
```

### Contraste

Mínimo WCAG 2.2 AA para todo texto.

---

## 10. Referencias

- **PDF Original**: `docs/knowledge-base/Guía_de_Diseño_CRM_SaaS_Conversacional_1767176108783.pdf`
- **PRD Lifecycle**: Sección `PRD-LIFECYCLE` en `DOCUMENTACION_COMPLETA.md`
- **Plataformas de referencia**: Intercom, Front, Zendesk, Respond.io, HubSpot

---

*Última actualización: 31 Diciembre 2024*
