import OpenAI from 'openai';
import { getDb } from '../db.js';

// ─── AI client ────────────────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  const db = getDb();
  const row = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
  const key = row?.value || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No hay clave de OpenAI configurada.');
  return new OpenAI({ apiKey: key });
}

// ─── Message type metadata ────────────────────────────────────────────────────

const MSG_META: Record<string, { timing: string; tone: string }> = {
  reminder_5d: {
    timing: 'faltan 5 días para el vencimiento',
    tone: 'amable y preventivo',
  },
  due_day: {
    timing: 'hoy es el día de vencimiento',
    tone: 'directo pero cordial',
  },
  late_3d: {
    timing: 'la cuota venció hace 3 días y no se registró pago',
    tone: 'preocupado, ofrece ayuda para coordinar',
  },
  late_7d: {
    timing: 'la cuota venció hace 7 días sin respuesta',
    tone: 'más serio, menciona posible impacto en el caso sin ser agresivo',
  },
  late_15d: {
    timing: 'la cuota venció hace 15 días sin pago',
    tone: 'firme y claro, informa suspensión del servicio hasta regularizar',
  },
};

// ─── Fallback static templates (used when AI is unavailable) ─────────────────

const FALLBACK_TEMPLATES: Record<string, (name: string, installNum: number, amount: string, dueDate: string, payLink: string, bankInfo: string) => string> = {
  reminder_5d: (name, installNum, amount, dueDate, payLink) =>
    `Hola ${name} 👋 Te recordamos que el próximo ${dueDate} vence tu cuota N°${installNum} por $${amount}.\n\nPuedes pagar por transferencia, efectivo${payLink ? ` o con este link 👉 ${payLink}` : ''}.\n\nCualquier duda, estamos aquí. ¡Gracias!`,

  due_day: (name, installNum, amount, _dueDate, payLink, bankInfo) =>
    `Hola ${name}, hoy vence tu cuota N°${installNum} por $${amount}.\n\nPara mantener tu caso activo, te pedimos realizar el pago hoy.\n\n${payLink ? `🔗 Link de pago: ${payLink}\n` : ''}${bankInfo ? `🏦 Transferencia: ${bankInfo}\n` : ''}💵 Efectivo: coordina con nosotros\n\nUna vez pagado, envíanos el comprobante. ¡Gracias, ${name}!`,

  late_3d: (name, installNum, amount, dueDate, payLink) =>
    `Hola ${name}. Notamos que la cuota N°${installNum} de $${amount} venció el ${dueDate} y aún no registramos tu pago.\n\nSi tuviste algún inconveniente, conversemos 🙏 Escríbenos y lo coordinamos.\n\n${payLink ? `🔗 ${payLink}` : ''}`,

  late_7d: (name, installNum) =>
    `${name}, llevamos 7 días desde el vencimiento de tu cuota N°${installNum} y no hemos recibido respuesta.\n\nLa falta de pago puede afectar la continuidad de tu caso. Por favor, contáctanos hoy para regularizar o acordar una solución.`,

  late_15d: (name, installNum, amount, _dueDate, payLink, bankInfo) =>
    `Hola ${name}. Han pasado 15 días desde el vencimiento de tu cuota N°${installNum} por $${amount} sin que hayamos podido resolverlo.\n\nLa continuidad del servicio queda suspendida hasta regularizar el pago.\n\n${payLink ? `🔗 ${payLink}` : ''}${bankInfo ? `\n🏦 ${bankInfo}` : ''}\n\nEsperamos tu respuesta a la brevedad.`,
};

// ─── AI message generation ────────────────────────────────────────────────────

