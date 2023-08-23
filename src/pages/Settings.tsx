import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { SettingsAbout } from '../components/settings/SettingsAbout';
import { SettingsAccount } from '../components/settings/SettingsAccount';
import { SettingsNew } from '../components/settings/SettingsNew';
import { SettingsPerformance } from '../components/settings/SettingsPerformance';
import { SettingsProfiles } from '../components/settings/SettingsProfiles';
import { useGetSubscriptionStatusLazyQuery } from '../graphql';
import { settingsContentItems, settingsSidebarConfig } from '../lib/constants';
import { runtimeState } from '../lib/state/runtime.state';
import { Profile } from '../lib/types';

export const Settings = () => {
  const [settingsIndex, setSettingsIndex] = useState(0);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const navigate = useNavigate();
  const [getSubStatus] = useGetSubscriptionStatusLazyQuery();

  const logout = async () => {
    let profiles = await runtime.profileStore.get<Profile[]>('profiles');

    if (profiles) {
      if (profiles.length > 1) {
        let profilesWithSub: Profile[] = [];

        for (let i = 0; i < profiles.length; i++) {
          await getSubStatus({
            context: {
              headers: {
                Authorization: profiles[i].token,
              },
            },
            fetchPolicy: 'no-cache',
            nextFetchPolicy: 'no-cache',
          }).then((res) => {
            if (res.error) return;

            if (res.data?.getSubscriptionStatus.active && profiles) {
              profilesWithSub.push(profiles[i]);
            }
          });

          continue;
        }

        if (profilesWithSub.length === 1 && profilesWithSub[0].email === profiles[runtime.currentUser].email) {
          toast.error("You cannot logout with this profile because other profiles rely on it's subscription.");
          return;
        }

        profiles = profiles.filter((_, index) => index !== runtime.currentUser);
        await runtime.profileStore.set('profiles', profiles);
        setRuntime({
          ...runtime,
          currentUser: 0,
          readVolumes: false,
        });

        const titlebarLeft = document.getElementById('titlebar-left')!;
        if (titlebarLeft) {
          console.log('here');
          titlebarLeft.setAttribute('style', 'background-color: #27272D;');
        }

        navigate('/drive/' + 0);
      } else {
        await runtime.profileStore.clear();

        const titlebarLeft = document.getElementById('titlebar-left')!;
        if (titlebarLeft) {
          console.log('here');
          titlebarLeft.setAttribute('style', 'background-color: #27272D;');
        }

        setRuntime({
          ...runtime,
          currentUser: 0,
          readVolumes: false,
        });
        navigate('/');
      }
    }
  };

  return (
    <div className="px-8 pt-8 animate__animated animate__fadeIn overflow-hidden overflow-y-auto h-screen">
      <h1 className="text-2xl font-bold">App Settings</h1>
      <hr className="mt-4 opacity-20" />
      <div className="flex mt-8">
        <div className="settings-sidebar w-[150px]">
          {settingsSidebarConfig.map((item, key) => (
            <div
              onClick={() => setSettingsIndex(key)}
              className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-sidebar ${
                settingsIndex === key && 'bg-sidebar'
              } ${settingsIndex !== key && 'opacity-50'}`}
              key={key}
            >
              <p className="font-light text-sm">{item}</p>
            </div>
          ))}
          <div className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-error group`}>
            <p className="font-medium group-hover:text-white text-sm text-error" onClick={logout}>
              Logout
            </p>
          </div>
        </div>
        <div className="flex-1 mt-8 ml-8 pl-8 border-l border-gray-500 animate__animated animate__fadeIn">
          <p className="text-lg mb-4">{settingsContentItems[settingsIndex].title}</p>
          <p className="text-sm opacity-50">{settingsContentItems[settingsIndex].desc}</p>
          <div className="mt-8">
            {settingsContentItems[settingsIndex].title === 'My Account' && <SettingsAccount />}
            {settingsContentItems[settingsIndex].title === 'Profiles' && <SettingsProfiles />}
            {settingsContentItems[settingsIndex].title === 'About' && <SettingsAbout />}
            {settingsContentItems[settingsIndex].title === 'Performance' && <SettingsPerformance />}
            {settingsContentItems[settingsIndex].title === "What's New" && <SettingsNew />}
          </div>
        </div>
      </div>
    </div>
  );
};
