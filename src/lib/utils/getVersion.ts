import { getVersion } from '@tauri-apps/api/app';

export const getVersionString = async () => {
  const appVersion = await getVersion();
  const hash: string = import.meta.env.VITE_APP_VERSION ?? 'bc02be68bd875a0c4621ea4df3d99e9c39bb8eb0';
  return `v${appVersion} - ${shortenCommitHash(hash)}`;
};

export const getVersionStringFull = async () => {
  const appVersion = await getVersion();
  const hash: string = import.meta.env.VITE_APP_VERSION ?? 'bc02be68bd875a0c4621ea4df3d99e9c39bb8eb0';
  return `v${appVersion} - ${hash}`;
};

const shortenCommitHash = (val: string) => {
  return val.substring(0, 7);
};
