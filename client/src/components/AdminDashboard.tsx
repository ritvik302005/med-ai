import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { 
  Activity, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  Bell, 
  Search,
  TrendingUp,
  Heart,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Chatbot from './Chatbot';

const StatCard = ({ title, value, icon: Icon, color, t }: { title: string, value: string, icon: any, color: string, t: any }) => (
  <div className="border-2 border-current p-6 bg-[var(--bg)] shadow-[4px_4px_0px_0px_currentColor]">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 ${color} text-white`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{t('live')}</span>
    </div>
    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">{title}</h3>
    <p className="text-2xl font-black tracking-tighter">{value}</p>
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto text-[var(--text)]">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-60 transition-opacity mb-8">
        <ArrowLeft className="w-4 h-4" />
        {t('backToHome')}
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-current pb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-[var(--text)]">
              {t('welcome')}, <br />
              <span className="opacity-70">{user?.displayName?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] opacity-80">
              {t('systemStatus')}: <span className="text-green-500">{t('operational')}</span> • {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="p-4 border-2 border-current hover:bg-current hover:text-[var(--bg)] transition-all">
              <Bell size={20} />
            </button>
            <button className="p-4 border-2 border-current hover:bg-current hover:text-[var(--bg)] transition-all">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t('totalUsers')} value="1,284" icon={Users} color="bg-blue-500" t={t} />
          <StatCard title={t('activeSessions')} value="42" icon={Activity} color="bg-green-500" t={t} />
          <StatCard title={t('databaseSize')} value="12 GB" icon={FileText} color="bg-orange-500" t={t} />
          <StatCard title={t('systemStatus')} value="99.9%" icon={Clock} color="bg-purple-500" t={t} />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight">{t('recentActivity')}</h2>
              <button className="text-[10px] font-bold uppercase tracking-widest underline">{t('viewAll')}</button>
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-2 border-current p-4 flex items-center justify-between hover:bg-current/5 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-current/10 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{t('patientRecord')}_#00{i}24.pdf</h4>
                      <p className="text-[10px] opacity-50 uppercase font-bold">{t('analyzed2HoursAgo')} • {t('aiConfidence')}: 98%</p>
                    </div>
                  </div>
                  <ArrowRight size={16} />
                </div>
              ))}
            </div>

            {/* Health Trends Chart Placeholder */}
            <div className="border-2 border-current p-8 h-64 flex flex-col items-center justify-center bg-current/5">
              <TrendingUp size={48} className="opacity-20 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 text-center">
                {t('healthTrendsVisualization')} <br />
                <span className="text-[10px]">{t('realTimeDataProcessing')}</span>
              </p>
            </div>
          </div>

          {/* Sidebar / Quick Actions */}
          <div className="space-y-8">
            <div className="border-2 border-current p-6 bg-current text-[var(--bg)]">
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">{t('quickActions')}</h3>
              <div className="grid grid-cols-1 gap-2">
                <button className="w-full p-3 border border-[var(--bg)] hover:bg-[var(--bg)] hover:text-current transition-all text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                  <Search size={14} /> {t('manageUsers')}
                </button>
                <button className="w-full p-3 border border-[var(--bg)] hover:bg-[var(--bg)] hover:text-current transition-all text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                  <Calendar size={14} /> {t('editDatabase')}
                </button>
                <button className="w-full p-3 border border-[var(--bg)] hover:bg-[var(--bg)] hover:text-current transition-all text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                  <Heart size={14} /> {t('viewReports')}
                </button>
              </div>
            </div>

            <div className="border-2 border-current p-6">
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">{t('upcomingAppointments')}</h3>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="text-center">
                      <span className="block text-xl font-black leading-none">2{i}</span>
                      <span className="text-[8px] font-bold uppercase opacity-50">Mar</span>
                    </div>
                    <div className="flex-1 border-l border-current pl-4">
                      <h5 className="text-[10px] font-bold uppercase">{t('staffMeeting')}</h5>
                      <p className="text-[10px] opacity-50">09:00 AM • {t('conferenceRoomB')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <Chatbot />
    </div>
  );
}

function ArrowRight({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="square" 
      strokeLinejoin="miter"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
