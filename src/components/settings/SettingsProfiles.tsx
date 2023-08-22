import { useRecoilState } from "recoil";
import { Profile } from "../../lib/types";
import { useState, useEffect } from "react";
import { runtimeState } from "../../lib/state/runtime.state";
import Moment from "react-moment";

export const SettingsProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runtime, setRuntime] = useRecoilState(runtimeState);

  useEffect(() => {
    getProfiles();
  }, []);

  const getProfiles = async () => {
    if (runtime.profileStore) {
      const profs = await runtime.profileStore.get<Profile[]>("profiles");

      if (profs) {
        setProfiles(profs);
      }
    }
  };

  return (
    <>
      <h2>Profiles Signed In On This Device</h2>
      <div className="profiles">
        {profiles.map((profile, key) => (
          <div key={key}>
            <img src={profile.avatar} alt="" />
            <p>{profile.name}</p>
            <p>
              Added <Moment date={profile.addedOn} fromNow />
            </p>
            <p>
              Last Signed In <Moment date={profile.lastUsed} fromNow />
            </p>
            <p className="bg-error">Remove From This Device</p>
          </div>
        ))}
      </div>
    </>
  );
};
