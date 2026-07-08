import { supabase } from './supabase';
import { mapArasaacResponse, type Pictogram } from './arasaacMapper';

export async function searchPictograms(word: string, language = 'fr'): Promise<Pictogram[]> {
  const { data, error } = await supabase.functions.invoke('search-pictograms', {
    body: { word, language },
  });
  if (error) throw error;
  return mapArasaacResponse(data);
}
