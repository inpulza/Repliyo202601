# API de Zernio: elección técnica, rapidez y límites

Ampliación de la investigación de Repliyo · 22/09/2026 · Solo lectura · Edición técnica pública

## 08 · Qué vía usar en Repliyo

**Recomendamos API REST de Zernio o su SDK oficial Node.js desde el backend de Repliyo.** Añadimos webhooks para novedades y una reconciliación periódica contra la API. Es una recomendación técnica; no se ha implementado ni activado la migración.

| Vía | Para qué la usaríamos | Qué no podemos afirmar |
| --- | --- | --- |
| REST directo | Adaptador del backend con contratos, timeout, errores y métricas explícitos. | Que sea universalmente más rápido que Metricool: no hicimos comparación pareada. |
| SDK oficial Node | Tipos y métodos sobre los mismos endpoints; útil para mantener el adaptador. | Que el SDK acelere al servidor. Es otra forma de llamar a la misma API. |
| MCP | Investigación y operaciones realizadas por asistentes. | Que añada cobertura o garantice menor latencia; no lo medimos frente a REST. |
| Webhooks + API | Recibir novedades, consultar detalles y reconciliar ausencias. | Que todos los canales emitan todos los eventos o lleguen en un tiempo máximo garantizado. |

El SDK exige Node 18 o superior y permite configurar timeout. Antes de integrarlo, fijaremos una versión y verificaremos sus métodos y política de reintentos. No hay que poner la clave de Zernio en el navegador.

**Flujo entrante propuesto:** red social → Zernio → webhook firmado → cola y base de Repliyo → interfaz. El endpoint confirma recepción solo después de guardar el evento; el trabajo pesado se ejecuta después. La UI lee nuestra base, no espera a consultar todas las redes en cada apertura.

**Flujo saliente propuesto:** respuesta humana o IA aprobada → registro de salida pendiente → API/SDK Zernio → confirmación y reconciliación. Se conserva la autoría y se evita que Metricool y Zernio envíen simultáneamente la misma respuesta.

**Por qué API para la aplicación:** podemos controlar contratos, paginación, cuotas y fallos sin necesitar descubrimiento de herramientas MCP en cada operación. MCP también admite llamadas programáticas; no es obligatorio que intervenga un LLM. Nuestra preferencia es de simplicidad operativa, no una ventaja de velocidad medida del protocolo.

La base REST usada en las pruebas es `https://zernio.com/api/v1`. Las notas del observer de junio son contexto histórico; contrastar rutas y esquemas con documentación actual antes de programar.

