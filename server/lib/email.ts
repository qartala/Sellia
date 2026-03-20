import nodemailer from 'nodemailer';
import { getDb } from '../db.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

export function getSmtpConfig(): SmtpConfig | null {
  try {
    const db = getDb();
    const get = (key: string) => (db.prepare('SELECT value FROM global_settings WHERE key = ?').get(key) as any)?.value;

    const host = get('smtp_host');
    const user = get('smtp_user');
    const pass = get('smtp_pass');
    const enabled = get('smtp_enabled');

    if (!host || !user || !pass || enabled !== '1') return null;

    return {
      host,
      port: parseInt(get('smtp_port') || '587', 10),
      secure: get('smtp_secure') === '1',
      user,
      pass,
      fromName: get('smtp_from_name') || 'Sellia',
      fromEmail: get('smtp_from_email') || user,
      enabled: true,
    };
  } catch {
    return null;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn(`[Email] Skipped (SMTP not configured or disabled) → ${to}: ${subject}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`[Email] ✓ Sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] ✗ Failed to send to ${to}:`, err.message);
    return false;
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function bookingEmailHtml(opts: {
  leadName: string;
  fecha: string;
  horaInicio: string;
  titulo: string;
  descripcion?: string;
  forAdmin?: boolean;
}): string {
  const role = opts.forAdmin ? 'Se agendó una nueva cita en Sellia' : 'Tu cita ha sido confirmada';
  const greeting = opts.forAdmin
    ? `<p>Se ha agendado automáticamente una cita con <strong>${opts.leadName}</strong>.</p>`
    : `<p>Hola <strong>${opts.leadName}</strong>, tu cita ha sido confirmada exitosamente.</p>`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px; color: #111;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="font-size: 36px;">📅</span>
      <h2 style="margin: 8px 0; color: #6366f1;">${role}</h2>
    </div>
    ${greeting}
    <div style="background: #f0f0ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>📌 Cita:</strong> ${opts.titulo}</p>
      <p style="margin: 4px 0;"><strong>📆 Fecha:</strong> ${opts.fecha}</p>
      <p style="margin: 4px 0;"><strong>🕐 Hora:</strong> ${opts.horaInicio}</p>
      ${opts.descripcion ? `<p style="margin: 4px 0;"><strong>📝 Descripción:</strong> ${opts.descripcion}</p>` : ''}
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Enviado por Sellia · Tu plataforma de ventas con IA</p>
  </div>
</body>
</html>`;
}

export function saleEmailHtml(opts: { leadName: string; phone: string; forAdmin?: boolean }): string {
  if (!opts.forAdmin) {
    return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px; color: #111;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="font-size: 36px;">🎉</span>
      <h2 style="margin: 8px 0; color: #22c55e;">¡Gracias por tu compra, ${opts.leadName}!</h2>
    </div>
    <p>Tu compra ha sido registrada exitosamente. En breve nos pondremos en contacto contigo para coordinar los próximos pasos.</p>
    <div style="background: #f0fff4; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>👤 Nombre:</strong> ${opts.leadName}</p>
      <p style="margin: 4px 0;"><strong>📱 WhatsApp:</strong> +${opts.phone}</p>
    </div>
    <p>Si tienes alguna pregunta, escríbenos directamente por WhatsApp.</p>
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Enviado por Sellia · Tu plataforma de ventas con IA</p>
  </div>
</body>
</html>`;
  }
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px; color: #111;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="font-size: 36px;">🎉</span>
      <h2 style="margin: 8px 0; color: #22c55e;">¡Venta Cerrada!</h2>
    </div>
    <p>El agente IA de Sellia cerró exitosamente una venta con <strong>${opts.leadName}</strong> (WhatsApp: +${opts.phone}).</p>
    <div style="background: #f0fff4; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>👤 Cliente:</strong> ${opts.leadName}</p>
      <p style="margin: 4px 0;"><strong>📱 WhatsApp:</strong> +${opts.phone}</p>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Enviado por Sellia · Tu plataforma de ventas con IA</p>
  </div>
</body>
</html>`;
}

export function newLeadEmailHtml(opts: { leadName: string; phone: string; channel: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px; color: #111;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="font-size: 36px;">📱</span>
      <h2 style="margin: 8px 0; color: #6366f1;">Nuevo Lead Recibido</h2>
    </div>
    <p>Un nuevo contacto inició una conversación en <strong>${opts.channel}</strong>.</p>
    <div style="background: #f0f0ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>👤 Nombre:</strong> ${opts.leadName}</p>
      <p style="margin: 4px 0;"><strong>📱 WhatsApp:</strong> +${opts.phone}</p>
      <p style="margin: 4px 0;"><strong>📡 Canal:</strong> ${opts.channel}</p>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Enviado por Sellia · Tu plataforma de ventas con IA</p>
  </div>
</body>
</html>`;
}
