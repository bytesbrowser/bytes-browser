export const removeAllAfterLastSlash = (path: string): string => {
  const lastSlashIndex = path.lastIndexOf(`\\`);
  if (lastSlashIndex === -1) return path; // No slash found
  return path.substring(0, lastSlashIndex + 1);
};
