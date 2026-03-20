const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('sellia_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('sellia_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('sellia_token');
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('No autenticado');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async register(data: { email: string; password: string; name: string; company: string }) {
    const result = await this.request<{ token: string; user: any }>('POST', '/auth/register', data);
    this.setToken(result.token);
    return result;
  }

  async login(data: { email: string; password: string }) {
    const result = await this.request<{ token: string; user: any }>('POST', '/auth/login', data);
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    return this.request<any>('GET', '/auth/me');
  }

  async updateProfile(data: any) {
    return this.request<any>('PUT', '/auth/profile', data);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<any>('PUT', '/auth/password', data);
  }

  // Leads
  async getLeads(filters?: { status?: string; channel?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.channel) params.set('channel', filters.channel);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request<any[]>('GET', `/leads${qs ? '?' + qs : ''}`);
  }

  async createLead(data: any) {
    return this.request<any>('POST', '/leads', data);
  }

  async getLead(id: number) {
    return this.request<any>('GET', `/leads/${id}`);
  }

  async updateLead(id: number, data: any) {
    return this.request<any>('PUT', `/leads/${id}`, data);
  }

  async deleteLead(id: number) {
    return this.request<any>('DELETE', `/leads/${id}`);
  }

  async addMessage(leadId: number, data: { role: string; content: string }) {
    return this.request<any>('POST', `/leads/${leadId}/messages`, data);
  }

  async getMessages(leadId: number) {
    return this.request<any[]>('GET', `/leads/${leadId}/messages`);
  }

  async updateInsights(leadId: number, data: any) {
    return this.request<any>('PUT', `/leads/${leadId}/insights`, data);
  }

  // Campaigns
  async getCampaigns() {
    return this.request<any[]>('GET', '/campaigns');
  }

  async createCampaign(data: any) {
    return this.request<any>('POST', '/campaigns', data);
  }

  async updateCampaign(id: number, data: any) {
    return this.request<any>('PUT', `/campaigns/${id}`, data);
  }

  async deleteCampaign(id: number | string) {
    return this.request<any>('DELETE', `/campaigns/${id}`);
  }

  async bulkCreateCampaigns(campaigns: any[]) {
    return this.request<any[]>('POST', '/campaigns/bulk', { campaigns });
  }

  // Automations
  async getAutomations() {
    return this.request<any[]>('GET', '/automations');
  }

  async createAutomation(data: any) {
    return this.request<any>('POST', '/automations', data);
  }

  async updateAutomation(id: number, data: any) {
    return this.request<any>('PUT', `/automations/${id}`, data);
  }

  async deleteAutomation(id: number) {
    return this.request<any>('DELETE', `/automations/${id}`);
  }

  async deleteAllAutomations() {
    return this.request<any>('DELETE', '/automations');
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('GET', '/notifications');
  }

  async createNotification(data: { type: string; title: string; message: string }) {
    return this.request<any>('POST', '/notifications', data);
  }

  async markAllNotificationsRead() {
    return this.request<any>('PUT', '/notifications/read-all');
  }

  // Settings
  async getTeam() {
    return this.request<any[]>('GET', '/settings/team');
  }

  async inviteTeamMember(data: { name?: string; email: string; role: string }) {
    return this.request<any>('POST', '/settings/team', data);
  }

  async updateTeamMember(id: number, data: any) {
    return this.request<any>('PUT', `/settings/team/${id}`, data);
  }

  async getActivityLogs(filters?: { user?: string; action?: string }) {
    const params = new URLSearchParams();
    if (filters?.user) params.set('user', filters.user);
    if (filters?.action) params.set('action', filters.action);
    const qs = params.toString();
    return this.request<any[]>('GET', `/settings/activity-logs${qs ? '?' + qs : ''}`);
  }

  async getApiKeys() {
    return this.request<any[]>('GET', '/settings/api-keys');
  }

  async createApiKey(name: string) {
    return this.request<any>('POST', '/settings/api-keys', { name });
  }

  async deleteApiKey(id: number) {
    return this.request<any>('DELETE', `/settings/api-keys/${id}`);
  }

  // Integrations
  async getIntegrations() {
    return this.request<any[]>('GET', '/integrations');
  }

  async updateIntegration(id: number, data: { status?: string; config?: any }) {
    return this.request<any>('PUT', `/integrations/${id}`, data);
  }

  // Knowledge Base
  async getKnowledge() {
    return this.request<{ content: string }>('GET', '/knowledge');
  }

  async updateKnowledge(content: string) {
    return this.request<any>('PUT', '/knowledge', { content });
  }

  // AI
  async aiChat(data: { leadId?: number; messages: any[]; knowledgeBase?: string }) {
    return this.request<{ content: string; parts?: string[]; saleDetected?: boolean; humanRequested?: boolean; newStatus?: string }>('POST', '/ai/chat', data);
  }

  async aiExtractInsights(data: { messages: any[]; leadId?: number }) {
    return this.request<any>('POST', '/ai/extract-insights', data);
  }

  async aiAnalyzeAds(data: { text: string; historicalData?: any[] }) {
    return this.request<any>('POST', '/ai/analyze-ads', data);
  }

  async getAdAnalyses() {
    return this.request<any[]>('GET', '/ai/analyses');
  }

  async deleteAdAnalysis(id: number) {
    return this.request<any>('DELETE', `/ai/analyses/${id}`);
  }

  async deleteAllAdAnalyses() {
    return this.request<any>('DELETE', '/ai/analyses');
  }

  async getAdAlerts() {
    return this.request<any[]>('GET', '/ai/alerts');
  }

  async createAdAlert(data: { metric: string; condition: string; value: string; severity: string }) {
    return this.request<any>('POST', '/ai/alerts', data);
  }

  async deleteAdAlert(id: number) {
    return this.request<any>('DELETE', `/ai/alerts/${id}`);
  }

  // Ads
  async syncAds(data: { platform: string }) {
    return this.request<any>('POST', '/ads/sync', data);
  }

  // Notification Preferences
  async getNotificationPrefs() {
    return this.request<any>('GET', '/settings/notification-prefs');
  }

  async updateNotificationPrefs(data: { newLeadsEmail?: boolean; dailySummary?: boolean; billingAlerts?: boolean; pushNotifications?: boolean; bookingEmail?: boolean; saleEmail?: boolean; notifyEmail?: string }) {
    return this.request<any>('PUT', '/settings/notification-prefs', data);
  }

  // SMTP Config
  async getSmtpConfig() {
    return this.request<any>('GET', '/settings/smtp');
  }

  async updateSmtpConfig(data: { host?: string; port?: number; secure?: boolean; user?: string; pass?: string; fromName?: string; fromEmail?: string; enabled?: boolean }) {
    return this.request<any>('PUT', '/settings/smtp', data);
  }

  async testSmtp(to: string) {
    return this.request<any>('POST', '/settings/smtp/test', { to });
  }

  // Delete team member
  async deleteTeamMember(id: number) {
    return this.request<any>('DELETE', `/settings/team/${id}`);
  }

  // Run automation
  async runAutomation(id: number) {
    return this.request<any>('POST', `/automations/${id}/run`);
  }

  // Evaluate ad alerts
  async evaluateAlerts() {
    return this.request<any>('POST', '/ai/alerts/evaluate');
  }

  // AI Config (per-user Gemini API key)
  async getAiConfig() {
    return this.request<{ hasKey: boolean; keyPreview: string | null }>('GET', '/settings/ai-config');
  }

  async updateAiConfig(geminiApiKey: string) {
    return this.request<{ success: boolean }>('PUT', '/settings/ai-config', { geminiApiKey });
  }

  // Analyze ads with file
  async aiAnalyzeFile(data: { base64Data: string; mimeType: string; historicalData?: any[] }) {
    return this.request<any>('POST', '/ai/analyze-file', data);
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<any>('GET', '/dashboard/stats');
  }

  // Health
  async healthCheck() {
    return this.request<any>('GET', '/health');
  }

  // Admin
  async adminGetStats() {
    return this.request<{ totalUsers: number; activeUsers: number; totalLeads: number; totalRevenue: number }>('GET', '/admin/stats');
  }

  async adminGetUsers() {
    return this.request<any[]>('GET', '/admin/users');
  }

  async adminCreateUser(data: { email: string; password: string; name: string; company: string; plan: string; role?: string }) {
    return this.request<any>('POST', '/admin/users', data);
  }

  async adminUpdateUser(id: number, data: any) {
    return this.request<any>('PUT', `/admin/users/${id}`, data);
  }

  async adminDeleteUser(id: number) {
    return this.request<any>('DELETE', `/admin/users/${id}`);
  }

  // Admin AI config
  async adminGetAiConfig() {
    return this.request<{ hasKey: boolean; keyPreview: string | null }>('GET', '/admin/ai-config');
  }

  async adminUpdateAiConfig(openaiApiKey: string) {
    return this.request<{ success: boolean }>('PUT', '/admin/ai-config', { openaiApiKey });
  }

  async adminDeleteAiConfig() {
    return this.request<{ success: boolean }>('DELETE', '/admin/ai-config');
  }

  // WhatsApp
  async getWhatsappConfig() {
    return this.request<any>('GET', '/whatsapp/config');
  }

  async saveWhatsappConfig(data: { phoneNumberId: string; accessToken: string; businessAccountId?: string; displayName?: string; verifyToken?: string }) {
    return this.request<{ success: boolean; verifyToken: string }>('PUT', '/whatsapp/config', data);
  }

  async deleteWhatsappConfig() {
    return this.request<{ success: boolean }>('DELETE', '/whatsapp/config');
  }

  async testWhatsapp(to: string) {
    return this.request<{ success: boolean; message: string }>('POST', '/whatsapp/test', { to });
  }

  async sendWhatsappOperatorMessage(leadId: number, content: string) {
    return this.request<{ success: boolean }>('POST', '/whatsapp/send', { leadId, content });
  }

  // Calendar Events
  async getCalendarEvents(params?: { month?: string; from?: string; to?: string }) {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>('GET', `/calendar/events${qs}`);
  }

  async createCalendarEvent(data: { title: string; description?: string; start_datetime: string; end_datetime: string; all_day?: boolean; type?: string; color?: string; lead_id?: number; location?: string }) {
    return this.request<any>('POST', '/calendar/events', data);
  }

  async updateCalendarEvent(id: number, data: Partial<{ title: string; description: string; start_datetime: string; end_datetime: string; all_day: boolean; type: string; color: string; lead_id: number; location: string }>) {
    return this.request<any>('PUT', `/calendar/events/${id}`, data);
  }

  async deleteCalendarEvent(id: number) {
    return this.request<{ success: boolean }>('DELETE', `/calendar/events/${id}`);
  }

  async getCalendarLeads() {
    return this.request<any[]>('GET', '/calendar/leads');
  }

  // Google Calendar
  async getGoogleCalendarStatus() {
    return this.request<{ connected: boolean; calendarId?: string }>('GET', '/calendar/google/status');
  }

  async getGoogleAuthUrl() {
    return this.request<{ authUrl: string }>('GET', '/calendar/google/auth');
  }

  async syncGoogleCalendar() {
    return this.request<{ success: boolean; imported: number; pushed: number; message: string }>('POST', '/calendar/google/sync');
  }

  async disconnectGoogleCalendar() {
    return this.request<{ success: boolean }>('POST', '/calendar/google/disconnect');
  }

  // Admin — Knowledge base per client
  async adminGetUserKnowledge(userId: number) {
    return this.request<{ content: string; agentName: string }>('GET', `/admin/users/${userId}/knowledge`);
  }

  async adminUpdateUserKnowledge(userId: number, content: string, agentName?: string) {
    return this.request<{ success: boolean }>('PUT', `/admin/users/${userId}/knowledge`, { content, agentName });
  }

  async getAgentName() {
    return this.request<{ agentName: string }>('GET', '/settings/agent-name');
  }

  // Admin — AI training chat (simulate WhatsApp conversation as a client's customer)
  async adminAiTestChat(data: { userId: number; messages: { role: string; content: string }[] }) {
    return this.request<{ content: string; newStatus: string | null; saleDetected: boolean }>('POST', '/admin/ai-test-chat', data);
  }

  // Admin — Growth Analyzer
  async adminGrowthAnalyze(userId: number) {
    return this.request<{
      summary: string;
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
      kbSuggestions: string[];
      conversionScore: number;
    }>('POST', '/admin/growth-analyze', { userId });
  }

  async adminGetSelliaKb() {
    return this.request<{ content: string; agentName: string }>('GET', '/admin/sellia-kb');
  }

  async adminUpdateSelliaKb(content: string, agentName: string) {
    return this.request<{ success: boolean }>('PUT', '/admin/sellia-kb', { content, agentName });
  }

  async adminGetUserCollectionPrompt(userId: number) {
    return this.request<{ collection_prompt: string }>('GET', `/admin/users/${userId}/collection-prompt`);
  }

  async adminUpdateUserCollectionPrompt(userId: number, collection_prompt: string) {
    return this.request<{ success: boolean }>('PUT', `/admin/users/${userId}/collection-prompt`, { collection_prompt });
  }

  async adminGetSelliaCollectionPrompt() {
    return this.request<{ collection_prompt: string }>('GET', '/admin/sellia-collection-prompt');
  }

  async adminUpdateSelliaCollectionPrompt(collection_prompt: string) {
    return this.request<{ success: boolean }>('PUT', '/admin/sellia-collection-prompt', { collection_prompt });
  }

  async adminGetSelliaWhatsapp() {
    return this.request<any>('GET', '/admin/sellia-whatsapp');
  }

  async adminSaveSelliaWhatsapp(data: { phoneNumberId: string; accessToken: string; businessAccountId?: string; displayName?: string }) {
    return this.request<{ success: boolean; verifyToken: string }>('PUT', '/admin/sellia-whatsapp', data);
  }

  // Admin — get recent leads across all clients (for notifications)
  async adminGetRecentLeads() {
    return this.request<any[]>('GET', '/admin/leads/recent');
  }

  // Admin — get leads for a specific client
  async adminGetUserLeads(userId: number) {
    return this.request<any[]>('GET', `/admin/users/${userId}/leads`);
  }

  // Admin — get messages for a specific lead of a client
  async adminGetLeadMessages(userId: number, leadId: number) {
    return this.request<{ lead: any; messages: any[] }>('GET', `/admin/users/${userId}/leads/${leadId}/messages`);
  }

  // Admin — get WhatsApp config for a client
  async adminGetUserWhatsapp(userId: number) {
    return this.request<any>('GET', `/admin/users/${userId}/whatsapp`);
  }

  // Admin — save WhatsApp config for a client
  async adminSaveUserWhatsapp(userId: number, data: { phoneNumberId: string; accessToken: string; businessAccountId?: string; displayName?: string }) {
    return this.request<{ success: boolean; verifyToken: string }>('PUT', `/admin/users/${userId}/whatsapp`, data);
  }

  // Admin — get per-client stats for analyzer
  async adminGetUserStats(userId: number) {
    return this.request<any>('GET', `/admin/users/${userId}/stats`);
  }

  // Collections
  async getCollections() { return this.request<any[]>('GET', '/collections'); }
  async createCollection(data: any) { return this.request<any>('POST', '/collections', data); }
  async getCollection(id: number) { return this.request<any>('GET', `/collections/${id}`); }
  async updateCollection(id: number, data: any) { return this.request<any>('PUT', `/collections/${id}`, data); }
  async deleteCollection(id: number) { return this.request<any>('DELETE', `/collections/${id}`); }
  async markInstallmentPaid(id: number) { return this.request<any>('PUT', `/collections/installments/${id}/pay`); }
  async markInstallmentUnpaid(id: number) { return this.request<any>('PUT', `/collections/installments/${id}/unpay`); }
  async runCollectionScheduler() { return this.request<any>('POST', '/collections/run-scheduler'); }
  async getAllCollections() { return this.request<any[]>('GET', '/collections/all'); }
  async getCollectionConfig() { return this.request<{ collection_prompt: string }>('GET', '/collections/config'); }
  async updateCollectionConfig(collection_prompt: string) { return this.request<any>('PUT', '/collections/config', { collection_prompt }); }
}

export const api = new ApiClient();