async function generateAIMessage(
  msgType: string,
  debtorName: string,
  installNum: number,
  amount: string,
  dueDate: string,
  payLink: string,
  bankInfo: string,
  collectionPrompt: string,
): Promise<string | null> {
  const meta = MSG_META[msgType];
  if (!meta) return null;

  try {
    const openai = getOpenAI();

    const paymentInfo = [
      payLink ? `Link de pago: ${payLink}` : null,
      bankInfo ? `Datos bancarios: ${bankInfo}` : null,
      'Efectivo (coordinar directamente)',
    ].filter(Boolean).join('\n');

    const systemPrompt = `Eres un asistente de cobranza por WhatsApp. Tu trabajo es redactar mensajes de cobro efectivos, humanos y en el tono correcto según el contexto.

${collectionPrompt ? `CONTEXTO DEL NEGOCIO:\n${collectionPrompt}\n` : ''}
REGLAS DE REDACCIÓN:
- Escribe SOLO el mensaje de WhatsApp, sin explicaciones ni metadatos.
- Usa lenguaje natural y cercano, como lo haría una persona real.
- Incluye emojis con moderación y solo donde aporten.
- Si hay link de pago o datos bancarios, inclúyelos de forma natural.
- El mensaje debe ser conciso: máximo 4-5 líneas.
- NO uses saludos corporativos como "Estimado cliente" o frases robóticas.`;

    const userPrompt = `Redacta un mensaje de WhatsApp para cobro de cuota con estas características:

- Contexto de timing: ${meta.timing}
- Tono requerido: ${meta.tone}
- Nombre del deudor: ${debtorName}
- Número de cuota: ${installNum}
- Monto: $${amount}
- Fecha de vencimiento: ${dueDate}
- Medios de pago disponibles:
${paymentInfo}

Escribe SOLO el mensaje, listo para enviar por WhatsApp.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (err: any) {
    console.warn(`[Collections] AI message generation failed for ${msgType}:`, err.message);
    return null;
  }
}

// ─── WhatsApp sender ──────────────────────────────────────────────────────────

async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, message: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
  }
}

// ─── Core scheduler logic ─────────────────────────────────────────────────────

export async function runCollectionScheduler(): Promise<void> {
  console.log('[Collections] Scheduler run started');
  const db = getDb();

  // Get all active payment plans with their WhatsApp config and AI collection prompt
  const plans = db.prepare(`
    SELECT pp.*, wc.phone_number_id, wc.access_token,
           kb.collection_prompt
    FROM payment_plans pp
    JOIN whatsapp_configs wc ON wc.user_id = pp.user_id
    LEFT JOIN knowledge_base kb ON kb.user_id = pp.user_id
    WHERE pp.status = 'active'
      AND pp.debtor_phone != ''
      AND wc.enabled = 1
  `).all() as any[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkedPlans = 0;

  for (const plan of plans) {
    try {
      // Get all pending + overdue installments for this plan
      const installments = db.prepare(`
        SELECT * FROM payment_installments
        WHERE plan_id = ? AND status IN ('pending', 'overdue')
        ORDER BY installment_number ASC
      `).all(plan.id) as any[];

      for (const installment of installments) {
        try {
          const dueDate = new Date(installment.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);

          // Get messages already sent for this installment
          const sentMessages = db.prepare(`
            SELECT message_type FROM collection_messages_sent WHERE installment_id = ?
          `).all(installment.id) as any[];
          const sentTypes = new Set(sentMessages.map((m: any) => m.message_type));

          // Mark overdue if past due
          if (daysDiff >= 1 && installment.status === 'pending') {
            db.prepare(`UPDATE payment_installments SET status = 'overdue' WHERE id = ?`).run(installment.id);
          }

          const amountStr = parseFloat(installment.amount).toFixed(2);
          const dueDateStr = installment.due_date;
          const payLink = plan.payment_link || '';
          const bankInfo = plan.bank_info || '';
          const name = plan.debtor_name;
          const installNum = installment.installment_number;
          const phone = plan.debtor_phone.replace(/^\+/, '');
          const collectionPrompt = plan.collection_prompt || '';

          // Determine which messages to send
          const toSend: string[] = [];
          if (daysDiff >= -5 && !sentTypes.has('reminder_5d')) toSend.push('reminder_5d');
          if (daysDiff >= 0 && !sentTypes.has('due_day')) toSend.push('due_day');
          if (daysDiff >= 3 && !sentTypes.has('late_3d')) toSend.push('late_3d');
          if (daysDiff >= 7 && !sentTypes.has('late_7d')) toSend.push('late_7d');
          if (daysDiff >= 15 && !sentTypes.has('late_15d')) toSend.push('late_15d');

          for (const msgType of toSend) {
            try {
              // Try AI generation first, fall back to static template
              let messageText = await generateAIMessage(
                msgType, name, installNum, amountStr, dueDateStr, payLink, bankInfo, collectionPrompt,
              );

              if (!messageText) {
                const template = FALLBACK_TEMPLATES[msgType];
                if (!template) continue;
                messageText = template(name, installNum, amountStr, dueDateStr, payLink, bankInfo);
              }

              await sendWhatsAppMessage(plan.phone_number_id, plan.access_token, phone, messageText);

              // Record that message was sent
              db.prepare(`
                INSERT INTO collection_messages_sent (installment_id, message_type)
                VALUES (?, ?)
              `).run(installment.id, msgType);

              console.log(`[Collections] Sent ${msgType} to ${phone} for plan ${plan.id} installment ${installNum}`);
            } catch (msgErr: any) {
              console.error(`[Collections] Failed to send ${msgType} to ${phone} for plan ${plan.id}:`, msgErr.message);
            }
          }
        } catch (installErr: any) {
          console.error(`[Collections] Error processing installment ${installment.id}:`, installErr.message);
        }
      }

      // If all installments are paid, mark plan as completed
      const remaining = db.prepare(`
        SELECT COUNT(*) as cnt FROM payment_installments
        WHERE plan_id = ? AND status != 'paid'
      `).get(plan.id) as any;

      if (remaining.cnt === 0 && installments.length > 0) {
        db.prepare(`UPDATE payment_plans SET status = 'completed' WHERE id = ?`).run(plan.id);
      }

      checkedPlans++;
    } catch (planErr: any) {
      console.error(`[Collections] Error processing plan ${plan.id}:`, planErr.message);
    }
  }

  console.log(`[Collections] Scheduler run complete — checked ${checkedPlans} plans`);
}

// ─── Start interval ───────────────────────────────────────────────────────────

export function startCollectionScheduler(): void {
  // Run immediately on start
  runCollectionScheduler().catch(err => console.error('[Collections] Initial run error:', err));

  // Then every 2 hours
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  setInterval(() => {
    runCollectionScheduler().catch(err => console.error('[Collections] Scheduled run error:', err));
  }, TWO_HOURS);

  console.log('[Collections] Scheduler started (interval: 2h)');
}
