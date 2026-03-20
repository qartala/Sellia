import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// POST /api/ads/sync
// Simula la sincronización masiva de campañas de Meta y Google Ads
router.post('/sync', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const platform = req.body.platform || 'Meta Ads';
    
    // Nombres realistas de campañas
    const campaignNames = [
      'Retargeting - Leads Calientes Q3',
      'Lookalike 1% - Interesados B2B',
      'Campaña DPA - Catálogo Servicios',
      'Brand Awareness - Top of Funnel',
      'Conversiones - Demo Gratuita'
    ];

    const generateCampaignsForLast30Days = () => {
      const generated = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        // Distribuimos ~1-3 campañas por día para hacerlo realista
        const campaignsCount = Math.floor(Math.random() * 3) + 1;
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        for (let j = 0; j < campaignsCount; j++) {
          const spend = Math.floor(Math.random() * (500 - 50 + 1)) + 50; // Inversión diaria: $50 - $500
          const roasMultiplier = (Math.random() * (4.5 - 1.2) + 1.2).toFixed(2); // ROAS: 1.2x - 4.5x
          const revenue = spend * parseFloat(roasMultiplier);
          const reach = Math.floor(spend * (Math.random() * (200 - 50) + 50)); // Ej: $1 iterativo = 50 a 200 views
          const clicks = Math.floor(reach * (Math.random() * (0.05 - 0.01) + 0.01)); // CTR 1% a 5%
          const conversions = Math.floor(clicks * (Math.random() * (0.20 - 0.02) + 0.02)); // Tasa conv 2% a 20%
          
          const ctr = reach > 0 ? (clicks / reach) * 100 : 0;
          const cpa = conversions > 0 ? spend / conversions : 0;
          
          generated.push({
            user_id: req.userId,
            name: campaignNames[Math.floor(Math.random() * campaignNames.length)],
            platform: platform,
            status: 'Active',
            spend,
            revenue,
            reach,
            clicks,
            conversions,
            roas: parseFloat(roasMultiplier),
            cpa: Number(cpa.toFixed(2)),
            ctr: Number(ctr.toFixed(2)),
            date: dateStr
          });
        }
      }
      return generated;
    };

    const newCampaigns = generateCampaignsForLast30Days();

    const stmt = db.prepare(`
      INSERT INTO campaigns (user_id, name, platform, status, spend, revenue, reach, clicks, conversions, roas, cpa, ctr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((camps: any[]) => {
      for (const c of camps) {
        stmt.run(
          c.user_id, c.name, c.platform, c.status,
          c.spend, c.revenue, c.reach, c.clicks, c.conversions,
          c.roas, c.cpa, c.ctr, c.date
        );
      }
    });

    // Validamos primero si ya existen campañas de esta plataforma para no duplicar masivamente
    const existing = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND platform = ?').get(req.userId, platform) as any;
    if (existing.count > 0) {
       // Opcional: Borrar el histórico de esta plataforma si se vuelve a sincronizar
       db.prepare('DELETE FROM campaigns WHERE user_id = ? AND platform = ?').run(req.userId, platform);
    }
    
    insertMany(newCampaigns);

    res.status(201).json({ success: true, message: `Sincronizadas ${newCampaigns.length} campañas de ${platform}` });
  } catch (error) {
    console.error('Sync ads error:', error);
    res.status(500).json({ error: 'Error interno sincronizando Ads' });
  }
});

export default router;
