// src/lib/letterboard.ts
export const ALPHABET_FR: string[] = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'é', 'è', 'à', 'ç', 'ù', 'â', 'ê', 'î', 'ô', 'û', 'ï',
];

export function appendChar(message: string, char: string): string {
  return message + char;
}

export function backspace(message: string): string {
  return message.slice(0, -1);
}

export function applyCase(message: string, uppercase: boolean): string {
  return uppercase ? message.toLocaleUpperCase('fr-FR') : message.toLocaleLowerCase('fr-FR');
}
