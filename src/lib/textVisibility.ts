export function resolveTextVisible(globalSetting: boolean, override: boolean | null): boolean {
  return override === null ? globalSetting : override;
}
