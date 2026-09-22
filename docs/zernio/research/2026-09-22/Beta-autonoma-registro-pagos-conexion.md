# Repliyo: beta autónoma con Zernio y Stripe
Investigación del 22/09/2026 · Propuesta, no implementación · Tres agentes especializados y revisión de documentación oficial y main remoto.

## 1. Dictamen y opción recomendada
**Sí: podemos construir una beta en la que el cliente se registre, pague y conecte sus redes sin que Jordan cree cada cuenta.** Zernio documenta el modelo SaaS: nuestro servidor usa su API, asigna un profile al cliente y genera la autorización de su red. El cliente entra con sus credenciales de Facebook, Instagram, Google u otra plataforma; no necesita entrar como Jordan ni ser invitado al equipo Zernio. Esto es capacidad documentada, todavía no un recorrido probado en Repliyo. [Zernio para plataformas](https://docs.zernio.com/multi-tenant).

Recomiendo conservar la base de autenticación de Repliyo, añadir admisión automática con cupos, ofrecer acceso por código de email y usar **Stripe Checkout + Billing + Customer Portal**, junto al **OAuth estándar alojado de Zernio**. La versión headless con selectores propios puede venir después. Zernio resuelve la conexión social; Repliyo debe construir la admisión, identidad, permisos, cobro y recuperación del onboarding.

| Responsabilidad | Sistema propuesto |
|---|---|
| Quién entra a la beta y cuántas plazas hay | Repliyo: invitaciones y cupos |
| Identidad y sesión del usuario | Repliyo: email verificado; OTP de login por desarrollar |
| Consentimiento para acceder a una red | Plataforma social, mediante conexión Zernio |
| Suscripción, tarjeta, facturas y cancelación | Stripe, vinculado a la marca de Repliyo |
| Acceso efectivo y límites de mensajes/IA | Repliyo, comprobados en servidor |

**Recomendación de lanzamiento:** una marca por cliente, canales expresamente validados y un plan sencillo con límites. Mantener el modelo preparado para varios profiles por marca. La autonomía del alta no demuestra que Zernio sustituya ya toda la integración Metricool: los cambios de transporte y el piloto por canal siguen siendo requisitos separados.

## 2. Qué hace Repliyo hoy y qué falta
Se revisó main remoto en SHA `fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888`. No se verificó el SHA desplegado. Las referencias señalan código, no comportamiento comprobado en producción.

| Área | Evidencia actual | Trabajo necesario |
|---|---|---|
| Registro | [routes.ts:230](https://github.com/inpulza/Repliyo202601/blob/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888/server/routes.ts#L230) devuelve 403; App.tsx:191 redirige /register a login | Admisión y pantalla de alta |
| Solicitud comercial | GetStarted.tsx:552–569 envía un lead | Crear cuenta y marca automáticamente |
| Email | routes.ts:285–405 verifica código y permite reenvío | Separar invitación de verificación y login |
| Login | routes.ts:408–467 usa email, contraseña y sesión | Añadir login OTP si se elige esa experiencia |
| Recuperación | Login.tsx:270–276 muestra Coming soon | Recuperación autónoma si se conserva contraseña |
| Marca | [schema.ts:14](https://github.com/inpulza/Repliyo202601/blob/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888/shared/schema.ts#L14) exige credenciales Metricool; alta admin-only | Desacoplar proveedor y aprovisionar marca |
| Redes | [Connections.tsx:152](https://github.com/inpulza/Repliyo202601/blob/fce35d51a4bc2b20e1c257c0e0fa44b2e1a50888/client/src/pages/Connections.tsx#L152) espera conexión previa en Metricool | Botón OAuth y reconexión Zernio |
| Pagos | No integración Stripe identificada en package, schema y rutas revisadas | Checkout, webhooks, portal, suscripciones y cuotas |

Activar solamente el registro existente no basta: el código latente crea usuario con `brandId:null`; verificar email no le asigna marca. El usuario sigue necesitando al administrador. El modelo actual tiene un brandId por usuario, sin una organización y membresías independientes.

Antes de exponer el alta hay que sustituir `Math.random()` en el código de verificación por un generador criptográfico, corregir respuestas que afirman envío aun cuando falla el correo y hacer atómico el consumo de invitación y creación de acceso. Resend está integrado; debe comprobarse aceptación real del proveedor y entrega transaccional. Estas son observaciones de revisión del código, no una auditoría exhaustiva de seguridad.

## 3. Invitaciones automáticas y easy login
**Tres códigos distintos cumplen trabajos distintos:** la invitación admite a la beta; el OTP demuestra control del email; OAuth concede permisos sobre una red. Ninguno sustituye a los otros.

Propongo que Jordan configure una campaña una vez: cupo, canales admitidos, duración y límites. El sistema acepta solicitudes mientras haya plaza, envía una invitación de uso único y pasa el resto a lista de espera. Si cualquiera recibe un código sin restricción, la beta sería pública con verificación de email, aunque la interfaz la llamase cerrada.

La invitación debe ser aleatoria, almacenarse como hash, caducar y reservar/consumir su plaza de forma transaccional. Puede quedar vinculada al email destinatario. Los reintentos y aperturas repetidas recuperan el mismo onboarding. No reutilizar los publicAccessTokens existentes: corresponden a compartir contactos, no a crear usuarios.

**Para easy login recomiendo email + código de un uso.** Evita gestionar una contraseña y funciona cuando se abre el correo desde otro dispositivo. Repliyo tiene verificación de email reutilizable, pero todavía no tiene ese login passwordless completo. Requiere límites de intentos y reenvíos, respuestas que no revelen si existe una cuenta, caducidad y sesiones seguras. Si se mantiene contraseña en una primera entrega, debe añadirse recuperación sin intervención del administrador.

No recomiendo cambiar de proveedor de autenticación como requisito de Zernio. Clerk o Supabase podrían aportar acceso passwordless, pero introducirían una migración adicional. Por ejemplo, Supabase documenta que OTP puede crear usuarios por defecto: aun usando un servicio externo, la admisión de beta debe imponerse en servidor. [OTP y magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [control previo a creación](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## 4. Conectar redes sin pasar por Jordan
El flujo recomendado comienza con un botón **Conectar mi cuenta** en Repliyo. Nuestro backend determina la marca y profile permitidos, obtiene la URL OAuth, el cliente autoriza en su red y regresa a Repliyo. Cuando existe selección de página, organización o local, Zernio puede alojarla. Headless permite construir ese selector nosotros; no elimina el consentimiento de la red ni garantiza ocultar la marca de la aplicación OAuth. [Guía de conexión](https://docs.zernio.com/guides/connecting-accounts).

El cliente debe tener los permisos necesarios sobre su página o negocio. Jordan sigue siendo operador de la integración y responsable de su facturación, pero no tiene que participar en la conexión normal de cada cliente. Las invitaciones al equipo Zernio son otra función y no hacen falta para este recorrido.

**Aislamiento:** guardar marca → profiles → cuentas; la API key de equipo permanece en backend. No aceptar profileId arbitrario desde el navegador. Vincular cada intento a usuario, marca, canal y nonce; verificar la cuenta mediante API antes de considerarla conectada. No confiar solo en el parámetro de éxito de la URL. El callback debe limpiar datos temporales y excluirlos de logs y analítica. Son requisitos de diseño propuestos.

**Límite pendiente de aclaración:** la guía multi-tenant muestra varias cuentas del mismo canal en un profile, pero [Profiles](https://docs.zernio.com/guides/profiles) dice una por plataforma y sustitución al conectar otra. La [referencia Connect](https://docs.zernio.com/connect/get-connect-url) advierte que cambiar de cuenta TikTok puede eliminar histórico. Diseñar varios profiles/slots por cliente y separar añadir de reconectar; no prometer varias cuentas iguales en un profile.

WhatsApp requiere un recorrido específico con Meta Business, control del número y, según modalidad, QR. El signup alojado permite cierta personalización y conserva el logo Zernio. Puede hacerlo el cliente, pero no es un login social trivial. Lo dejaría en una segunda etapa tras validar un canal más sencillo. [Conexión WhatsApp](https://docs.zernio.com/platforms/whatsapp/connection).

## 5. Pagos, activación y webhooks
**Stripe Connect no es necesario para cobrar la suscripción propia de Repliyo.** Stripe lo distingue del caso en que una plataforma facilita cobros de sus clientes a terceros. Recomiendo Checkout para contratar, Billing para suscripción y Customer Portal para facturas, tarjeta y cancelación. [SaaS y Connect](https://docs.stripe.com/connect/saas), [suscripciones](https://docs.stripe.com/billing/subscriptions/build-subscriptions).

El portal no sustituye al login de Repliyo: el backend crea su sesión solo para el customer de la marca autenticada y un usuario con permiso de facturación. Cambiar el email de facturación no debe cambiar la identidad de acceso. [Integrar Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal).

Para esta beta recomiendo: **plaza → email verificado → marca pendiente → conectar y comprobar lectura → Checkout → activar plan y sincronización**. Así el cliente descubre incompatibilidades antes de pagar. La contrapartida es que una conexión previa al cobro puede generar coste Zernio: imponer cupo de altas, consumo mínimo y caducidad de onboarding, con política comunicada antes de implementar una desconexión. Cobrar primero reduce ese coste, pero exige resolver altas pagadas cuya red no puede conectarse.

| Evento o estado | Comportamiento propuesto |
|---|---|
| Checkout abierto o pago incomplete | Permitir completar alta, sin consumo del plan |
| Pago confirmado y acceso vigente | Activar límites contratados |
| Trial concedido | Cuotas y vencimiento explícitos |
| Impago past_due | Aviso y portal; periodo de gracia definido |
| Cancelación al fin de periodo | Mantener acceso hasta vencimiento |
| Cancelación efectiva/unpaid | Bloquear operaciones de pago; permitir gestión de cuenta |
| Red desconectada | Reconexión autónoma; estado separado del pago |

No activar acceso por volver a la página de éxito. Verificar firmas Stripe sobre cuerpo original, deduplicar eventos y reconciliar su estado actual: pueden repetirse o llegar desordenados. Un active aislado no prueba todas las facturas pagadas. [Webhooks](https://docs.stripe.com/webhooks), [eventos de suscripción](https://docs.stripe.com/billing/subscriptions/webhooks).

## 6. Complejidad real, fases y pruebas de salida
No hace falta configurar un webhook por cliente. Repliyo puede recibir eventos del equipo Zernio y resolver la marca por su mapeo; Stripe utiliza su propio receptor. La complejidad está en coordinar estados recuperables y evitar duplicados, no en que Jordan autorice cada alta.

Guardar intentos y operaciones con identificadores únicos: invitación, marca, profile, customer Stripe y suscripción. Si se cierra el navegador, se repite un webhook o llegan primero el callback y después el evento, se recupera el mismo proceso. Zernio documenta eventos de conexión/reconexión; la desconexión puede notificarse con retraso, así que añadir reconciliación y comprobación de salud. [Eventos de cuentas](https://docs.zernio.com/webhooks/accounts).

| Fase recomendada | Resultado verificable |
|---|---|
| 1. Acceso autónomo | Invitación automática, email, marca y recuperación sin admin |
| 2. Un canal Zernio | Conectar/reconectar y lectura aislada entre dos clientes |
| 3. Suscripción | Checkout y portal con renovación, impago y cancelación probados |
| 4. Beta limitada | Cupo, costes, mensajes y soporte medidos antes de ampliar |
| 5. Más canales | Piloto por canal; WhatsApp y headless según necesidad |

Pruebas indispensables antes de abrir: invitación caducada/reutilizada, código erróneo, fallo de email, dos altas concurrentes, acceso cruzado entre marcas, OAuth cancelado/caducado, permisos insuficientes, conexión de cuenta equivocada, reconexión, webhook duplicado/desordenado, cierre del navegador, pago fallido, renovación y cancelación. Las pruebas deben cubrir móvil y escritorio y registrar el SHA del despliegue. El envío real requiere un piloto expresamente autorizado.

La integración queda condicionada también por capacidad y facturación del equipo Zernio: un bloqueo del proveedor puede afectar a varios clientes. La medición HTTP del anexo API es de lecturas; no estima duración del consentimiento, tiempo de webhook ni rendimiento de altas concurrentes.

**Conclusión:** la opción concreta es Repliyo con admisión y login propios, Stripe para su suscripción y Zernio OAuth alojado para redes. Permite quitar la intervención manual del recorrido habitual. Está investigado y documentado; no se han creado usuarios, invitaciones, sesiones de cobro, profiles ni nuevas conexiones, ni se ha implementado o desplegado el flujo.
