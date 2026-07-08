import { supabase } from './supabase';
import type { Routine, RoutineStep, RenduType, RattachementType, GridConfig, PictoSource } from './types';

export async function createRoutine(params: {
  nom: string;
  typeRendu: RenduType;
  rattachementType: RattachementType;
  rattachementCodeEleve?: string;
  configGrille?: GridConfig;
}): Promise<Routine> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_routines')
    .insert({
      user_id: userData.user.id,
      nom: params.nom,
      type_rendu: params.typeRendu,
      rattachement_type: params.rattachementType,
      rattachement_code_eleve: params.rattachementCodeEleve ?? null,
      config_grille: params.configGrille ?? null,
      afficher_texte_global: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Routine;
}

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('ritu_routines')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Routine[];
}

export async function getRoutineWithSteps(
  routineId: string
): Promise<{ routine: Routine; steps: RoutineStep[] }> {
  const { data: routine, error: routineError } = await supabase
    .from('ritu_routines')
    .select('*')
    .eq('id', routineId)
    .single();
  if (routineError) throw routineError;

  const { data: steps, error: stepsError } = await supabase
    .from('ritu_steps')
    .select('*')
    .eq('routine_id', routineId)
    .order('ordre', { ascending: true });
  if (stepsError) throw stepsError;

  return { routine: routine as Routine, steps: (steps ?? []) as RoutineStep[] };
}

export async function addStep(params: {
  routineId: string;
  ordre: number;
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  horaire?: string;
  afficherTexteOverride?: boolean | null;
  positionGrille?: number;
}): Promise<RoutineStep> {
  const { data, error } = await supabase
    .from('ritu_steps')
    .insert({
      routine_id: params.routineId,
      ordre: params.ordre,
      libelle: params.libelle,
      picto_url: params.pictoUrl,
      picto_source: params.pictoSource,
      horaire: params.horaire ?? null,
      afficher_texte_override: params.afficherTexteOverride ?? null,
      position_grille: params.positionGrille ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineStep;
}
