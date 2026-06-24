import React, { useEffect, useState } from 'react';
import { Bolt, RotateCcw } from 'lucide-react';
import { STEPS } from '../data';
import { t } from '../translations';

interface HowItWorksProps {
  currentLang: string;
}

export default function HowItWorks({ currentLang }: HowItWorksProps) {
  const [successScore, setSuccessScore] = useState(0);

  // Animate the circular progress gauge on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setSuccessScore(98);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Circle path math
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (successScore / 100) * circumference;

  const translatedSteps = STEPS.map((step) => {
    let titleKey = '';
    let descKey = '';
    if (step.num === 1) {
      titleKey = 'how_step_1_title';
      descKey = 'how_step_1_desc';
    } else if (step.num === 2) {
      titleKey = 'how_step_2_title';
      descKey = 'how_step_2_desc';
    } else if (step.num === 3) {
      titleKey = 'how_step_3_title';
      descKey = 'how_step_3_desc';
    } else if (step.num === 4) {
      titleKey = 'how_step_4_title';
      descKey = 'how_step_4_desc';
    }
    return {
      ...step,
      title: t(titleKey, currentLang),
      description: t(descKey, currentLang),
    };
  });

  return (
    <section id="how-it-works" className="bg-surface-container py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Steps Description */}
          <div className="space-y-12">
            <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
              {t('how_headline', currentLang)}
            </h2>

            <div className="space-y-10">
              {translatedSteps.map((step) => (
                <div 
                  key={step.num}
                  className="flex gap-6 items-start hover:translate-x-1 transition-transform duration-300"
                  id={`step-container-${step.num}`}
                >
                  {/* Step Image / Icon */}
                  <div className="flex-shrink-0">
                    {step.imageUrl ? (
                      <div className="w-16 h-16 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center overflow-hidden">
                        <img 
                          alt={step.title} 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                          src={step.imageUrl}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 shadow-sm flex items-center justify-center text-primary font-bold text-2xl">
                        {step.num === 3 ? (
                          <Bolt className="w-8 h-8 text-primary" />
                        ) : (
                          <RotateCcw className="w-8 h-8 text-primary" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step Text */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl text-on-surface">
                      {step.title}
                    </h3>
                    <p className="text-body-md text-on-surface-variant leading-relaxed max-w-lg">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Circular Success Gauge Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative bg-white rounded-[32px] p-10 w-full max-w-sm shadow-xl border border-outline-variant/30 flex flex-col items-center text-center hover:shadow-2xl transition-shadow duration-300">
              
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle 
                    cx="80" 
                    cy="80" 
                    r={radius} 
                    className="stroke-surface-container-highest" 
                    strokeWidth="12" 
                    fill="transparent" 
                  />
                  {/* Animated Progress */}
                  <circle 
                    cx="80" 
                    cy="80" 
                    r={radius} 
                    className="stroke-green-500 transition-all duration-1000 ease-out" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold text-on-surface tracking-tight">
                    {successScore}%
                  </span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider mt-1.5 border border-green-200">
                    {t('how_gauge_label', currentLang)}
                  </span>
                </div>
              </div>

              {/* Bottom Labels */}
              <div className="mt-4 space-y-1">
                <h4 className="text-lg font-bold text-on-surface">{t('how_gauge_title', currentLang)}</h4>
                <p className="text-sm text-on-surface-variant max-w-[240px]">
                  {t('how_gauge_desc', currentLang)}
                </p>
              </div>

              {/* Micro-interaction decoration */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {t('how_live_validated', currentLang)}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
