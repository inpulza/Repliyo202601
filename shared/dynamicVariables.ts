export interface DynamicVariable {
  key: string;
  placeholder: string;
  description: string;
  example: string;
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
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
];

export type VariableKey = typeof DYNAMIC_VARIABLES[number]['key'];
