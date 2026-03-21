import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const userId = req.userId;

    // Lead stats
    const totalLeads = (db.prepare('SELECT COUNT(*) as count FROM leads WHERE user_id = ?').get(userId) as any).count;
    const resolvedByAI = (db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND (human_mode = 0 OR human_mode IS NULL) AND status IN ('Calificado','En Negociación','Cerrado Ganado','Cerrado Perdido')").get(userId) as any).count;
    const handedToHuman = (db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND human_mode = 1").get(userId) as any).count;
    const wonLeads = (db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'Cerrado Ganado'").get(userId) as any).count;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Automation stats
    const automations = (db.prepare('SELECT COUNT(*) as count FROM automations WHERE user_id = ?').get(userId) as any).count;

    // Recent leads (last 5)
    const recentLeads = db.prepare(`
      SELECT l.*, GROUP_CONCAT(lt.tag) as tags_str
      FROM leads l LEFT JOIN lead_tags lt ON l.id = lt.lead_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC LIMIT 5
    `).all(userId).map((lead: any) => ({
      ...lead,
      tags: lead.tags_str ? lead.tags_str.split(',') : [],
      humanMode: !!lead.human_mode,
    }));

    // Growth insights (from most recent lead with insights)
    const latestInsight = db.prepare(`
      SELECT li.* FROM lead_insights li
      JOIN leads l ON li.lead_id = l.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC LIMIT 1
    `).get(userId) as any;

    let insights = {
      demographics: 'Cargando datos...',
      interests: ['-', '-'],
      painPoints: ['-', '-'],
      needs: ['-', '-'],
      opportunities: ['-', '-'],
      buyingIntent: 'Media',
      platformParams: { meta: '-', google: '-', linkedin: '-' }
    };

    if (latestInsight) {
      insights = {
        demographics: latestInsight.demographics,
        interests: JSON.parse(latestInsight.interests),
        painPoints: JSON.parse(latestInsight.pain_points),
        needs: JSON.parse(latestInsight.needs),
        opportunities: JSON.parse(latestInsight.opportunities),
        buyingIntent: latestInsight.buying_intent,
        platformParams: JSON.parse(latestInsight.platform_params),
      };
    }

    // Chart data: leads by day of week
    const allLeads = db.prepare('SELECT created_at, status FROM leads WHERE user_id = ?').all(userId) as any[];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const grouped = days.map(name => ({ name, conv: 0, leads: 0 }));

    allLeads.forEach((lead: any) => {
      const date = new Date(lead.created_at);
      const dayIdx = date.getDay();
      grouped[dayIdx].leads += 1;
      if (lead.status === 'Cerrado Ganado') {
        grouped[dayIdx].conv += 1;
      }
    });

    const chartData = [...grouped.slice(1), grouped[0]]; // Mon-Sun

    // Channel distribution
    const channelRows = db.prepare('SELECT channel, COUNT(*) as count FROM leads WHERE user_id = ? GROUP BY channel').all(userId) as any[];
    const channelData = channelRows.length > 0
      ? channelRows.map((r: any) => ({ name: r.channel, value: r.count }))
      : [{ name: 'Sin datos', value: 1 }];

    // Funnel data
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM leads WHERE user_id = ? GROUP BY status
    `).all(userId).reduce((acc: any, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const qualified = (statusCounts['Calificado'] || 0) + (statusCounts['En Negociación'] || 0) + (statusCounts['Cerrado Ganado'] || 0);
    const traffic = totalLeads > 0 ? totalLeads * 3.5 : 0;

    const funnelData = [
      { name: 'Tráfico (Visitas)', value: Math.floor(traffic) },
      { name: 'Chats Iniciados', value: totalLeads },
      { name: 'Calificados por IA', value: qualified },
      { name: 'Ventas Cerradas', value: statusCounts['Cerrado Ganado'] || 0 },
    ];

    res.json({
      stats: {
        activeChats: totalLeads,
        resolvedByAI,
        handedToHuman,
        conversionRate,
        automations,
        wonLeads,
        totalLeads,
      },
      recentLeads,
      insights,
      chartData,
      channelData,
      funnelData,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
