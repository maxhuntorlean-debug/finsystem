export function sanitizeIdentifier(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export function findDuplicateIdentifier<T extends { id: string; name: string }>(
  name: string,
  currentId: string,
  items: T[],
): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return items.some(
    (item) =>
      item.id !== currentId && item.name.trim().toLowerCase() === normalized,
  );
}
