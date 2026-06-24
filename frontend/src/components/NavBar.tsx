import React, { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

interface NavBarProps {
  onTryDemo: () => void;
}

export default function NavBar({ onTryDemo }: NavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 cursor-pointer group"
          id="nav-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform duration-300">
            FS
          </div>
          <span className="font-headline-md text-2xl font-extrabold text-primary tracking-tight">
            FormSaathi
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-8 items-center" id="nav-desktop-links">
          <button 
            onClick={() => scrollToSection('solution')} 
            className="text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            Solution
          </button>
          <button 
            onClick={() => scrollToSection('how-it-works')} 
            className="text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button 
            onClick={() => scrollToSection('showcase')} 
            className="text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            Interactive Demo
          </button>
          <button 
            onClick={() => scrollToSection('features')} 
            className="text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            Features
          </button>

        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={onTryDemo}
            className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
            id="nav-cta-btn"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Request a Demo
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-on-surface hover:text-primary p-2 transition-colors cursor-pointer"
          id="nav-mobile-toggle"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-t border-outline-variant/40 px-6 py-4 space-y-4 absolute left-0 w-full shadow-xl animate-fade-in-down" id="nav-mobile-menu">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => scrollToSection('solution')}
              className="text-left text-body-md font-semibold text-on-surface-variant hover:text-primary py-2 border-b border-outline-variant/10 cursor-pointer"
            >
              Solution
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-left text-body-md font-semibold text-on-surface-variant hover:text-primary py-2 border-b border-outline-variant/10 cursor-pointer"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('showcase')}
              className="text-left text-body-md font-semibold text-on-surface-variant hover:text-primary py-2 border-b border-outline-variant/10 cursor-pointer"
            >
              Interactive Demo
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="text-left text-body-md font-semibold text-on-surface-variant hover:text-primary py-2 border-b border-outline-variant/10 cursor-pointer"
            >
              Features
            </button>

            
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                onTryDemo();
              }}
              className="w-full bg-primary text-on-primary py-3 rounded-full font-bold text-center shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Request a Demo
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
