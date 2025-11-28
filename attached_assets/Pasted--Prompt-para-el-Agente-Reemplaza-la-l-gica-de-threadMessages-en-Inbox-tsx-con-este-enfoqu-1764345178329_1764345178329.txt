// Prompt para el Agente:
// Reemplaza la lógica de 'threadMessages' en 'Inbox.tsx' con este enfoque recursivo
// para solucionar el problema de los mensajes anidados que aparecen desordenados.

const threadMessages = React.useMemo(() => {
  if (!activeConversationMessages?.length) return [];

  // 1. Mapa de búsqueda rápida (ID -> Mensaje)
  const messageMap = new Map();
  activeConversationMessages.forEach(m => messageMap.set(m.id, m));

  // 2. Mapa de Relaciones (ParentID -> Array de Hijos)
  const childrenMap = new Map<string, typeof activeConversationMessages>();
  const rootMessages: typeof activeConversationMessages = [];

  activeConversationMessages.forEach(m => {
    if (m.parentMessageId) {
      // Es hijo: lo añadimos a la lista de hijos de su padre
      const siblings = childrenMap.get(m.parentMessageId) || [];
      siblings.push(m);
      childrenMap.set(m.parentMessageId, siblings);
    } else {
      // Es raíz (Post original): va a la lista principal
      rootMessages.push(m);
    }
  });

  // 3. Función Recursiva para aplanar el árbol en orden
  const flattened: typeof activeConversationMessages = [];

  const addMessageAndChildren = (message: typeof activeConversationMessages[0]) => {
    // A. Añadir el mensaje actual
    flattened.push(message);

    // B. Buscar hijos de este mensaje
    const children = childrenMap.get(message.id) || [];
    
    // C. Ordenar hijos (opcional: por fecha) para que se lean en orden cronológico
    children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // D. RECURSIVIDAD: Procesar cada hijo igual (añadirlo y buscar sus propios hijos)
    children.forEach(child => addMessageAndChildren(child));
  };

  // 4. Ejecutar proceso iniciando desde los Roots
  // Ordenar roots primero (por si hay múltiples hilos principales, raro pero posible)
  rootMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  rootMessages.forEach(root => addMessageAndChildren(root));

  // 5. Manejo de Huérfanos (Safety Net)
  // Si un mensaje tiene parentId pero el padre NO existe en el array (ej. error de sync),
  // la lógica de arriba lo ignoraría. Aquí los recuperamos y ponemos al final.
  const processedIds = new Set(flattened.map(m => m.id));
  const orphans = activeConversationMessages.filter(m => !processedIds.has(m.id));
  
  return [...flattened, ...orphans];

}, [activeConversationMessages]);