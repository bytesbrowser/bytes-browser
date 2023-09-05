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
        <Moment ago date={new Date()} />
      </p>
      <p className="mb-4">Release Impact</p>
      <p className="text-sm mb-8 text-success">Low</p>
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
        <li className="mb-4">Improved caching and performance on all systems</li>
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
        <li className="mb-4">Improved login flow</li>
        <li className="mb-4">New settings pages</li>
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
        <li className="mb-4">No known issues</li>
      </ul>
    </div>
  );
};
