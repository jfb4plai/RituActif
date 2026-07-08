import { supabase } from './supabase';
import { parseFalcSteps } from './falcParser';

export async function simplifyConsigne(text: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('simplify-consigne-falc', {
    body: { text },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return parseFalcSteps(data?.simplifiedText ?? '');
}
