# ¿Podemos sustituir Metricool por Zernio en Repliyo?

Investigación de Inpulza · 22 de septiembre de 2026 · Versión ampliada con API y mediciones.

Edición técnica pública; los datos operativos internos se conservan en el expediente documental de Repliyo. Secciones 01–07: viabilidad; 08–11: API, rapidez, cuotas y fiabilidad.

## 01 · Dictamen y alcance

**Sí, Zernio es un candidato técnicamente viable para sustituir la integración de Metricool en Repliyo. No podemos certificar todavía una sustitución íntegra sin pérdida de funciones.** Hemos comprobado capacidades en documentación oficial, lecturas reales de nuestra cuenta y dependencias del código actual. La sustitución requiere desarrollo y pruebas por canal; no consiste en cambiar una clave.

En cristiano: podemos conservar la interfaz, la IA, el CRM y los flujos de Repliyo, cambiando el servicio que trae y envía comentarios y mensajes. Zernio no tiene que reproducir todo Metricool para cubrir lo que Repliyo utiliza.

**Qué verificamos:** tres agentes investigaron código, capacidades API y condiciones de integración. Contrastamos el checkout local de junio con GitHub `main`, SHA `fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888`, obtenido el 22/09/2026. La rama remota incorpora el PR #40 del 26/08/2026. Esto confirma código en GitHub, no la versión desplegada ni el uso efectivo de cada cliente.

**Pruebas en vivo:** consultas GET a la API Zernio de la agencia entre las 17:20 y 17:24 UTC del 22/09/2026. Listamos cuentas, perfiles, facturación, conversaciones, posts comentados, un hilo TikTok, reseñas y configuración de webhooks. No publicamos, respondimos, marcamos leído, cambiamos conexiones ni activamos automatizaciones.

| Pregunta | Respuesta demostrable |
| --- | --- |
| ¿Zernio sirve como proveedor para Repliyo? | Sí: API de cuentas, conversaciones, comentarios, reseñas y respuestas; integración SaaS documentada. |
| ¿Ya cubre todo en nuestra instalación? | No. El código sigue ligado a Metricool y Zernio aparece como observer WhatsApp. |
| ¿Está comprobada toda la equivalencia? | No: tres canales no están conectados en el conjunto visible y no probamos envíos. |
| ¿Podemos cancelar Metricool ahora? | La evidencia reunida no justifica hacerlo antes de migrar y validar. |

**Límite del dictamen:** no leímos la base de producción ni el inventario de marcas activas en Metricool. Por tanto, identificamos funciones implementadas, pero no afirmamos qué porcentaje de clientes utiliza cada una ni calculamos ahorro sobre una factura Metricool no verificada.

