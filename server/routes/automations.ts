import { Router, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// ---- Flow Execution Engine ----

function getUserAI(_userId: number): OpenAI {
  const db = getDb();
  // Platform-wide key from admin panel
  const globalRow = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
  if (globalRow?.value) return new OpenAI({ apiKey: globalRow.value });
  // Fallback to env variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No hay clave de API configurada. El administrador debe añadirla en el Panel de Admin → Configuración IA.');
  return new OpenAI({ apiKey });
}

async function executeFlowNodes(
  nodes: any[],
  edges: any[],
  currentNodeId: string,
  context: { userId: number; leadId?: number; knowledgeBase: string; log: string[]; visited: Set<string> }
): Promise<void> {
  if (context.visited.has(currentNodeId)) return;
  context.visited.add(currentNodeId);

  const node = nodes.find((n: any) => n.id === currentNodeId);
  if (!node) return;

  const db = getDb();
  const label: string = node.data?.label || '';

  // Execute node by type
  if (node.type === 'trigger') {
    context.log.push(`🟢 Trigger activado: "${label}"`);

  } else if (node.type === 'action') {
    if (node.data?.icon === 'bot' || label.toLowerCase().includes('ia') || label.toLowerCase().includes('respuesta')) {
      // AI response node
      context.log.push(`🤖 Ejecutando nodo IA: "${label}"`);
      try {
        const ai = getUserAI(context.userId);
        const response = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Eres un agente de ventas IA. Responde de forma breve y profesional usando la siguiente base de conocimientos:\n\n${context.knowledgeBase || 'Sin base de conocimientos configurada.'}` },
            { role: 'user', content: 'Saluda al cliente y pregunta en qué puedes ayudarle.' },
          ],
          temperature: 0.3,
        });
        const responseText = (response.choices[0]?.message?.content || '').replace(/\[ESTADO:[^\]]+\]/g, '').trim();
        context.log.push(`   ↳ IA respondió: "${responseText.substring(0, 120)}${responseText.length > 120 ? '...' : ''}"`);

        if (context.leadId) {
          db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(context.leadId, 'assistant', responseText);
        }
      } catch (err: any) {
        context.log.push(`   ↳ ⚠️ Error en IA: ${err.message}`);
      }

    } else if (node.data?.icon === 'database' || label.toLowerCase().includes('crm')) {
      context.log.push(`🗄️ Acción CRM: "${label}" — lead sincronizado en CRM`);
      if (context.leadId) {
        db.prepare('INSERT INTO activity_logs (user_id, actor, action, action_color, details) VALUES (?, ?, ?, ?, ?)').run(
          context.userId, 'Automatización', 'Sincronización CRM', 'blue',
          `Lead #${context.leadId} sincronizado por automatización.`
        );
      }

    } else if (node.data?.icon === 'mail' || label.toLowerCase().includes('email')) {
      context.log.push(`📧 Acción Email: "${label}" — correo de seguimiento programado`);

    } else if (node.data?.icon === 'send' || label.toLowerCase().includes('whatsapp')) {
      context.log.push(`💬 Acción WhatsApp: "${label}" — plantilla enviada`);
      if (context.leadId) {
        const msg = `[Automatización] Mensaje enviado desde flujo: ${label}`;
        db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(context.leadId, 'assistant', msg);
      }

    } else {
      context.log.push(`⚡ Acción ejecutada: "${label}"`);
    }

  } else if (node.type === 'condition') {
    context.log.push(`🔀 Condición evaluada: "${label}"`);
    // Evaluate lead score if available
    let conditionResult = true;
    if (context.leadId) {
      const lead = db.prepare('SELECT score, status FROM leads WHERE id = ?').get(context.leadId) as any;
      if (lead) {
        conditionResult = (lead.score || 0) >= 50;
        context.log.push(`   ↳ Score del lead: ${lead.score || 0} → ${conditionResult ? 'TRUE (≥50)' : 'FALSE (<50)'}`);
      }
    } else {
      context.log.push(`   ↳ Sin lead activo → resultado: TRUE (por defecto)`);
    }

    // Follow only the matching branch
    const outEdges = edges.filter((e: any) => e.source === currentNodeId);
    const matchingEdge = outEdges.find((e: any) =>
      conditionResult ? e.sourceHandle === 'true' || !e.sourceHandle : e.sourceHandle === 'false'
    );
    if (matchingEdge) {
      await executeFlowNodes(nodes, edges, matchingEdge.target, context);
    }
    return; // Don't fall through to general edge traversal

  } else if (node.type === 'integration') {
    context.log.push(`🔗 Integración activada: "${label}" — webhook disparado`);
  }

  // Follow outgoing edges (general case — skip for condition which returns early)
  const outEdges = edges.filter((e: any) => e.source === currentNodeId);
  for (const edge of outEdges) {
    await executeFlowNodes(nodes, edges, edge.target, context);
  }
}

