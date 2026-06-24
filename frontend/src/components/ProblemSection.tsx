import React from 'react';
import { Clock, AlertOctagon, Globe } from 'lucide-react';
import { t } from '../translations';

interface ProblemSectionProps {
  currentLang: string;
}

export default function ProblemSection({ currentLang }: ProblemSectionProps) {
  const problems = [
    {
      title: t('prob_time_sink', currentLang),
      badge: t('prob_high_dropoff', currentLang),
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      description: t('prob_time_sink_desc', currentLang),
      icon: <Clock className="w-6 h-6 text-primary" />,
    },
    {
      title: t('prob_rejection', currentLang),
      badge: t('prob_high_error', currentLang),
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      description: t('prob_rejection_desc', currentLang),
      icon: <AlertOctagon className="w-6 h-6 text-primary" />,
    },
    {
      title: t('prob_exclusion', currentLang),
      badge: t('prob_accessibility', currentLang),
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      description: t('prob_exclusion_desc', currentLang),
      icon: <Globe className="w-6 h-6 text-primary" />,
    },
  ];

  return (
    <section className="bg-white py-16 border-y border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-primary font-bold tracking-widest uppercase bg-surface-container px-4 py-1.5 rounded-full inline-block">
            {t('prob_badge', currentLang)}
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            {t('prob_headline', currentLang)}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((prob, index) => (
            <div 
              key={index}
              className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              id={`problem-card-${index}`}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <div className="group-hover:text-white text-primary transition-colors">
                  {prob.icon}
                </div>
              </div>

              <div className="flex justify-between items-center mb-4 gap-2">
                <h3 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                  {prob.title}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${prob.badgeBg}`}>
                  {prob.badge}
                </span>
              </div>

              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {prob.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
