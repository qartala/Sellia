export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string;
  role: string;
  avatar_url: string | null;
  timezone: string;
  language: string;
  date_format: string;
  currency: string;
  created_at: string;
}

export interface Lead {
  id: number;
  user_id: number;
  name: string;
  company: string;
  channel: string;
  status: 'Nuevo' | 'Calificado' | 'En Negociación' | 'Cerrado Ganado' | 'Cerrado Perdido';
  score: number;
  human_mode: number;
  created_at: string;
}

export interface Message {
  id: number;
  lead_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface LeadInsight {
  id: number;
  lead_id: number;
  demographics: string;
  interests: string; // JSON array
  pain_points: string; // JSON array
  needs: string; // JSON array
  opportunities: string; // JSON array
  buying_intent: string;
  platform_params: string; // JSON object
}

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  platform: string;
  status: string;
  spend: number;
  revenue: number;
  reach: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpa: number;
  ctr: number;
  date: string;
  created_at: string;
}

export interface Automation {
  id: number;
  user_id: number;
  name: string;
  status: string;
  runs: number;
  flow_data: string | null; // JSON
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'lead' | 'alert' | 'success' | 'message';
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export interface Integration {
  id: number;
  user_id: number;
  name: string;
  category: string;
  status: string;
  icon: string;
  description: string;
  config: string | null; // JSON
}

export interface AdAnalysis {
  id: number;
  user_id: number;
  source: string;
  content: string;
  created_at: string;
}

export interface AdAlert {
  id: number;
  user_id: number;
  metric: string;
  condition: string;
  value: string;
  severity: string;
  active: number;
}

export interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  actor: string;
  action: string;
  action_color: string;
  details: string;
  created_at: string;
}

export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used: string | null;
  created_at: string;
}

export interface KnowledgeBase {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// Express augmented request
import { Request } from 'express';
export interface AuthRequest extends Request {
  userId?: number;
}
