export interface DynamicVariable {
  key: string;
  placeholder: string;
  description: string;
  example: string;
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  {
    key: 'first_name',
    placeholder: '{{first_name}}',
    description: 'Primer nombre detectado del usuario (extraído del username o nombre de display)',
    example: 'Jordan',
  },
  {
    key: 'interaction_mode',
    placeholder: '{{interaction_mode}}',
    description: 'Tipo de interacción: "reply" (respuesta normal) o "reminder" (follow-up automático)',
    example: 'reminder',
  },
  {
    key: 'reminder_number',
    placeholder: '{{reminder_number}}',
    description: 'Número del recordatorio (1, 2, etc.) - Solo aplica cuando interaction_mode es "reminder"',
    example: '1',
  },
  {
    key: 'username',
    placeholder: '{{username}}',
    description: 'Nombre o @handle del usuario (con @ en Instagram/TikTok)',
    example: '@jordanldp',
  },
  {
    key: 'platform',
    placeholder: '{{platform}}',
    description: 'Nombre de la red social',
    example: 'instagram',
  },
  {
    key: 'comment',
    placeholder: '{{comment}}',
    description: 'Contenido del mensaje o comentario a responder',
    example: 'Me encanta este producto!',
  },
  {
    key: 'post_context',
    placeholder: '{{post_context}}',
    description: 'Contexto del post original (vacío si es DM)',
    example: 'Post sobre nuevos productos de verano',
  },
  {
    key: 'is_dm',
    placeholder: '{{is_dm}}',
    description: 'Si es mensaje directo (true) o comentario (false)',
    example: 'true',
  },
  {
    key: 'message_type',
    placeholder: '{{message_type}}',
    description: 'Tipo de mensaje: "dm" para mensajes directos, "comment" para comentarios',
    example: 'dm',
  },
  {
    key: 'time_since_last_interaction',
    placeholder: '{{time_since_last_interaction}}',
    description: 'Minutos desde la última respuesta de la marca en esta conversación',
    example: '15',
  },
  {
    key: 'conversation_depth',
    placeholder: '{{conversation_depth}}',
    description: 'Número total de mensajes en la conversación',
    example: '8',
  },
  {
    key: 'relationship_status',
    placeholder: '{{relationship_status}}',
    description: 'Estado de la relación: "new" (nuevo), "active" (activo), "reengagement" (retomando)',
    example: 'active',
  },
];

export const PRIVATE_REPLY_VARIABLES: DynamicVariable[] = [
  {
    key: 'username',
    placeholder: '{{username}}',
    description: 'Nombre completo del usuario que comentó',
    example: 'Melva Vidal',
  },
  {
    key: 'first_name',
    placeholder: '{{first_name}}',
    description: 'Primer nombre del usuario',
    example: 'Melva',
  },
  {
    key: 'comment',
    placeholder: '{{comment}}',
    description: 'Texto del comentario que dejó el usuario',
    example: 'Me interesa, más info por favor',
  },
  {
    key: 'post_context',
    placeholder: '{{post_context}}',
    description: 'Información del post/reel/video donde comentó (tipo de contenido, tema, caption)',
    example: 'Reel de Facebook sobre automatización con IA para negocios',
  },
];

export type VariableKey = typeof DYNAMIC_VARIABLES[number]['key'];
