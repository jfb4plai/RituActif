// src/lib/communication.ts
import { supabase } from './supabase';
import { moveItem } from './reorder';
import type {
  CommunicationBoard,
  CommunicationItem,
  CommunicationCategory,
  PictoSource,
  CommunicationDefaults,
  CommunicationMode,
} from './types';

export async function getOrCreateBoard(codeEleve: string): Promise<CommunicationBoard> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .upsert(
      { user_id: userData.user.id, rattachement_code_eleve: codeEleve },
      { onConflict: 'user_id,rattachement_code_eleve' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function listCommunicationBoards(): Promise<CommunicationBoard[]> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CommunicationBoard[];
}

export async function getBoardWithItems(
  boardId: string
): Promise<{ board: CommunicationBoard; items: CommunicationItem[] }> {
  const { data: board, error: boardError } = await supabase
    .from('ritu_communication_boards')
    .select('*')
    .eq('id', boardId)
    .single();
  if (boardError) throw boardError;

  const { data: items, error: itemsError } = await supabase
    .from('ritu_communication_items')
    .select('*')
    .eq('board_id', boardId)
    .order('ordre', { ascending: true });
  if (itemsError) throw itemsError;

  return { board: board as CommunicationBoard, items: (items ?? []) as CommunicationItem[] };
}

export async function addCommunicationItem(params: {
  boardId: string;
  categorie: CommunicationCategory;
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  ordre: number;
}): Promise<CommunicationItem> {
  const { data, error } = await supabase
    .from('ritu_communication_items')
    .insert({
      board_id: params.boardId,
      categorie: params.categorie,
      libelle: params.libelle,
      picto_url: params.pictoUrl,
      picto_source: params.pictoSource,
      ordre: params.ordre,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationItem;
}

export async function removeCommunicationItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('ritu_communication_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function markConsentValidated(boardId: string): Promise<CommunicationBoard> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .update({ consentement_valide_at: new Date().toISOString() })
    .eq('id', boardId)
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function recordPhrase(boardId: string, phraseTexte: string): Promise<void> {
  const { error } = await supabase
    .from('ritu_phrases_log')
    .insert({ board_id: boardId, phrase_texte: phraseTexte });
  if (error) throw error;
}

export async function getDefaults(): Promise<CommunicationDefaults | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_defaults')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as CommunicationDefaults | null;
}

export async function upsertDefaults(params: {
  modeDefaut: CommunicationMode;
  holdMs: number;
  selectOnRelease: boolean;
}): Promise<CommunicationDefaults> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_defaults')
    .upsert(
      {
        user_id: userData.user.id,
        mode_defaut: params.modeDefaut,
        hold_ms: params.holdMs,
        select_on_release: params.selectOnRelease,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationDefaults;
}

export async function updateBoardSettings(
  boardId: string,
  params: { mode: CommunicationMode | null; holdMs: number | null; selectOnRelease: boolean | null }
): Promise<CommunicationBoard> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .update({ mode: params.mode, hold_ms: params.holdMs, select_on_release: params.selectOnRelease })
    .eq('id', boardId)
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function persistReorder(
  itemsInCategory: CommunicationItem[],
  itemId: string,
  direction: 'up' | 'down'
): Promise<CommunicationItem[]> {
  const reordered = moveItem(itemsInCategory, itemId, direction);
  const changed = reordered.filter((item) => {
    const before = itemsInCategory.find((i) => i.id === item.id);
    return before && before.ordre !== item.ordre;
  });

  await Promise.all(
    changed.map((item) =>
      supabase.from('ritu_communication_items').update({ ordre: item.ordre }).eq('id', item.id)
    )
  );

  return reordered;
}
