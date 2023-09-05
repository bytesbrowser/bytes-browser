import { app, os } from '@tauri-apps/api';
import { useEffect, useState } from 'react';

import { getVersionStringFull } from '../../lib/utils/getVersion';

export const SettingsAbout = () => {
  const [version, setVersion] = useState('');
  const [meta, setMeta] = useState({ tauriVersion: '', osVersion: '', locale: '', platform: '', arch: '' });

  useEffect(() => {
    getVersionStringFull().then((v) => setVersion(v));
    getMeta();
  }, []);

  const getMeta = async () => {
    const tauriV = await app.getTauriVersion();
    const osVersion = await os.version();
    const locale = await os.locale();
    const platform = await os.platform();
    const arch = await os.arch();

    setMeta({
      tauriVersion: tauriV,
      osVersion,
      locale: locale ?? 'N/A',
      platform,
      arch,
    });
  };

  return (
    <div className="bg-black p-4 rounded-md">
      <p className="font-mono my-8 text-white">App Version: {version}</p>
      <p className="font-mono my-8 text-white">Embedded Version: {meta.tauriVersion}</p>
      <p className="font-mono my-8 text-white">OS Version: {meta.osVersion}</p>
      <p className="font-mono my-8 text-white">OS Locale: {meta.locale}</p>
      <p className="font-mono my-8 text-white">OS Platform: {meta.platform}</p>
      <p className="font-mono my-8 text-white">OS Arch: {meta.arch}</p>
      <p className="font-mono my-8 text-white">License: Activated</p>
    </div>
  );
};
