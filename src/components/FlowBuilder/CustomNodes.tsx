import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Zap, Database, GitBranch, Webhook, Bot, Mail, Send } from 'lucide-react';

const icons: Record<string, any> = {
  message: MessageSquare,
  zap: Zap,
  database: Database,
  branch: GitBranch,
  webhook: Webhook,
  bot: Bot,
  mail: Mail,
  send: Send,
};

const handleStyle = { width: '12px', height: '12px', border: '2px solid white', zIndex: 10 };

export const TriggerNode = memo(({ data, isConnectable }: any) => {
  const Icon = icons[data.icon] || Zap;
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 min-w-[260px] relative">
      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 rounded-l-xl"></div>
      <div className="p-4 pl-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Trigger</div>
            <div className="font-semibold text-slate-900 text-sm">{data.label}</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">{data.description || 'Inicia el flujo'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ ...handleStyle, background: '#10b981' }} />
    </div>
  );
});

export const ActionNode = memo(({ data, isConnectable }: any) => {
  const Icon = icons[data.icon] || Zap;
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 min-w-[260px] relative">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ ...handleStyle, background: '#6366f1' }} />
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-xl"></div>
      <div className="p-4 pl-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Acción</div>
            <div className="font-semibold text-slate-900 text-sm">{data.label}</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">{data.description || 'Ejecuta una tarea'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ ...handleStyle, background: '#6366f1' }} />
    </div>
  );
});

export const ConditionNode = memo(({ data, isConnectable }: any) => {
  const Icon = icons[data.icon] || GitBranch;
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 min-w-[260px] relative">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ ...handleStyle, background: '#f59e0b' }} />
      <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 rounded-l-xl"></div>
      <div className="p-4 pl-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Condición</div>
            <div className="font-semibold text-slate-900 text-sm">{data.label}</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">{data.description || 'Evalúa reglas lógicas'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" isConnectable={isConnectable} style={{ ...handleStyle, background: '#10b981', left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" isConnectable={isConnectable} style={{ ...handleStyle, background: '#f43f5e', left: '70%' }} />
      <div className="absolute -bottom-6 left-0 w-full flex justify-between px-12 text-[10px] font-bold">
        <span className="text-emerald-600">TRUE</span>
        <span className="text-rose-600">FALSE</span>
      </div>
    </div>
  );
});

export const IntegrationNode = memo(({ data, isConnectable }: any) => {
  const Icon = icons[data.icon] || Webhook;
  return (
    <div className="bg-slate-900 rounded-xl shadow-md border border-slate-700 min-w-[260px] relative text-white">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ ...handleStyle, background: '#94a3b8' }} />
      <div className="absolute top-0 left-0 w-2 h-full bg-slate-500 rounded-l-xl"></div>
      <div className="p-4 pl-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integración</div>
            <div className="font-semibold text-white text-sm">{data.label}</div>
          </div>
        </div>
        <div className="text-xs text-slate-400">{data.description || 'Envía datos a Make/n8n'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ ...handleStyle, background: '#94a3b8' }} />
    </div>
  );
});
