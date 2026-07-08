import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from './supabase';
import { mapArasaacResponse, type Pictogram } from './arasaacMapper';

export async function searchPictograms(word: string, language = 'fr'): Promise<Pictogram[]> {
  const { data, error } = await supabase.functions.invoke('search-pictograms', {
    body: { word, language },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  return mapArasaacResponse(data);
}
