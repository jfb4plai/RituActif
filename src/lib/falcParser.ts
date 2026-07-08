export function parseFalcSteps(simplifiedText: string): string[] {
  return simplifiedText
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((line) => line.length > 0);
}
