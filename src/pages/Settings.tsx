import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Moment from 'react-moment';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useRecoilState } from 'recoil';

import { SettingsAbout } from '../components/settings/SettingsAbout';
import { SettingsAccount } from '../components/settings/SettingsAccount';
import { SettingsNew } from '../components/settings/SettingsNew';
import { SettingsPerformance } from '../components/settings/SettingsPerformance';
import { SettingsProfiles } from '../components/settings/SettingsProfiles';
import { useGetSubscriptionStatusLazyQuery } from '../graphql';
import {
  BytesBrowserDarkTheme,
  BytesBrowserLightTheme,
  settingsContentItems,
  settingsSidebarConfig,
} from '../lib/constants';
import { runtimeState } from '../lib/state/runtime.state';
import { themeState as themeProvider } from '../lib/state/theme.state';
import { Profile } from '../lib/types';

export const Settings = () => {
  const [settingsIndex, setSettingsIndex] = useState(0);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const navigate = useNavigate();
  const [getSubStatus] = useGetSubscriptionStatusLazyQuery();
  const [themeState, setThemeState] = useRecoilState(themeProvider);

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

        await runtime.profileStore.save();

        setRuntime({
          ...runtime,
          currentUser: 0,
          readVolumes: false,
        });

        const titlebarLeft = document.getElementById('titlebar-left')!;
        if (titlebarLeft) {
          titlebarLeft.setAttribute('style', 'background-color: var(--primary-bg);');
        }

        navigate('/drive/' + 0);
      } else {
        await runtime.profileStore.clear();

        const titlebarLeft = document.getElementById('titlebar-left')!;
        if (titlebarLeft) {
          titlebarLeft.setAttribute('style', 'background-color: var(--primary-bg);');
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
      <h1
        className="text-2xl font-medium"
        style={{
          color: 'var(--primary-text-color)',
        }}
      >
        App Settings
      </h1>
      <hr
        className="mt-4 opacity-20"
        style={{
          borderColor: 'var(--primary-border-color)',
        }}
      />
      <div className="flex mt-8">
        <div className="settings-sidebar w-[150px]">
          {settingsSidebarConfig.map((item, key) => (
            <div
              onClick={() => setSettingsIndex(key)}
              className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-sidebar`}
              key={key}
              style={{
                opacity: settingsIndex === key ? 1 : 0.8,
                backgroundColor: settingsIndex === key ? 'var(--sidebar-inset-bg)' : 'transparent',
              }}
            >
              <p
                className="font-light text-sm"
                style={{
                  color: settingsIndex === key ? 'var(--sidebar-inset-text-color)' : 'var(--primary-text-color)',
                }}
              >
                {item}
              </p>
            </div>
          ))}
          <div className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-error group`}>
            <p className="font-medium group-hover:text-white text-sm text-error" onClick={logout}>
              Logout
            </p>
          </div>
        </div>
        <div
          className="flex-1 mt-8 ml-8 pl-8 border-l animate__animated animate__fadeIn"
          style={{
            borderColor: 'var(--primary-border-color)',
          }}
        >
          <p className="text-lg mb-4">{settingsContentItems[settingsIndex].title}</p>
          <p
            className="text-sm"
            style={{
              opacity: 'var(--light-text-opacity)',
            }}
          >
            {settingsContentItems[settingsIndex].desc}
          </p>
          <div className="mt-8">
            {settingsContentItems[settingsIndex].title === 'My Account' && <SettingsAccount />}
            {settingsContentItems[settingsIndex].title === 'Profiles' && <SettingsProfiles />}
            {settingsContentItems[settingsIndex].title === 'About' && <SettingsAbout />}
            {settingsContentItems[settingsIndex].title === 'Performance' && <SettingsPerformance />}
            {settingsContentItems[settingsIndex].title === "What's New" && <SettingsNew />}
            {settingsContentItems[settingsIndex].title === 'Appearance' && (
              <div>
                <p className="mb-8">Choose your app's theme</p>
                <Select
                  value={{ value: themeState.currentTheme?.id, label: themeState.currentTheme?.name }}
                  styles={{
                    option: (styles) => ({
                      ...styles,
                      color: '#FFFFFF',
                      backgroundColor: '#1C1B20',
                      '&:hover': {
                        backgroundColor: '#27272D',
                      },
                      fontSize: '12px',
                    }),
                    container: (styles) => ({
                      ...styles,
                      width: '350px',
                      backgroundColor: '#1C1B20',
                      fontSize: '12px',
                    }),
                    control: (styles) => ({
                      ...styles,
                      backgroundColor: '#1C1B20',
                      borderColor: '#27272D',
                    }),
                    singleValue: (styles) => ({
                      ...styles,
                      color: '#FFFFFF',
                    }),
                    menu: (styles) => ({
                      ...styles,
                      backgroundColor: '#1C1B20',
                    }),
                  }}
                  options={[...themeState.themes].map((theme) => ({
                    value: theme.id,
                    label: theme.name,
                  }))}
                  onChange={(e) => {
                    setThemeState({
                      ...themeState,
                      config: themeState.themes.find((theme) => theme.id === e?.value)!.content,
                      currentTheme: themeState.themes.find((theme) => theme.id === e?.value)!,
                      theme: themeState.themes.find((theme) => theme.id === e?.value)!.name,
                    });
                  }}
                />
                <div
                  className="mt-8 rounded-lg p-4 w-1/2 shadow-lg"
                  style={{
                    backgroundColor: 'var(--sidebar-bg)',
                  }}
                >
                  <img src={themeState.currentTheme?.icon} className="w-20 rounded-md" />
                  <p className="mt-4 font-medium">{themeState.currentTheme?.name}</p>
                  <p className="mt-4 opacity-80 text-xs">
                    Created By {themeState.currentTheme?.created_by_alias}{' '}
                    <Moment fromNow date={themeState.currentTheme?.created_at} />
                  </p>
                  <p className="mt-4 opacity-80 text-xs">V{themeState.currentTheme?.version}</p>
                  <p className="mt-4">{themeState.currentTheme?.description ?? 'No Description.'}</p>
                  <p
                    style={{
                      color: 'var(--sidebar-inset-text-color)',
                      opacity: themeState.currentTheme?.id === '-1' ? '50%' : '100%',
                    }}
                    className="bg-error p-2 text-sm max-w-[250px] rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                  >
                    Uninstall
                  </p>
                  {themeState.currentTheme?.id === '-1' && (
                    <p className="text-sm mt-4">Cannot remove from device. This is a default theme.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
