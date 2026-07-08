import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from './supabase';
import { parseFalcSteps } from './falcParser';

export async function simplifyConsigne(text: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('simplify-consigne-falc', {
    body: { text },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  return parseFalcSteps(data?.simplifiedText ?? '');
}
