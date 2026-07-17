export type RenduType = 'sequentiel' | 'emploi_du_temps' | 'grille';
export type RattachementType = 'classe' | 'eleve';
export type PictoSource = 'arasaac' | 'perso';
export type PageFormat = 'a4-portrait' | 'a4-paysage';

export interface GridConfig {
  rows: number;
  cols: number;
  pageFormat: PageFormat;
}

export interface Routine {
  id: string;
  user_id: string;
  nom: string;
  type_rendu: RenduType;
  rattachement_type: RattachementType;
  rattachement_code_eleve: string | null;
  config_grille: GridConfig | null;
  afficher_texte_global: boolean;
  created_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  ordre: number;
  libelle: string;
  picto_url: string;
  picto_source: PictoSource;
  horaire: string | null;
  afficher_texte_override: boolean | null;
  position_grille: number | null;
}

export type CommunicationCategory = 'personnes' | 'actions' | 'descriptifs' | 'social' | 'objets' | 'sentiments';
export type CommunicationMode = 'pictogrammes' | 'letterboard';

export interface CommunicationBoard {
  id: string;
  user_id: string;
  rattachement_code_eleve: string;
  consentement_valide_at: string | null;
  created_at: string;
  mode: CommunicationMode | null;
  hold_ms: number | null;
  select_on_release: boolean | null;
}

export interface CommunicationItem {
  id: string;
  board_id: string;
  categorie: CommunicationCategory;
  libelle: string;
  picto_url: string;
  picto_source: PictoSource;
  ordre: number;
}

export interface CommunicationDefaults {
  user_id: string;
  mode_defaut: CommunicationMode;
  hold_ms: number;
  select_on_release: boolean;
  updated_at: string;
}
