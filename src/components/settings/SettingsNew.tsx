import { useEffect, useState } from 'react';
import Moment from 'react-moment';

import { getVersionStringFull } from '../../lib/utils/getVersion';

export const SettingsNew = () => {
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersionStringFull().then((v) => setVersion(v));
  }, []);

  return (
    <div>
      <p className="mb-4">App Version</p>
      <p
        className="opacity-50 text-sm mb-8"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        {version}
      </p>
      <p className="mb-4">Release Date</p>
      <p
        className="opacity-50 text-sm mb-8"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        <Moment date={new Date('Mon Oct 17 2023 00:00:00 GMT+0400')} />
      </p>
      <p className="mb-4">Release Impact</p>
      <p className="text-sm mb-8 text-red-500">High</p>
      <p className="mb-4">Release Notes</p>
      <p
        className="text-sm opacity-50 mb-4"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Fixes
      </p>
      <ul className="list-disc ml-8 text-sm">
        <li className="mb-4">Improved input validation</li>
        <li className="mb-4">Improved loading times and system performance.</li>
      </ul>
      <p
        className="text-sm opacity-50 mb-4"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Additions
      </p>
      <ul className="list-disc ml-8 text-sm">
        <li className="mb-4">Command Builder</li>
        <li className="mb-4">NPM and Cargo Project Manager</li>
      </ul>
      <p
        className="text-sm opacity-50 mb-4"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Known Issues
      </p>
      <ul className="list-disc ml-8 text-sm">
        <li className="mb-4">
          Shell has been disabled until it can be fixed. Only systems with bash installed will be able to use the
          command builder
        </li>
        <li className="mb-4">
          The project manager has been disabled programatically. Only systems with bash installed will be able to use
          the project manager for now.
        </li>
        <li className="mb-4">
          Commands created after startup will require a restart to be registered. This is known and is being adjusted.
        </li>
      </ul>
    </div>
  );
};