Fuentes: [SDK Node](https://docs.zernio.com/sdks/node), [MCP](https://docs.zernio.com/mcp), [integración multicliente](https://docs.zernio.com/multi-tenant/inbox).

## 09 · Qué velocidad medimos realmente

**Ejecutamos 60 consultas GET y las 60 devolvieron HTTP 200.** Las medianas por endpoint estuvieron entre 145,53 y 654,92 ms. No hubo cuentas fallidas ni omitidas en los metadatos que devolvieron esos campos. Es una muestra corta, no un SLA ni una prueba de carga.

Ventana exacta: **22/09/2026, 17:37:02,818 a 17:37:34,280 UTC**. Origen: equipo Windows de prueba; ubicación geográfica de salida no verificada. Cliente Python estándar, HTTP/1.1, una conexión TLS persistente por endpoint. Diez rondas intercaladas, seis endpoints, ejecución secuencial y pausa de 0,2 segundos por llamada. No se aplicaron reintentos.

| Lectura | Primera llamada (ms) | Mediana de 10 (ms) | Máximo de 10 (ms) |
| --- | --- | --- | --- |
| Cuentas conectadas | 444,23 | 189,05 | 991,31 |
| Conversaciones Instagram | 305,25 | 187,13 | 389,19 |
| Conversaciones WhatsApp | 248,97 | 179,42 | 323,46 |
| Posts TikTok con comentarios | 1.626,22 | 146,94 | 1.626,22 |
| Comentarios de un post TikTok | 573,28 | 145,53 | 573,28 |
| Reseñas directas Google Business | 932,90 | 654,92 | 1.132,09 |

**Qué incluye el tiempo:** envío de la petición, espera de cabeceras y lectura completa del cuerpo HTTP. Las seis primeras llamadas incluyen establecer conexión; las 54 restantes reutilizaron sus conexiones. No incluye parseo JSON, trabajo de IA ni actualización de la interfaz. La primera llamada no equivale a caché vacía del servidor.

Las consultas utilizaron límites de 10 o 20 elementos según endpoint. Los tiempos individuales y parámetros anonimizados están en `zernio-api-benchmark-2026-09-22.json`. Se omiten identificadores y volúmenes internos de cuentas, conversaciones y reseñas; no se conservan cuerpos HTTP.

**Lectura práctica:** las consultas medidas permiten una integración interactiva, especialmente si la UI usa nuestra base. Google Business fue más lento en esta muestra. El máximo observado no es un límite superior futuro. Con diez muestras por endpoint no presentamos p95/p99 como estimaciones robustas de producción.

**No medimos:** recepción de un mensaje nuevo → llegada a Repliyo; clic en responder → entrega al destinatario; carga concurrente; lectura desde el hosting de Replit; envíos; comparación simultánea con Metricool o MCP. Por ello no afirmamos que Zernio sea más rápido que Metricool.

## 10 · Límites que cambian el diseño

**Nuestra cuenta devolvió `X-RateLimit-Limit: 600` en las 60 respuestas.** Coincide con el tramo documentado. El presupuesto es compartido por el equipo; crear más API keys no lo multiplica.

| Límite | Valor verificado/documentado | Consecuencia |
| --- | --- | --- |
| API general del equipo actual | 600 solicitudes/minuto; cabecera real. | Reservar margen para envíos, reintentos y otras automatizaciones de agencia. |
| Otros tramos | 0–2 cuentas: 60/min; más de 2.000: 1.200/min. | Leer cabeceras, no fijar un único límite para siempre. |
| Analytics | 6, 10 o 20 solicitudes/s según tramo. | Cuota separada por ventana de un segundo; no es requisito central del Repliyo actual. |
| Conversaciones | Hasta 100 por página. | Recorrer cursores; una página no representa todo el inbox. |
| Comentarios de un post | Hasta 100 por página; replies tienen recorrido propio. | Mantener jerarquía y deduplicar. |
| Reseñas del inbox agregado | Hasta 50 por página. | Separar este contrato del endpoint directo GBP y revisar errores parciales. |
| Webhook | Confirmación 2xx antes de 5 s; hasta 7 intentos. | Guardar y encolar antes del procesamiento; deduplicar eventos. |

Fuentes de cuotas: [rate limits](https://docs.zernio.com/guides/rate-limits). Paginación: [conversaciones](https://docs.zernio.com/messages/list-inbox-conversations), [comentarios](https://docs.zernio.com/comments/get-inbox-post-comments), [reseñas](https://docs.zernio.com/reviews/list-inbox-reviews). Entrega: [webhooks](https://docs.zernio.com/webhooks).

**Rapidez HTTP y frescura son cosas distintas.** Los comentarios pueden venir de caché durante hasta diez minutos. X documenta dos minutos en su inbox. Analytics de posts usa caché de 60 minutos y seguidores se actualizan diariamente. Una respuesta de 150 ms no demuestra que refleje un comentario publicado hace un segundo. `X-Vercel-Cache: BYPASS` en nuestras llamadas no excluye caché interna de Zernio o de la plataforma.

**Ejemplo ilustrativo de capacidad:** consultar 50 cuentas y después los mensajes de 20 conversaciones por cuenta requiere unas 1.050 llamadas si el adaptador hace 1+20 por cuenta. Repetido cada dos minutos equivale a 525 llamadas/minuto, sin contar páginas adicionales, comentarios, respuestas o fallos. Es un supuesto de diseño, no el consumo actual. Queda muy poco margen frente a 600: preferimos cambios incrementales y webhooks.

La cuota general tampoco elimina límites de Meta, TikTok, Google u otras redes. Zernio documenta reintentos ante algunos 429/5xx upstream; una espera hasta el reset puede alargar la solicitud. Las restricciones por destinatario, ventana de atención y permisos siguen vigentes aunque queden requests disponibles.

Fuentes de caché: [comentarios](https://docs.zernio.com/comments/get-inbox-post-comments), [X](https://docs.zernio.com/platforms/twitter/inbox), [analytics y cuotas](https://docs.zernio.com/guides/rate-limits).

## 11 · Fiabilidad y lo que falta por probar

**No encontramos un SLA contractual verificable con método de cálculo y créditos de servicio en los términos públicos revisados.** Zernio anuncia cifras comerciales de rapidez y disponibilidad; no las trasladamos como garantía de Repliyo. El comportamiento real depende del endpoint, red, caché y plataforma.

La página comercial de WhatsApp anuncia menos de 50 ms y la comparativa comercial con Metricool menciona 99,97 %. Son afirmaciones del proveedor. Nuestros tiempos completos fueron distintos y no son una refutación de su tiempo interno: miden recorridos posiblemente diferentes. Los términos públicos consultados no permiten certificar que esas cifras sean un compromiso contractual aplicable a nuestra cuenta.

Fuentes: [WhatsApp comercial](https://zernio.com/whatsapp), [comparativa comercial](https://zernio.com/alternatives/metricool), [términos](https://zernio.com/tos).

**Reintentar envíos requiere más cuidado que reintentar lecturas.** La API documenta `Idempotency-Key` durante 24 horas para mensajes y respuestas de comentarios/reseñas. Solo guarda éxitos 2xx; un timeout o 5xx puede ocurrir después de que la red haya aceptado el mensaje. No basta con repetir: debemos reconciliar, conservar el estado incierto y evitar envíos dobles. Un HTTP 200 puede incluir advertencias o fallo parcial.

El header de publicaciones es `x-request-id` y su ventana documentada es distinta. No aplicar una política única a todas las operaciones. Tampoco confundir «API aceptó» con «el destinatario recibió». [Idempotencia](https://docs.zernio.com/guides/idempotency), [envío de mensajes](https://docs.zernio.com/messages/send-inbox-message).

**Piloto pendiente para medir experiencia real:** instrumentar recepción en origen, llegada del webhook, persistencia, aparición en UI, envío y entrega/confirmación disponible. Comparar los mismos canales y tipos de mensaje con Metricool desde el hosting de Repliyo, en distintas franjas y con volumen suficiente. Registrar percentiles, fallos, duplicados y frescura; no limitarse a cronometrar HTTP.

| Estado al cerrar esta ampliación | Resultado |
| --- | --- |
| Recomendación API/SDK + webhooks | Registrada; pendiente implementación. |
| Rapidez de lecturas en nuestra cuenta | Medida: 60 muestras, 6 endpoints, 60 HTTP 200. |
| Cuota general de nuestra cuenta | Verificada por cabecera: 600/min. |
| Rapidez de envíos y recepción nueva | No medida; requiere piloto controlado. |
| Superioridad de velocidad frente a Metricool | No demostrada. |
| Migración o cambios en producción | No realizados. |

**Conclusión:** la API de Zernio es una vía adecuada para implementar el cambio y las lecturas medidas fueron ágiles. Las condiciones decisivas son frescura por eventos, paginación completa, límites compartidos y reconciliación segura. Estos resultados amplían la viabilidad; no convierten la sustitución total en una migración ya validada.

