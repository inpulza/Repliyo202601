import { Resend } from 'resend';
import type { Lead } from '@shared/schema';

let connectionSettings: any;

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendVerificationEmail(email: string, name: string, code: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail || 'Repliyo <noreply@repliyo.com>',
      to: email,
      subject: `Tu código de verificación: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                </svg>
              </div>
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 16px 0 8px;">Repliyo</h1>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 600; color: #111827; text-align: center; margin-bottom: 8px;">
              ¡Hola${name ? `, ${name}` : ''}!
            </h2>
            <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">
              Ingresa el siguiente código para verificar tu cuenta:
            </p>
            
            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: 'SF Mono', Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">
                ${code}
              </span>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-bottom: 8px;">
              Este código expira en <strong style="color: #6b7280;">10 minutos</strong>.
            </p>
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Si no solicitaste este código, puedes ignorar este email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Repliyo. Todos los derechos reservados.
            </p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('[EmailService] Verification email sent:', { email, messageId: result.data?.id });
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send verification email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'Repliyo <noreply@repliyo.com>',
      to: email,
      subject: '¡Bienvenido a Repliyo!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                </svg>
              </div>
            </div>
            
            <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 16px;">
              ¡Bienvenido a Repliyo, ${name}!
            </h1>
            
            <p style="color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 32px;">
              Tu cuenta ha sido verificada exitosamente. Estás listo para comenzar a gestionar 
              todas tus conversaciones de redes sociales desde un solo lugar.
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="https://repliyo.com/app/inbox" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                Ir al Inbox
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Repliyo. Todos los derechos reservados.
            </p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('[EmailService] Welcome email sent:', { email });
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send welcome email:', error);
    return false;
  }
}

export async function sendLeadNotification(lead: Lead): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    const platformsList = lead.platforms?.join(', ') || 'Not specified';
    const goalsList = lead.goals?.join(', ') || 'Not specified';

    await client.emails.send({
      from: fromEmail || 'Repliyo <noreply@repliyo.com>',
      to: ['clientes@repliyo.com', 'inpulza.solutions@gmail.com'],
      subject: `New Lead: ${lead.name} - ${lead.companyName || 'No company'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                </svg>
              </div>
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 16px 0 8px;">New Lead Received</h1>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151; width: 40%;">Name</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Email</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Phone/WhatsApp</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.phone || 'Not provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Role</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.role || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Company</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.companyName || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Industry</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.industry || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Team Size</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.teamSize || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Country</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.country || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Platforms</td>
                <td style="padding: 12px 8px; color: #6b7280;">${platformsList}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Monthly Volume</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.monthlyVolume || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Brand Accounts</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.brandCount || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Goals</td>
                <td style="padding: 12px 8px; color: #6b7280;">${goalsList}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Pain Point</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.painPoint || 'Not specified'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Current Tools</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.currentTools || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 8px; font-weight: 600; color: #374151;">Source</td>
                <td style="padding: 12px 8px; color: #6b7280;">${lead.source || 'website'}</td>
              </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              &copy; ${new Date().getFullYear()} Repliyo. Lead captured at ${new Date().toISOString()}.
            </p>
          </div>
        </body>
        </html>
      `
    });

    console.log('[EmailService] Lead notification sent for:', lead.email);
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send lead notification:', error);
    return false;
  }
}

export async function sendLeadConfirmation(email: string, name: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    await client.emails.send({
      from: fromEmail || 'Repliyo <noreply@repliyo.com>',
      to: email,
      subject: 'Thanks for your interest in Repliyo!',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                </svg>
              </div>
            </div>

            <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 16px;">
              Thanks for reaching out, ${name}!
            </h1>

            <p style="color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 24px;">
              We've received your information and our team will get back to you within 24-48 hours to discuss how Repliyo can help your business.
            </p>

            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 8px;">Want to speed things up?</p>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Message us directly on WhatsApp for an instant response.
              </p>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="https://wa.me/17864346163" style="display: inline-block; background: #25D366; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                Chat on WhatsApp
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              &copy; ${new Date().getFullYear()} Repliyo. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    console.log('[EmailService] Lead confirmation sent to:', email);
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send lead confirmation:', error);
    return false;
  }
}
