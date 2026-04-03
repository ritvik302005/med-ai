import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LogIn, Mail, Lock, UserPlus, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const MarqueeRow = ({
  text,
  direction = 'left',
  speed = 20,
}: {
  text: string;
  direction?: 'left' | 'right';
  speed?: number;
}) => {
  return (
    <div className="flex overflow-hidden whitespace-nowrap select-none opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
      <motion.div
        animate={{
          x: direction === 'left' ? [0, -1000] : [-1000, 0],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="flex gap-8 text-[15vw] font-black uppercase leading-none tracking-tighter"
      >
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </motion.div>
    </div>
  );
};

export default function AuthPages({ type }: { type: 'signin' | 'signup' }) {
  const { signIn, signUp, demoLogin, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleDemoLogin = async (role: 'admin' | 'user') => {
    setError('');
    setIsSubmitting(true);

    try {
      await demoLogin(role);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (type === 'signup') {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const backgroundText =
    type === 'signin' ? `${t('accessAccount')} ${t('signin')} ` : `${t('createAccount')} ${t('signup')} `;

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[var(--bg)] text-[var(--text)] p-4 transition-colors duration-500 overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center gap-4 py-8 rotate-[-5deg] scale-110">
        <MarqueeRow text={backgroundText} direction="left" speed={30} />
        <MarqueeRow text={backgroundText} direction="right" speed={25} />
        <MarqueeRow text={backgroundText} direction="left" speed={35} />
        <MarqueeRow text={backgroundText} direction="right" speed={28} />
        <MarqueeRow text={backgroundText} direction="left" speed={32} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="border-2 border-current p-8 bg-[var(--bg)] shadow-[12px_12px_0px_0px_currentColor]">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-current text-[var(--bg)]">
              {type === 'signin' ? <LogIn size={24} /> : <UserPlus size={24} />}
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">
              {type === 'signin' ? t('signin') : t('signup')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <UserIcon size={14} /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-transparent border-2 border-current text-current focus:bg-current/5 transition-all outline-none font-bold"
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-transparent border-2 border-current text-current focus:bg-current/5 transition-all outline-none font-bold"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Lock size={14} /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-transparent border-2 border-current text-current focus:bg-current/5 transition-all outline-none font-bold"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">
                {type === 'signup' ? 'Creates a local MedAI account' : 'Sign in with your MedAI account'}
              </p>
            </div>

            {error && (
              <div className="border-2 border-red-500 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-current text-[var(--bg)] font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Please wait' : type === 'signin' ? t('accessAccount') : t('createAccount')}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-current opacity-20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
              <span className="bg-[var(--bg)] px-4">Quick demo access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => void handleDemoLogin('admin')}
              disabled={isSubmitting}
              className="py-4 border-2 border-current font-black uppercase tracking-widest hover:bg-current/10 transition-all flex items-center justify-center gap-2 text-[10px] disabled:opacity-50"
            >
              <LogIn size={14} />
              {t('adminAccess')}
            </button>
            <button
              onClick={() => void handleDemoLogin('user')}
              disabled={isSubmitting}
              className="py-4 border-2 border-current font-black uppercase tracking-widest hover:bg-current/10 transition-all flex items-center justify-center gap-2 text-[10px] disabled:opacity-50"
            >
              <LogIn size={14} />
              {t('userAccess')}
            </button>
          </div>

          <p className="mt-8 text-center text-xs font-bold uppercase tracking-widest opacity-60">
            {type === 'signin' ? (
              <>
                New to the platform?{' '}
                <button onClick={() => navigate('/signup')} className="text-[var(--text)] underline hover:opacity-80">
                  {t('signup')}
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => navigate('/signin')} className="text-[var(--text)] underline hover:opacity-80">
                  {t('signin')}
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
