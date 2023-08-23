import { useEffect, useState } from 'react';
import Moment from 'react-moment';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../../lib/state/runtime.state';
import { Profile } from '../../lib/types';

export const SettingsProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runtime, setRuntime] = useRecoilState(runtimeState);

  useEffect(() => {
    getProfiles();
  }, []);

  const getProfiles = async () => {
    if (runtime.profileStore) {
      const profs = await runtime.profileStore.get<Profile[]>('profiles');

      if (profs) {
        setProfiles(profs);
      }
    }
  };

  return (
    <>
      <h2>Profiles Signed In On This Device</h2>
      <div className="profiles pb-20">
        {profiles.map((profile, key) => (
          <div key={key} className="mt-8 border-t border-white border-opacity-10">
            <img src={profile.avatar} alt="" className="w-20 h-20 rounded-full my-6" />
            <p className="font-light mb-4">{profile.name}</p>
            <p className="opacity-50 mb-4">
              Added <Moment date={profile.addedOn} fromNow />
            </p>
            <p className="opacity-50 mb-8">
              Last Signed In <Moment date={profile.lastUsed} fromNow />
            </p>

            {profiles.length >= 2 ? (
              <p className="bg-error mb-8 p-3 max-w-[250px] rounded mt-4 text-center transition-all hover:opacity-50">
                Remove From This Device
              </p>
            ) : (
              <p className="text-xs opacity-50">
                Cannot remove from device. This profile is the only profile present. You must logout.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
