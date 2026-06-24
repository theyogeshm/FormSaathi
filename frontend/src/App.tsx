import React, { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Mail, Building, Landmark, Send, ArrowRight } from 'lucide-react';

import NavBar from './components/NavBar';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import HowItWorks from './components/HowItWorks';
import Showcase from './components/Showcase';
import FeaturesGrid from './components/FeaturesGrid';
import BuiltForBharat from './components/BuiltForBharat';
import Footer from './components/Footer';
import { ShowcaseTab } from './types';
import { t } from './translations';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalSubmitted, setModalSubmitted] = useState<boolean>(false);
  const [showcaseKey, setShowcaseKey] = useState<number>(0);
  const [initialShowcaseTab, setInitialShowcaseTab] = useState<ShowcaseTab>('photo');
  const [currentLang, setCurrentLang] = useState<string>(() => localStorage.getItem('formsaathi_lang') || 'en');

  const handleLangChange = (lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('formsaathi_lang', lang);
  };

  // Contact/Demo form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    bankName: '',
    branches: '5',
    notes: '',
  });

  const handleOpenDemoModal = () => {
    setModalSubmitted(false);
    setIsModalOpen(true);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitted(true);
  };

  // Triggers smooth scrolling to the Showcase component
  const scrollToDemo = (tab: ShowcaseTab = 'photo') => {
    setInitialShowcaseTab(tab);
    // Force recreation of Showcase component to apply the tab cleanly
    setShowcaseKey(prev => prev + 1);

    const element = document.getElementById('showcase');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <div className="bg-background text-on-surface font-sans min-h-screen relative antialiased selection:bg-primary-fixed-dim selection:text-primary">
      
      {/* Navbar */}
      <NavBar currentLang={currentLang} onChangeLang={handleLangChange} onTryDemo={handleOpenDemoModal} />

      {/* Hero Section */}
      <Hero 
        currentLang={currentLang}
        onTryDemo={() => scrollToDemo('photo')} 
        onSelectAction={scrollToDemo}
      />

      {/* Problem Section: "Why banking feels like a chore" */}
      <ProblemSection currentLang={currentLang} />

      {/* How It Works: Steps description & Circular success gauge */}
      <HowItWorks currentLang={currentLang} />

      {/* Showcase: Interactive mock photo scanner / voice / search */}
      <Showcase key={showcaseKey} initialActiveTab={initialShowcaseTab} currentLang={currentLang} onChangeLang={handleLangChange} />

      {/* Features Grid: Zero-Rejection checks */}
      <FeaturesGrid currentLang={currentLang} />

      {/* Built For Bharat: Regional Language Support display */}
      <BuiltForBharat currentLang={currentLang} />


      {/* Final Action CTA Banner */}
      <section className="brand-gradient py-16 text-center text-white relative overflow-hidden">
        {/* Glowing backdrop decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-secondary-container/20 blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 space-y-8 relative z-10">
          <h2 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            {t('cta_title', currentLang)}
          </h2>
          <p className="text-body-lg text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
            {t('cta_subtitle', currentLang)}
          </p>
          <div className="pt-2">
            <button 
              onClick={handleOpenDemoModal}
              className="bg-white text-primary hover:bg-surface-container font-extrabold text-xl px-12 py-5 rounded-full shadow-2xl hover:shadow-primary/20 transform hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer inline-flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
              {t('cta_btn', currentLang)}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer currentLang={currentLang} />

      {/* HIGH-FIDELITY CONVERSION DEMO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative border border-outline-variant/30 animate-scale-up">
            
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 brand-gradient"></div>

            {/* Close button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface text-lg font-bold bg-surface-container p-2 rounded-full cursor-pointer transition-colors"
              aria-label="Close dialog"
            >
              ✕
            </button>

            {/* Content states */}
            {!modalSubmitted ? (
              <div className="space-y-4">
                
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" /> {t('modal_registry', currentLang)}
                  </span>
                  <h3 className="text-xl font-extrabold text-on-surface">
                    {t('modal_title', currentLang)}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {t('modal_sub', currentLang)}
                  </p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-3">
                  
                  {/* Name */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-on-surface">{t('modal_name', currentLang)}</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-on-surface">{t('modal_email', currentLang)}</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="email" 
                        required
                        placeholder="e.g. r.sharma@sbi.co.in"
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        className="w-full bg-surface border border-outline-variant rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Bank name */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-on-surface">{t('modal_bank', currentLang)}</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. State Bank of India"
                        value={demoForm.bankName}
                        onChange={(e) => setDemoForm({ ...demoForm, bankName: e.target.value })}
                        className="w-full bg-surface border border-outline-variant rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Estimated branches */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-on-surface">{t('modal_branches', currentLang)}</label>
                    <select 
                      value={demoForm.branches}
                      onChange={(e) => setDemoForm({ ...demoForm, branches: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="1">1 (Single pilot branch)</option>
                      <option value="5">2 - 9 branches</option>
                      <option value="25">10 - 49 branches</option>
                      <option value="100">50+ branches</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-on-surface">{t('modal_notes', currentLang)}</label>
                    <textarea 
                      placeholder="e.g., Interest in cooperative KYC forms, regional language translation etc..."
                      rows={2}
                      value={demoForm.notes}
                      onChange={(e) => setDemoForm({ ...demoForm, notes: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-container text-white py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102 transform active:scale-95 pt-3"
                  >
                    <Send className="w-4 h-4" />
                    {t('modal_submit', currentLang)}
                  </button>

                </form>

              </div>
            ) : (
              <div className="space-y-6 py-6 text-center animate-fade-in flex flex-col items-center">
                
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-2xl font-extrabold text-on-surface">{t('modal_success_title', currentLang)}</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed mx-auto">
                    {t('modal_success_desc', currentLang).replace('{name}', demoForm.name).replace('{bankName}', demoForm.bankName)}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 max-w-sm text-center">
                  <p className="text-xs font-medium text-primary leading-relaxed">
                    📧 {t('modal_success_note', currentLang).replace('{email}', demoForm.email)}
                  </p>
                </div>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-on-surface hover:bg-on-surface-variant text-white py-3 rounded-xl font-bold text-sm shadow cursor-pointer transition-all"
                >
                  {t('modal_success_return', currentLang)}
                </button>

                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant justify-center mt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  Request logged with banking compliance parameters.
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
