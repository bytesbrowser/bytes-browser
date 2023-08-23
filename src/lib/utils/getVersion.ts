import { invoke } from '@tauri-apps/api';
import { getVersion } from '@tauri-apps/api/app';

export const getVersionString = async () => {
  const appVersion = await getVersion();
  const hash: string = await invoke('get_environment_variable', { name: 'REACT_APP_VERSION' });
  return `v${appVersion} - ${shortenCommitHash(hash)}`;
};

export const getVersionStringFull = async () => {
  const appVersion = await getVersion();
  const hash: string = await invoke('get_environment_variable', { name: 'REACT_APP_VERSION' });
  return `v${appVersion} - ${hash}`;
};

const shortenCommitHash = (val: string) => {
  return val.substring(0, 7);
};
