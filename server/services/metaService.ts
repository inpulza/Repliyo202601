import { log } from "../app";

const META_API_VERSION = "v19.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface PrivateReplyResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
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

      // Map known errors to friendlier messages
      let userFriendlyError = errMsg;
      if (errMsg?.includes("missing permissions") || errMsg?.includes("does not exist") || errMsg?.includes("Unsupported")) {
        userFriendlyError = `El token de la página no tiene el permiso 'pages_messaging'. Ve a Meta Developers → tu App → App Review → Permisos, agrega 'pages_messaging' y vuelve a intentarlo. Error original: ${errMsg}`;
      } else if (errCode === 100 || errMsg?.includes("outside of")) {
        userFriendlyError = "El comentario tiene más de 7 días o ya se envió una respuesta privada a este comentario.";
      } else if (errCode === 200 || errMsg?.includes("permission")) {
        userFriendlyError = `Permiso denegado. Asegúrate de que el token tenga 'pages_messaging'. Error: ${errMsg}`;
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
}> {
  try {
    // Step 1: Validate token by fetching basic page info
    const targetId = pageId || 'me';
    const meUrl = `${META_API_BASE}/${targetId}?fields=id,name,category&access_token=${pageAccessToken}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json() as any;

    if (meData.error) {
      return { hasMessaging: false, permissions: [], error: meData.error.message };
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
