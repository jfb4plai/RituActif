export interface Pictogram {
  id: number;
  url: string;
  keywords: string[];
}

interface RawPictogram {
  id?: number;
  url?: string;
  keywords?: string[];
}

export function mapArasaacResponse(json: unknown): Pictogram[] {
  if (!json || typeof json !== 'object' || !('pictograms' in json)) {
    return [];
  }
  const pictograms = (json as { pictograms: unknown }).pictograms;
  if (!Array.isArray(pictograms)) return [];

  return pictograms
    .filter((p): p is RawPictogram => typeof p === 'object' && p !== null)
    .map((p) => ({
      id: Number(p.id ?? 0),
      url: String(p.url ?? ''),
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
    }))
    .filter((p) => p.id !== 0 && p.url !== '');
}
