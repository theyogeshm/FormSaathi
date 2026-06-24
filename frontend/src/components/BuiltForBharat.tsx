import React from 'react';
import { LANGUAGES } from '../data';

export default function BuiltForBharat() {
  return (
    <section className="bg-surface-container py-14 border-b border-outline-variant/15 relative overflow-hidden">
      {/* Visual background gradient circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 text-center relative z-10 space-y-8">
        
        <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
          Built for Bharat
        </h2>

        {/* Displaying Language Badges */}
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {LANGUAGES.map((lang) => (
            <span 
              key={lang.code}
              className="bg-white text-primary border border-outline-variant/30 px-6 py-2.5 rounded-full font-bold shadow-sm hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-default"
            >
              {lang.nativeName}
            </span>
          ))}
          <span className="bg-white text-secondary border border-outline-variant/30 px-6 py-2.5 rounded-full font-extrabold shadow-sm hover:border-secondary hover:bg-secondary/5 transition-all duration-200 cursor-default">
            +18 More Languages
          </span>
        </div>

        {/* Powered by credentials */}
        <p className="font-body-lg text-lg text-on-surface-variant italic leading-relaxed pt-2">
          Powered by <span className="font-bold text-primary">Bhashini</span> &amp; <span className="font-bold text-primary">AI4Bharat</span>
        </p>

      </div>
    </section>
  );
}
