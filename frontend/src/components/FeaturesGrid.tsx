import React from 'react';
import { FEATURES } from '../data';
import { t } from '../translations';

interface FeaturesGridProps {
  currentLang: string;
}

export default function FeaturesGrid({ currentLang }: FeaturesGridProps) {
  return (
    <section id="features" className="bg-white py-16 border-y border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Title */}
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-primary font-bold tracking-widest uppercase bg-surface-container px-4 py-1.5 rounded-full inline-block">
            {t('feat_badge', currentLang)}
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            {t('feat_headline', currentLang)}
          </h2>
        </div>

        {/* Features Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feat) => {
            const translatedTitle = t(`feat_${feat.id}_title`, currentLang);
            const translatedDesc = t(`feat_${feat.id}_desc`, currentLang);
            return (
              <div 
                key={feat.id}
                className="relative p-7 pt-10 bg-surface-container-low rounded-[28px] border border-outline-variant/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                id={`feature-card-${feat.id}`}
              >
              {/* Hotlinked 3D Icon Badge */}
              <div className="absolute -top-5 -left-5 w-16 h-16 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 drop-shadow-md">
                <img 
                  alt={feat.title} 
                  className="w-full h-full object-contain filter drop-shadow-md" 
                  referrerPolicy="no-referrer"
                  src={feat.icon}
                />
              </div>

              {/* Card Text Content */}
              <div className="pt-5">
                <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">
                  {translatedTitle}
                </h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed text-sm">
                  {translatedDesc}
                </p>
              </div>
            </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
