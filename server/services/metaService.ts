import { log } from "../app";

const META_API_VERSION = "v19.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface PrivateReplyResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  tokenExpired?: boolean;
}

export interface TemplateContext {
  firstName?: string;
  username?: string;
  postContext?: string;
  comment?: string;
}

export async function sendPrivateReply(
  commentId: string,
  message: string,
  pageAccessToken: string
): Promise<PrivateReplyResult> {
  const logPrefix = "[MetaPrivateReply]";

  try {
    log(`${logPrefix} Sending private reply to comment ${commentId}`, "sync");

    const url = `${META_API_BASE}/${commentId}/private_replies`;
    log(`${logPrefix} URL: ${url}`, "sync");

    const body = new URLSearchParams({
      message,
      access_token: pageAccessToken,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json() as any;

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || `HTTP ${response.status}`;
      const errCode = data.error?.code;
      const errSubcode = data.error?.error_subcode;
      log(`${logPrefix} Error: ${errMsg} (code ${errCode}, subcode ${errSubcode})`, "sync");
      log(`${logPrefix} Full error response: ${JSON.stringify(data)}`, "sync");

      // Map known errors to friendlier messages (by code, not text — text is ambiguous)
      let userFriendlyError = errMsg;
      if (errCode === 190) {
        // 190 = token expired or invalid session
        userFriendlyError = `El token de acceso ha expirado. Ve a la configuración de Private Replies y reconecta la página con un token actualizado.`;
        return { success: false, error: userFriendlyError, errorCode: errCode, tokenExpired: true };
      } else if (errCode === 200) {
        // 200 = permission denied — token is missing pages_messaging
        userFriendlyError = `Permiso denegado: el token no tiene 'pages_messaging'. Ve a Meta Developers → tu App → Permisos y agrega 'pages_messaging'. Error: ${errMsg}`;
      } else if (errCode === 100 && errSubcode === 33) {
        // 100/33 = object not found — comment ID doesn't exist or is wrong platform
        userFriendlyError = `El comentario no se encontró en el API de Facebook (código 100/33). Posibles causas:\n• El comentario es de Instagram, no de Facebook (los Private Replies de Instagram aún no están habilitados)\n• El comentario fue eliminado\n• El ID del comentario tiene un formato incorrecto\n\nID usado: ${commentId}`;
      } else if (errCode === 100 && errMsg?.includes("outside of")) {
        // 7-day window expired
        userFriendlyError = "El comentario tiene más de 7 días o ya se envió una respuesta privada antes. Facebook solo permite Private Replies dentro de los primeros 7 días.";
      } else if (errMsg?.includes("admin") || errMsg?.includes("page owner")) {
        userFriendlyError = "No se puede enviar un Private Reply al administrador de la página (no puedes responderte a ti mismo).";
      }

      return { success: false, error: userFriendlyError, errorCode: errCode };
    }

    log(`${logPrefix} Private reply sent successfully. ID: ${data.id}`, "sync");
    return { success: true, messageId: data.id };
  } catch (err: any) {
    log(`${logPrefix} Exception: ${err.message}`, "sync");
    return { success: false, error: err.message };
  }
}

export async function checkPagePermissions(pageAccessToken: string, pageId?: string): Promise<{
  hasMessaging: boolean;
  permissions: string[];
  error?: string;
  pageName?: string;
  tokenExpired?: boolean;
}> {
  try {
    // Step 1: Validate token by fetching basic page info
    const targetId = pageId || 'me';
    const meUrl = `${META_API_BASE}/${targetId}?fields=id,name,category&access_token=${pageAccessToken}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json() as any;

    if (meData.error) {
      const isExpired = meData.error.code === 190;
      return {
        hasMessaging: false,
        permissions: [],
        error: isExpired
          ? "El token de acceso ha expirado. Reconecta la página con un token actualizado."
          : meData.error.message,
        tokenExpired: isExpired,
      };
    }

    // Step 2: Try /me/accounts to get tasks (works if we can infer messaging capability)
    // Since we verified above that the page exists, try fetching messaging settings
    const msgUrl = `${META_API_BASE}/${targetId}/subscribed_apps?access_token=${pageAccessToken}`;
    const msgRes = await fetch(msgUrl);
    const msgData = await msgRes.json() as any;

    // If subscribed_apps works without permission error → pages_manage_metadata OK
    // If it gives a permissions error, note it but don't fail the whole check
    const hasMessagingPermError = msgData.error?.code === 200 ||
      (msgData.error?.message || '').toLowerCase().includes('permission');

    // Step 3: Try sending to a clearly invalid comment to distinguish permission vs comment errors
    const testUrl = `${META_API_BASE}/000000000000000_000000000000000/private_replies`;
    const testBody = new URLSearchParams({ message: 'test', access_token: pageAccessToken });
    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: testBody.toString(),
    });
    const testData = await testRes.json() as any;

    // If error is about the object not existing (not about permissions) → token HAS messaging permission
    // Error codes: 100 = object doesn't exist, 200 = permission error
    const testErrCode = testData.error?.code;
    const testErrMsg = (testData.error?.message || '').toLowerCase();
    const hasMessaging = testErrCode === 100 ||
      testErrMsg.includes('does not exist') ||
      testErrMsg.includes('nonexisting') ||
      testErrMsg.includes('unsupported') ||
      (!testData.error); // Unlikely but handle success

    const notPermissionError = !testErrMsg.includes('permission') && testErrCode !== 200 && testErrCode !== 190;

    return {
      hasMessaging: hasMessaging || notPermissionError,
      pageName: meData.name,
      permissions: ['Token válido', meData.category || ''],
      error: (!hasMessaging && !notPermissionError && testData.error)
        ? `El token no tiene pages_messaging: ${testData.error.message}`
        : undefined,
    };
  } catch (err: any) {
    return { hasMessaging: false, permissions: [], error: err.message };
  }
}

function extractFirstName(displayName: string): string {
  if (!displayName) return "";
  const clean = displayName.replace(/^@/, "").trim();

  if (clean.includes(" ")) {
    const first = clean.split(/\s+/)[0];
    if (first && first.length >= 2 && first.length <= 20) {
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
  }

  if (/^[a-záéíóúñü]+$/i.test(clean) && clean.length >= 2 && clean.length <= 15) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  return clean.split(/[_\-\.]/)[0]
    ? clean.split(/[_\-\.]/)[0].charAt(0).toUpperCase() + clean.split(/[_\-\.]/)[0].slice(1).toLowerCase()
    : "";
}

export function interpolateTemplate(template: string, context: TemplateContext): string {
  const firstName = context.firstName || extractFirstName(context.username || "") || context.username || "";

  return template
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{username\}\}/gi, context.username || "")
    .replace(/\{\{post_context\}\}/gi, context.postContext || "")
    .replace(/\{\{comment\}\}/gi, context.comment || "");
}
