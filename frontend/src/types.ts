export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Bank {
  id: string;
  name: string;
  logo: string;
}

export interface DemoDocument {
  id: string;
  name: string;
  type: 'aadhaar' | 'pan' | 'form';
  image: string;
  fields: Record<string, string>;
}

export interface FormField {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  type: 'text' | 'date' | 'select' | 'tel';
  options?: string[];
  confidence: number;
  mappedFrom?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  bankName: string;
  fields: FormField[];
}

export type ShowcaseTab = 'photo' | 'voice' | 'search';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

export interface StepItem {
  num: number;
  title: string;
  description: string;
  imageUrl?: string;
  icon?: string;
}

export interface ImpactStat {
  id: string;
  value: string;
  label: string;
  sub: string;
  pct: number;
  tag: string;
  icon: string;
}
