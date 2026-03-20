import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoUrl from '../assets/logo.png';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const darkMode = document.documentElement.classList.contains("dark");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex w-full transition-colors duration-500", darkMode ? "bg-slate-950" : "bg-slate-50")}>
      
      {/* Left side - Branding & Visuals (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center border-r border-white/5">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000"></div>
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-pink-600/20 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-4000"></div>
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 p-12 flex flex-col items-center text-center max-w-lg">
          <div className="p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] mb-12 transform hover:scale-105 transition-transform duration-700 ease-out">
            <img 
              src={logoUrl} 
              alt="Sellia Logo" 
              className="w-72 h-auto object-contain drop-shadow-[0_0_20px_rgba(79,70,229,0.3)]" 
            />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-5 leading-tight">
            Únete a la revolución <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Comercial de IA</span>
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
            Empieza hoy a transformar tus ventas con asistentes automáticos que nunca duermen y maximizan tu ROI.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-300 font-medium">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Plataforma Segura</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Resultados Rápidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center relative px-6 sm:px-12 lg:px-24">
        
        <div className="w-full max-w-md mx-auto relative z-10">
          {/* Mobile Logo */}
          <div className="text-center mb-10 lg:hidden">
            <div className={cn("inline-block p-5 rounded-3xl mx-auto mb-6 shadow-2xl border backdrop-blur-3xl", darkMode ? "bg-slate-900 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" : "bg-white border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]")}>
              <img 
                src={logoUrl} 
                alt="Sellia Logo" 
                className="w-64 h-auto mx-auto object-contain drop-shadow-xl" 
              />
            </div>
          </div>
          
          <div className="text-center lg:text-left mb-10">
            <h2 className={cn("text-3xl font-extrabold tracking-tight", darkMode ? "text-white" : "text-slate-900")}>
              Crear tu cuenta
            </h2>
            <p className={cn("text-base mt-2 font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
              Comienza en menos de 2 minutos.
            </p>
          </div>

          <div className={cn(
            "rounded-[2rem] p-8 sm:p-10 shadow-2xl transition-all duration-500 relative overflow-hidden",
            darkMode 
              ? "bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 shadow-[0_0_40px_rgba(0,0,0,0.2)]" 
              : "bg-white/70 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]"
          )}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 opacity-50"></div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {error && (
                <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("block text-sm font-semibold ml-1", darkMode ? "text-slate-300" : "text-slate-700")}>Nombre</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    required
                    className={cn(
                      "w-full px-4 py-3.5 rounded-2xl outline-none border-2 transition-all duration-300 text-sm font-medium",
                      darkMode 
                        ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" 
                        : "bg-slate-50/50 border-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("block text-sm font-semibold ml-1", darkMode ? "text-slate-300" : "text-slate-700")}>Empresa</label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Mi Startup"
                    className={cn(
                      "w-full px-4 py-3.5 rounded-2xl outline-none border-2 transition-all duration-300 text-sm font-medium",
                      darkMode 
                        ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" 
                        : "bg-slate-50/50 border-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("block text-sm font-semibold ml-1", darkMode ? "text-slate-300" : "text-slate-700")}>Email corporativo</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ejemplo@tuempresa.com"
                  required
                  className={cn(
                    "w-full px-5 py-3.5 rounded-2xl outline-none border-2 transition-all duration-300 text-sm font-medium",
                    darkMode 
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" 
                      : "bg-slate-50/50 border-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("block text-sm font-semibold ml-1", darkMode ? "text-slate-300" : "text-slate-700")}>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className={cn(
                    "w-full px-5 py-3.5 rounded-2xl outline-none border-2 transition-all duration-300 text-sm font-medium",
                    darkMode 
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" 
                      : "bg-slate-50/50 border-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex items-center justify-center gap-2 py-4 mt-6 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white rounded-2xl font-bold text-sm tracking-wide hover:from-purple-500 hover:to-rose-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_rgba(219,39,119,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(219,39,119,0.6)] hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>

                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Crear Cuenta Gratis</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className={cn("mt-8 pt-6 border-t text-center", darkMode ? "border-slate-800/60" : "border-slate-200")}>
              <p className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-bold text-purple-500 hover:text-purple-400 transition-colors">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-slate-500 dark:text-slate-500 text-[13px] font-medium mt-10">
            © 2026 Sellia. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
