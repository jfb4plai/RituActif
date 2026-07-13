import type { CommunicationCategory } from './types';

export interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_ORDER: CommunicationCategory[] = [
  'personnes',
  'actions',
  'descriptifs',
  'social',
  'objets',
  'sentiments',
];

export const CATEGORY_META: Record<CommunicationCategory, CategoryMeta> = {
  personnes: { label: 'Personnes', color: '#fbbf24' },
  actions: { label: 'Actions', color: '#34d399' },
  descriptifs: { label: 'Descriptifs', color: '#60a5fa' },
  social: { label: 'Petits mots sociaux', color: '#f472b6' },
  objets: { label: 'Objets / lieux', color: '#fb923c' },
  sentiments: { label: 'Sentiments', color: '#a78bfa' },
};
