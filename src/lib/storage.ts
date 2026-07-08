import { supabase } from './supabase';

export async function uploadPersoPicto(file: File): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('ritu-pictos')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('ritu-pictos').getPublicUrl(path);
  return data.publicUrl;
}