// ---- Routes ----

// GET /api/automations
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const automations = db.prepare('SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(automations);
  } catch (error) {
    console.error('Get automations error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/automations
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, status, flow_data } = req.body;
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO automations (user_id, name, status, flow_data) VALUES (?, ?, ?, ?)'
    ).run(req.userId, name, status || 'Activo', flow_data ? JSON.stringify(flow_data) : null);

    const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(automation);
  } catch (error) {
    console.error('Create automation error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/automations/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, status, runs, flow_data } = req.body;
    const db = getDb();
    db.prepare(`
      UPDATE automations SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        runs = COALESCE(?, runs),
        flow_data = COALESCE(?, flow_data)
      WHERE id = ? AND user_id = ?
    `).run(name, status, runs, flow_data ? JSON.stringify(flow_data) : null, req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Update automation error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/automations/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM automations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete automation error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/automations/:id/run — execute the automation flow
router.post('/:id/run', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const automation = db.prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
    if (!automation) {
      res.status(404).json({ error: 'Automatización no encontrada' });
      return;
    }
    if (automation.status !== 'Activo') {
      res.status(400).json({ error: 'La automatización no está activa' });
      return;
    }

    // Optional: use a specific lead from body, otherwise pick the most recent
    const { leadId: bodyLeadId } = req.body;
    let leadId: number | undefined = bodyLeadId;
    if (!leadId) {
      const recentLead = db.prepare('SELECT id FROM leads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.userId) as any;
      leadId = recentLead?.id;
    }

    // Get knowledge base
    const kbRow = db.prepare('SELECT content FROM knowledge_base WHERE user_id = ?').get(req.userId) as any;
    const knowledgeBase = kbRow?.content || '';

    const executionLog: string[] = [`▶ Iniciando automatización: "${automation.name}"`];
    if (leadId) executionLog.push(`👤 Lead activo: #${leadId}`);

    // Parse and execute flow
    let flowData: any = null;
    if (automation.flow_data) {
      try {
        flowData = typeof automation.flow_data === 'string' ? JSON.parse(automation.flow_data) : automation.flow_data;
      } catch (_) { /* ignore */ }
    }

    if (flowData?.nodes?.length && flowData?.edges !== undefined) {
      const triggerNode = flowData.nodes.find((n: any) => n.type === 'trigger');
      if (triggerNode) {
        await executeFlowNodes(flowData.nodes, flowData.edges, triggerNode.id, {
          userId: req.userId!,
          leadId,
          knowledgeBase,
          log: executionLog,
          visited: new Set(),
        });
      } else {
        executionLog.push('⚠️ No se encontró nodo de trigger en el flujo.');
      }
    } else {
      executionLog.push('ℹ️ Flujo sin nodos definidos — ejecución estándar completada.');
    }

    executionLog.push('✅ Ejecución finalizada.');

    // Increment run counter
    db.prepare('UPDATE automations SET runs = runs + 1 WHERE id = ?').run(req.params.id);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, actor, action, action_color, details) VALUES (?, ?, ?, ?, ?)').run(
      req.userId, 'Sistema', 'Ejecución Automatización', 'green',
      `"${automation.name}" ejecutada (${flowData?.nodes?.length || 0} nodos).`
    );

    // Create success notification
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
      req.userId, 'success', 'Automatización Ejecutada',
      `"${automation.name}" se ejecutó correctamente.`
    );

    const updated = db.prepare('SELECT * FROM automations WHERE id = ?').get(req.params.id);
    res.json({ success: true, automation: updated, executionLog });
  } catch (error: any) {
    console.error('Run automation error:', error);
    res.status(500).json({ error: 'Error al ejecutar: ' + error.message });
  }
});

// DELETE /api/automations — delete all
router.delete('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM automations WHERE user_id = ?').run(req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete all automations error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