Fuentes: [código remoto fijado](https://github.com/inpulza/Repliyo202601/tree/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888), [API inicial](https://docs.zernio.com/), [construir una plataforma](https://docs.zernio.com/multi-tenant).

## 02 · Qué utiliza realmente Repliyo

Encontramos cinco combinaciones HTTP de Metricool: listar marcas, leer conversaciones, enviar mensajes, leer comentarios y responder comentarios. La aplicación organiza y procesa después esos datos con sus propios servicios.

| Función | Uso identificado en Repliyo | Requisito del cambio |
| --- | --- | --- |
| Marcas y redes | Importa nombre, avatar, web y proveedores desde `/admin/simpleProfiles`. | Relacionar marca interna con perfiles y cuentas Zernio. |
| DMs | Lee y responde Instagram y Facebook mediante `/v2/inbox/conversations`. | Mantener participantes, dirección, adjuntos, fechas e identificadores. |
| Comentarios | Lee y responde IG, FB, TikTok Business, YouTube, LinkedIn y GMB mediante `/v2/inbox/post-comments`. | Separar comentarios de reseñas GBP y conservar hilos. |
| Respuesta humana | Las rutas de respuesta llaman directamente a Metricool. | Cambiar el transporte conservando autoría y estado. |
| IA | Aprobación de borradores y auto-respuestas también llaman a Metricool. | Mantener políticas y reconciliar el envío. |
| Seguimientos | Los recordatorios utilizan Metricool y controles locales de deduplicación. | Migrar también el envío diferido. |
| Comentario a DM | Facebook/Instagram usan Meta Graph directamente. | Conservar esa integración o migrarla por separado. |

**No encontramos uso del publicador, calendario editorial, métricas de alcance/seguidores o Ads de Metricool en el adaptador revisado.** Los posts almacenados dan contexto a los comentarios. Las estadísticas del inbox y de la IA son propias de Repliyo. Tampoco identificamos hide/delete upstream como requisito actual; no convertir una función extra de Zernio en condición ficticia de paridad.

X aparece entre proveedores detectables, pero no en los arrays de sincronización de DMs/comentarios de Metricool. Su presencia en un enum no demuestra un canal operativo.

**Consecuencia práctica:** el trabajo principal es sustituir transporte, descubrimiento e identidad de cuentas. No necesitamos rehacer la IA, el CRM o la interfaz desde cero, aunque sí adaptar los puntos que dependen del formato Metricool.

Evidencia: `server/services/metricool.ts`, `syncService.ts`, `autoReplyService.ts`, `reminderService.ts`, `metaService.ts`, `server/routes.ts`, `shared/schema.ts`, contrastados con el SHA remoto. [Adaptador Metricool](https://github.com/inpulza/Repliyo202601/blob/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888/server/services/metricool.ts).

## 03 · Validaciones operativas y alcance de esta edición

Edición técnica pública: el inventario de clientes, identificadores de cuentas y facturación se conserva únicamente en el expediente interno de Repliyo. No se incluye aquí.

En un entorno autorizado comprobamos lecturas de conversaciones Instagram y WhatsApp, comentarios TikTok y reseñas GBP. La API identificó un comentario TikTok como respondible, pero no ejecutamos la respuesta. No certificamos cobertura por el mero hecho de recibir un HTTP 200 ni de que una cuenta tenga permisos.

No había cuentas Facebook, YouTube o LinkedIn en el conjunto consultado. Su equivalencia sigue pendiente de prueba. El alcance de cada clave debe verificarse antes de generalizar un inventario.

Las pruebas fueron de lectura. No hubo mensajes enviados, marcado como leído, reconexiones ni activación de automatizaciones. Las mediciones ampliadas se documentan en las secciones 08 a 11.

## 04 · Paridad por canal: capacidad y evidencia

| Canal usado por Repliyo | Cobertura documentada Zernio | Validación y condición |
| --- | --- | --- |
| Facebook | Messenger DMs, comentarios de páginas y respuestas. | No hay cuenta FB en el listado consultado. Falta probar lectura y envío. No aplica a perfiles personales. |
| Instagram | DMs, comentarios y respuestas, además de respuesta privada tras comentario. | DMs leídos. Faltan comentario con datos y respuestas; respetar ventanas y permisos. |
| TikTok Business | Leer/responder comentarios mediante Business app. | Lectura real y `canReply=true` en la cuenta de prueba; falta envío y paginación histórica. |
| YouTube | Comentarios y respuestas en vídeos. | Sin conexión visible. Probar respuesta al comentario correcto y hilos anidados. |
| LinkedIn | Comentarios de páginas de organización. | Sin conexión visible. No hay paridad general para comentarios de perfiles personales ni DMs. |
| Google Business | Reseñas y respuesta del negocio. | Lectura directa real. El formato es reviews, no comentarios de posts. |
| WhatsApp | Mensajes, adjuntos y plantillas. | Complementa Repliyo; no sustituye una función Metricool identificada. Observer actual limitado. |

**Bloqueo potencial más claro: LinkedIn personal.** Debemos verificar si alguna marca de Repliyo lo usa realmente. No podemos equiparar organización y perfil personal. Si el caso existe y funciona hoy por otra vía, Zernio no ofrece sustitución universal documentada para ese caso.

**TikTok:** una página comercial antigua afirma que no hay lectura; la guía actual describe Business app. Nuestra prueba real resuelve la duda de lectura para la cuenta de prueba, no para todas las cuentas. DMs TikTok exigen cuenta Business y restricciones regionales; no son un requisito actual del adaptador Metricool de Repliyo.

**Funciones extra con límites:** los likes a comentarios Instagram están en beta restringida a roles de la app de Zernio. WhatsApp requiere plantillas aprobadas fuera de su ventana de atención. No usar esas capacidades generales como promesa de automatización ilimitada.

Fuentes por canal: [Facebook](https://docs.zernio.com/platforms/facebook), [Instagram](https://docs.zernio.com/platforms/instagram), [TikTok](https://docs.zernio.com/platforms/tiktok), [YouTube](https://docs.zernio.com/platforms/youtube), [LinkedIn](https://docs.zernio.com/platforms/linkedin), [Google Business](https://docs.zernio.com/platforms/google-business), [WhatsApp](https://docs.zernio.com/platforms/whatsapp).

## 05 · Qué hay que cambiar y conservar

**Repliyo todavía no puede funcionar sin Metricool solo por configurar Zernio.** Las credenciales Metricool son obligatorias en marcas, el sync omite marcas sin esas credenciales y las distintas rutas de salida llaman al proveedor directamente.

| Dependencia | Riesgo de sustitución ingenua | Adaptación necesaria |
| --- | --- | --- |
| `metricoolToken`, `metricoolUserId`, `metricoolBlogId` obligatorios | Marcas nuevas Zernio quedan bloqueadas. | Identidad interna independiente y credenciales por proveedor. |
| `metricool_id` único y normalización específica | Duplicados, respuestas enlazadas a otro hilo o pérdida de autoría. | Guardar proveedor, cuenta e ID nativo; mantener correspondencias históricas. |
| `source=metricool_sync` en reconciliación | Un envío humano/IA reaparece como otro mensaje. | Reconciliar ambos proveedores sin duplicar. |
| Manual, IA, auto-reply y recordatorios | Cambiar solo inbox deja salidas usando Metricool. | Unificar el despacho y verificar cada camino. |
| Onboarding y selección de marcas | Clientes siguen necesitando credenciales antiguas. | Descubrimiento real de perfiles/cuentas y OAuth propio. |
| Threads y parent IDs | Responder al post equivocado o perder respuestas hijas. | Adaptación por red, incluidas TikTok y YouTube. |

En el SHA actual, Zernio sigue registrado como `zernio-whatsapp`, restringido por flags y marca autorizada. La lectura obtiene hasta 50 conversaciones y los 20 mensajes más recientes de cada una; no recorre todos los cursores. El adaptador contiene métodos de envío/typing, pero las rutas reales y automatizaciones bloquean WhatsApp como observer. **Método implementado no significa función activada.**

**Histórico:** no encontramos un importador directo Metricool→Zernio. Conservamos la base de Repliyo y relacionamos IDs. Meta puede recuperar hasta 500 conversaciones y hasta 500 mensajes recientes por conversación, de forma asíncrona, como leídos y sin webhooks. No prometemos reconstruir desde cero todo el pasado. Debemos repetir el barrido y comprobar el orden efectivo.

**Comentarios:** listas y detalles pueden tener caché de diez minutos; paginación de posts solo es coherente con fecha descendente y varía por red. Las respuestas hijas necesitan su propio recorrido. Para GBP, mantenemos lectura directa y reconciliación: el SDK local documenta fallos históricos del inbox agregado. No afirmamos que esos fallos sigan presentes hoy.

Fuentes: [mensajes e histórico](https://docs.zernio.com/messages/get-inbox-conversation-messages), [posts comentados](https://docs.zernio.com/comments/list-inbox-comments), [hilos](https://docs.zernio.com/comments/get-inbox-post-comments), [código sync](https://github.com/inpulza/Repliyo202601/blob/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888/server/services/syncService.ts).

## 06 · SaaS, costes y condiciones de operación

Zernio documenta expresamente el uso como backend de una aplicación multicliente: perfiles/cuentas por cliente, OAuth, callbacks y claves acotadas. Podemos mantener la experiencia en Repliyo. Su signup alojado de WhatsApp es co-brand con Zernio; no equivale a invisibilidad absoluta de la marca del proveedor.

**Aislamiento:** una clave maestra puede alcanzar múltiples perfiles. Repliyo debe autorizar cada cuenta en su backend. Las guías se contradicen sobre varias cuentas de la misma red en un perfil; la guía específica Profiles advierte que conectar otra reemplaza la anterior. Diseñamos conservadoramente varios perfiles cuando hagan falta, sin probar sustituyendo conexiones productivas.

**Eventos:** nuestra cuenta no tiene webhooks configurados. Para migrar conviene persistir eventos firmados, responder rápido y deduplicar su ID. No todos los canales emiten todos los eventos: no hay webhook de reseñas Facebook; las docs discrepan sobre respuestas hechas directamente en Google. Mantenemos consultas de reconciliación. No se crean webhooks como parte de esta investigación.

**Precio público actual, solo conexiones mantenidas todo el periodo de referencia:** primeros dos equivalentes gratis mediante crédito; tramos progresivos de US$6 hasta la décima, US$3 hasta la centésima y US$1 por encima. Inbox y analytics incluidos en el modelo Usage-Based. Los ejemplos no incluyen impuestos ni otros consumos.

| Escenario hipotético | Cuentas sociales | Base mensual ilustrativa |
| --- | --- | --- |
| 10 marcas con 2 redes cada una | 20 | US$78 |
| 10 marcas con 5 redes cada una | 50 | US$168 |
| 20 marcas con 5 redes cada una | 100 | US$318 |
| 30 marcas con 5 redes cada una | 150 | US$368 |

**No equivale a ahorro confirmado.** Metricool factura por marcas y su API requiere Advanced/Custom; Zernio cuenta conexiones. Faltan factura/plan Metricool y mapa de redes realmente utilizadas. Las filas de telefonía y SMS tienen reglas de facturación propias; el total facturable exige el desglose del periodo. WhatsApp/telefonía, X, ads y otros medidores pueden añadir consumo. La guía anuncia un medidor de mensajes salientes a partir del 01/10/2026: debe incluirse antes de presupuestar una migración posterior.

Zernio documenta 600 solicitudes/minuto para equipos entre 3 y 2.000 cuentas, compartidas por equipo. Eso no elimina límites propios de cada red. El código debería tratar errores parciales, 429 y envíos ambiguos; un 200 de lista vacía o un timeout no demuestran ausencia de mensajes ni de envíos.

Fuentes: [multi-tenant](https://docs.zernio.com/multi-tenant), [Profiles](https://docs.zernio.com/guides/profiles), [precios](https://docs.zernio.com/pricing), [cálculo de facturación](https://docs.zernio.com/billing), [límites](https://docs.zernio.com/guides/rate-limits), [planes Metricool](https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u), [webhooks](https://docs.zernio.com/webhooks/inbox).

## 07 · Qué falta para afirmar «sustituye todo»

La investigación resuelve la viabilidad y los puntos de riesgo. La confirmación operativa total necesita una migración piloto, que no hemos ejecutado en esta revisión.

| Paso | Evidencia de salida que exigimos |
| --- | --- |
| 1. Cerrar inventario real | Marcas/canales activos de Metricool y SHA desplegado; aclarar LinkedIn personal, ads y privados Meta. |
| 2. Mapear sin perder historial | Marca interna ↔ perfiles/cuentas/IDs nativos. Ninguna conversación duplicada ni cruce de clientes. |
| 3. Leer en paralelo | Mismos casos reales por canal, todas las páginas e hilos; investigar diferencias y errores parciales. |
| 4. Probar salida controlada | Respuesta humana, aprobación IA, auto-reply y recordatorio; texto, adjunto, hilo y errores. Solo un proveedor envía. |
| 5. Validar de extremo a extremo | Recibir, mostrar, responder, releer respuesta y conservar autor/estado. Escritorio y móvil, sin errores inesperados. |
| 6. Cortar por cuenta | Activación gradual y vuelta atrás disponible; retirar Metricool únicamente cuando no queden rutas dependientes. |

**Aceptación mínima por canal:** identidad correcta; lectura con datos reales; envío confirmado en origen; respuestas anidadas; paginación; adjuntos que usa el producto; respeto de ventanas; reintentos sin duplicar; privacidad entre marcas; mensajes históricos sin disparar IA ni recordatorios nuevos.

No asignamos un porcentaje de paridad ni una fecha de entrega: sin el inventario productivo y sin el piloto serían cifras inventadas. Tampoco una cuenta conectada o una documentación positiva sustituyen una prueba de salida real.

**Mi recomendación:** avanzar con Zernio como sustituto del proveedor Metricool en Repliyo, empezando por los canales ya accesibles. Mantener Metricool durante la validación. La evidencia apoya la dirección técnica; todavía no demuestra la condición comercial de «todo funciona igual y ya podemos cancelar».

### Registro de evidencia para continuar

- Código remoto: `fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888`. Checkout local inicialmente `e8c3491`; no usarlo como producción sin contraste.
- API base verificada: `https://zernio.com/api/v1`. Las notas locales de junio no son contrato actual.
- Endpoints de lectura: `/accounts`, `/profiles`, `/usage`, `/billing`, `/inbox/conversations`, `/inbox/comments`, `/inbox/comments/{postId}`, `/accounts/{accountId}/gmb-reviews`, `/webhooks/settings`.
- No se guardan claves, textos de mensajes, nombres de interlocutores ni contenido de reseñas en este informe. Los conteos de muestra no son un censo del historial.

Documento preparado por Inpulza. Fuentes consultadas el 22/09/2026; condiciones y capacidades sujetas a cambios posteriores.


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

