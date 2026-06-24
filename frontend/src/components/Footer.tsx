import React from 'react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-tertiary text-tertiary-fixed py-12 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Brand Column (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <div 
            onClick={scrollToTop}
            className="font-headline-md text-2xl font-extrabold text-white tracking-tight cursor-pointer inline-block hover:opacity-90 transition-opacity"
          >
            FormSaathi
          </div>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            Agentic AI bridge between traditional banking and modern efficiency. Built for institutional reliability.
          </p>
        </div>

        {/* Product links (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h6 className="font-bold text-xs uppercase tracking-widest text-white">Product</h6>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#solution" className="hover:text-secondary-container transition-colors whitespace-nowrap">Solutions</a></li>
            <li><a href="#features" className="hover:text-secondary-container transition-colors whitespace-nowrap">Security</a></li>
            <li><a href="#how-it-works" className="hover:text-secondary-container transition-colors whitespace-nowrap">API Documentation</a></li>
          </ul>
        </div>

        {/* Company links (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h6 className="font-bold text-xs uppercase tracking-widest text-white">Company</h6>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">About Us</a></li>
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">Careers</a></li>
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">Press Kit</a></li>
          </ul>
        </div>

        {/* Legal links (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h6 className="font-bold text-xs uppercase tracking-widest text-white">Legal</h6>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">Terms of Service</a></li>
            <li><a href="#" className="hover:text-secondary-container transition-colors whitespace-nowrap">Compliance</a></li>
          </ul>
        </div>

      </div>

      {/* Bottom section line */}
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
        <p>© 2024-2026 FormSaathi AI. Effortless Security in Banking.</p>
        <p className="hover:text-white transition-colors cursor-pointer" onClick={scrollToTop}>Back to Top ↑</p>
      </div>

    </footer>
  );
}
