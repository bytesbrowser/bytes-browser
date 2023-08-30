export const getMountPointFromPathName = (pathName: string): string => {
  if (!pathName) {
    return '';
  }

  // Split the path into segments
  const segments = pathName.split('/');

  // Assuming the first segment after an initial '/' is the mount point
  return segments.length > 1 ? segments[1] : '';
};
