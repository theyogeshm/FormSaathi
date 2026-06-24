import React from 'react';
import { Clock, AlertOctagon, Globe } from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      title: 'Time Sink',
      badge: 'High Drop-off',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'Average customer spends 45 minutes filling complex loan applications or KYC documents.',
      icon: <Clock className="w-6 h-6 text-primary" />,
    },
    {
      title: 'Rejection',
      badge: 'High Error Rate',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Over 30% of manual forms are rejected due to simple transcription errors or missing fields.',
      icon: <AlertOctagon className="w-6 h-6 text-primary" />,
    },
    {
      title: 'Exclusion',
      badge: 'Accessibility Gap',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Forms in English/Hindi exclude millions of regional language speakers from formal finance.',
      icon: <Globe className="w-6 h-6 text-primary" />,
    },
  ];

  return (
    <section className="bg-white py-16 border-y border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-primary font-bold tracking-widest uppercase bg-surface-container px-4 py-1.5 rounded-full inline-block">
            The Form Problem
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Why banking feels like a chore
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
