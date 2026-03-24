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
      log(`${logPrefix} Error: ${errMsg} (code ${errCode})`, "sync");
      return { success: false, error: errMsg, errorCode: errCode };
    }

    log(`${logPrefix} Private reply sent successfully. ID: ${data.id}`, "sync");
    return { success: true, messageId: data.id };
  } catch (err: any) {
    log(`${logPrefix} Exception: ${err.message}`, "sync");
    return { success: false, error: err.message };
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
