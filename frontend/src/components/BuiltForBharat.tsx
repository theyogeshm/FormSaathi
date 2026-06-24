import React from 'react';
import { LANGUAGES } from '../data';
import { t } from '../translations';

interface BuiltForBharatProps {
  currentLang: string;
}

export default function BuiltForBharat({ currentLang }: BuiltForBharatProps) {
  return (
    <section className="bg-surface-container py-14 border-b border-outline-variant/15 relative overflow-hidden">
      {/* Visual background gradient circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 text-center relative z-10 space-y-8">
        
        <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
          {t('built_for_bharat', currentLang)}
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
            {t('more_languages', currentLang)}
          </span>
        </div>

        {/* Powered by credentials */}
        <p className="font-body-lg text-lg text-on-surface-variant italic leading-relaxed pt-2">
          {t('powered_by', currentLang)}
        </p>

      </div>
    </section>
  );
}
