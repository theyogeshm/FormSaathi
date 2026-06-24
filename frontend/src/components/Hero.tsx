import React from 'react';
import { Camera, Mic, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import { t } from '../translations';

interface HeroProps {
  currentLang: string;
  onTryDemo: () => void;
  onSelectAction: (action: 'photo' | 'voice' | 'search') => void;
}

export default function Hero({ currentLang, onTryDemo, onSelectAction }: HeroProps) {
  return (
    <section 
      id="solution" 
      className="brand-gradient text-white overflow-hidden relative py-16 lg:py-20"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[30%] -left-[10%] w-[600px] h-[600px] rounded-full bg-secondary blur-[150px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] right-0 w-[500px] h-[500px] rounded-full bg-primary-container blur-[150px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left: Headline & Content */}
        <div className="space-y-8 animate-fade-in">
          <h1 className="font-headline-xl text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            {t('hero_title', currentLang)}
          </h1>
          
          <p className="font-body-lg text-lg sm:text-xl text-white/85 max-w-xl leading-relaxed">
            {t('hero_subtitle', currentLang)}
          </p>

          {/* Feature Quick-Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => onSelectAction('photo')}
              className="glass-card px-5 py-3 rounded-full flex items-center gap-2.5 hover:bg-white/15 transition-all text-sm font-medium transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-secondary-container" />
              {t('hero_scan_btn', currentLang)}
            </button>
            <button 
              onClick={() => onSelectAction('search')}
              className="glass-card px-5 py-3 rounded-full flex items-center gap-2.5 hover:bg-white/15 transition-all text-sm font-medium transform active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4 text-secondary-container" />
              {t('hero_search_btn', currentLang)}
            </button>
          </div>

          {/* Primary Call to Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
            <button 
              onClick={onTryDemo}
              className="bg-white text-primary hover:bg-surface-container hover:scale-102 px-8 py-4 rounded-full font-extrabold text-lg transition-all shadow-lg hover:shadow-xl text-center cursor-pointer"
            >
              {t('hero_try_demo', currentLang)}
            </button>

          </div>
        </div>

        {/* Right: Gorgeous Mockup and Floating 3D Icons */}
        <div className="relative flex justify-center items-center min-h-[420px] lg:min-h-[500px]">
          
          {/* Main Simulated Form Container */}
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 w-full max-w-md shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-500 hover:scale-102">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <div className="h-4 w-36 bg-white/20 rounded-md"></div>
              <div className="h-4 w-16 bg-white/20 rounded-md"></div>
            </div>
            
            <div className="space-y-6">
              <div className="h-11 bg-white/5 rounded-xl flex items-center px-4 border border-white/10">
                <div className="h-2 w-2/3 bg-white/25 rounded"></div>
              </div>
              <div className="h-11 bg-white/5 rounded-xl flex items-center px-4 border border-white/10">
                <div className="h-2 w-1/2 bg-white/25 rounded"></div>
              </div>
              <div className="h-11 bg-white/5 rounded-xl flex items-center px-4 border border-white/10">
                <div className="h-2 w-3/4 bg-white/25 rounded"></div>
              </div>
            </div>
          </div>

          {/* Floating Secure Bank Badge (Top Right) */}
          <div className="absolute top-4 -right-2 bg-white text-primary p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-1 border border-primary/10 hover:scale-105 transition-transform max-w-[120px] text-center animate-bounce duration-[4s]">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface">{t('hero_secure_bank', currentLang)}</span>
          </div>

          {/* Floating AI Brain Icon (Bottom Center) */}
          <div className="absolute -bottom-6 right-8 w-28 h-28 transform hover:scale-110 hover:-rotate-6 transition-all duration-300 drop-shadow-2xl">
            <img 
              alt="AI brain icon representing FormSaathi intelligence" 
              className="w-full h-full object-contain filter drop-shadow-2xl" 
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1zpqeVbTdb5OrCtelIzpvXwoDGJ6ZAg58mtsPrBntejlQgzO0iPetyKoFhTQ-aCaIfZkVvrThmMQM3roCw3nxrBtl6Y067o-Ns1Ag62qsoyNm-fgUcW63nnRuTvjonkQKJYmbR4IuXH1428nOCpck1EAowtvREzmAYoPAEgKwbN8P_lgxCgtA_nzzcvVXDROVqGC37sMoKWljtGZ9BrHIZ-RJ-Lvtrm-xZaye8gc3zNBDe-FxlqCLxvbidGG_s2Et1D7ediC4iME"
            />
          </div>

          {/* Floating Secure Shield Icon (Bottom Left) */}
          <div className="absolute -bottom-4 -left-4 w-32 h-32 transform hover:scale-110 hover:rotate-6 transition-all duration-300 drop-shadow-2xl animate-pulse">
            <img 
              alt="Secure Shield icon representing encryption" 
              className="w-full h-full object-contain filter drop-shadow-2xl" 
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
