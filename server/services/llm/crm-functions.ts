import { storage } from "../../storage";
import { log } from "../../app";
import { parsePhoneNumber } from 'libphonenumber-js';

function normalizePhoneNumber(phone: string): string | null {
  const cleanDigits = phone.replace(/[^0-9+]/g, '');

  if (cleanDigits.replace(/\D/g, '').length < 7 || cleanDigits.replace(/\D/g, '').length > 15) {
    return null;
  }

  try {
    const parsed = parsePhoneNumber(cleanDigits.startsWith('+') ? cleanDigits : cleanDigits, 'US');
    if (parsed.isValid()) {
      log(`[CRM-Functions] Phone validated via libphonenumber: "${phone}" → "${parsed.number}" (country: ${parsed.country})`, "crm");
      return parsed.number;
    }
  } catch (e: any) {
    log(`[CRM-Functions] Phone parse attempt failed for "${phone}": ${e.message}`, "crm");
  }

  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return null;
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  log(`[CRM-Functions] Phone normalized via fallback: "${phone}" → "+${digitsOnly}"`, "crm");
  return `+${digitsOnly}`;
}

export interface CrmFunctionCall {
  function: string;
  params: Record<string, any>;
}

export interface CrmFunctionResult {
  success: boolean;
  function: string;
  message: string;
  data?: any;
}

export const CRM_FUNCTIONS_SCHEMA = `
<crm_functions>
Si durante la conversación detectas información valiosa del cliente, puedes extraerla usando este formato adicional en tu respuesta JSON.

FUNCIONES DISPONIBLES:
1. update_contact - Actualiza datos básicos del contacto
   Campos: firstName, lastName, email, phone, city, country, language

2. set_custom_field - Guarda datos personalizados extraídos de la conversación
   Campos: fieldName (nombre del campo), value (valor)
   Ejemplos: servicio_interes, presupuesto, tipo_negocio, fecha_cita, notas

3. update_status - Cambia el estado del lead en el CRM
   Estados: lead (nuevo contacto), qualified (interesado confirmado), customer (cliente), churned (perdido)

4. update_lifecycle - Cambia la etapa del ciclo de vida
   Etapas: new, engaged, converted, retained

FORMATO DE EXTRACCIÓN (agregar solo si detectas datos):
{
  "thought": "...",
  "reply": "...",
  "crm_actions": [
    {"function": "set_custom_field", "params": {"fieldName": "servicio_interes", "value": "Taxes"}},
    {"function": "update_contact", "params": {"city": "Miami"}}
  ]
}

REGLAS:
- Solo extrae información que el cliente proporcione explícitamente
- No inventes datos, solo captura lo que mencionen
- Prioriza: email, teléfono, intereses de servicio, ubicación
- Si no hay datos nuevos, omite "crm_actions" completamente
</crm_functions>
`;

export async function executeCrmFunctions(
  contactId: string | undefined,
  functions: CrmFunctionCall[]
): Promise<CrmFunctionResult[]> {
  const results: CrmFunctionResult[] = [];

  if (!contactId) {
    log(`[CRM-Functions] No contactId provided, skipping function execution`, "crm");
    return results;
  }

  for (const fn of functions) {
    try {
      const result = await executeSingleFunction(contactId, fn);
      results.push(result);
      log(`[CRM-Functions] Executed ${fn.function}: ${result.message}`, "crm");
    } catch (error: any) {
      results.push({
        success: false,
        function: fn.function,
        message: `Error: ${error.message}`,
      });
      log(`[CRM-Functions] Error executing ${fn.function}: ${error.message}`, "crm");
    }
  }

  return results;
}

async function executeSingleFunction(
  contactId: string,
  fn: CrmFunctionCall
): Promise<CrmFunctionResult> {
  switch (fn.function) {
    case "update_contact": {
      const allowedFields = ["firstName", "lastName", "email", "phone", "city", "country", "language"];
      const updates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(fn.params)) {
        if (allowedFields.includes(key) && value) {
          if (key === 'phone' && typeof value === 'string') {
            const normalized = normalizePhoneNumber(value);
            if (normalized) {
              updates[key] = normalized;
              log(`[CRM-Functions] Phone normalized: "${value}" → "${normalized}"`, "crm");
            } else {
              log(`[CRM-Functions] Phone rejected (invalid format): "${value}"`, "crm");
            }
          } else {
            updates[key] = value;
          }
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return { success: false, function: fn.function, message: "No valid fields to update" };
      }
      
      const updated = await storage.updateCrmContact(contactId, updates);
      return {
        success: !!updated,
        function: fn.function,
        message: updated ? `Updated: ${Object.keys(updates).join(", ")}` : "Contact not found",
        data: updates,
      };
    }

    case "set_custom_field": {
      const { fieldName, value } = fn.params;
      if (!fieldName || value === undefined) {
        return { success: false, function: fn.function, message: "Missing fieldName or value" };
      }
      
      const updated = await storage.updateCrmContactCustomField(contactId, fieldName, value);
      return {
        success: !!updated,
        function: fn.function,
        message: updated ? `Set ${fieldName} = ${value}` : "Contact not found",
        data: { fieldName, value },
      };
    }

    case "update_status": {
      const { status } = fn.params;
      const validStatuses = ["lead", "qualified", "customer", "churned"];
      
      if (!validStatuses.includes(status)) {
        return { success: false, function: fn.function, message: `Invalid status: ${status}` };
      }
      
      const updated = await storage.updateCrmContact(contactId, { status });
      return {
        success: !!updated,
        function: fn.function,
        message: updated ? `Status updated to: ${status}` : "Contact not found",
        data: { status },
      };
    }

    case "update_lifecycle": {
      const { stage } = fn.params;
      const validStages = ["new", "engaged", "converted", "retained"];
      
      if (!validStages.includes(stage)) {
        return { success: false, function: fn.function, message: `Invalid stage: ${stage}` };
      }
      
      const updated = await storage.updateCrmContact(contactId, { lifecycleStage: stage });
      return {
        success: !!updated,
        function: fn.function,
        message: updated ? `Lifecycle updated to: ${stage}` : "Contact not found",
        data: { stage },
      };
    }

    default:
      return { success: false, function: fn.function, message: `Unknown function: ${fn.function}` };
  }
}

export function parseCrmActionsFromResponse(response: string): CrmFunctionCall[] {
  try {
    const parsed = JSON.parse(response);
    if (parsed.crm_actions && Array.isArray(parsed.crm_actions)) {
      return parsed.crm_actions.filter(
        (action: any) => action.function && action.params
      );
    }
  } catch {
  }
  return [];
}
