import { invoke } from '@tauri-apps/api';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Moment from 'react-moment';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useRecoilState } from 'recoil';

import { NoInternetFeature } from '../components/NoInternetFeature';
import { SettingsAbout } from '../components/settings/SettingsAbout';
import { SettingsAccount } from '../components/settings/SettingsAccount';
import { SettingsNew } from '../components/settings/SettingsNew';
import { SettingsPerformance } from '../components/settings/SettingsPerformance';
import { SettingsProfiles } from '../components/settings/SettingsProfiles';
import { Theme, useGetSubscriptionStatusLazyQuery, useGetThemesQuery } from '../graphql';
import { settingsContentItems, settingsSidebarConfig } from '../lib/constants';
import { runtimeState } from '../lib/state/runtime.state';
import { themeState as themeProvider } from '../lib/state/theme.state';
import { Profile, ProfileStore } from '../lib/types';

export const Settings = () => {
  const [settingsIndex, setSettingsIndex] = useState(0);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const navigate = useNavigate();
  const [getSubStatus] = useGetSubscriptionStatusLazyQuery();
  const [themeState, setThemeState] = useRecoilState(themeProvider);
  const { data } = useGetThemesQuery({
    fetchPolicy: 'cache-and-network',
  });

  console.log(data);

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

  const onInstall = (theme: Theme) => {
    invoke('install_theme', {
      theme: {
        name: theme.name,
        content: JSON.stringify(theme.content),
        icon: theme.icon,
        version: theme.version,
        created_at: theme.created_at,
        created_by_alias: theme.created_by_alias,
        description: theme.description,
        updated_at: theme.updated_at,
      },
    })
      .then((res) => {
        console.log(res);
        setThemeState({
          ...themeState,
          themes: [...themeState.themes, theme],
        });
        toast.success('Theme installed successfully.');
      })
      .catch((err) => {
        toast.error('Could not install theme. Try again later.');
        console.error(err);
      });
  };

  const onUninstall = (theme: Theme) => {
    invoke('remove_theme', {
      themeNameToRemove: theme.name,
    })
      .then(() => {
        if (theme.name === themeState.currentTheme?.name) {
          setThemeState({
            ...themeState,
            themes: themeState.themes.filter((localTheme) => localTheme.name !== theme.name),
            currentTheme: themeState.themes[0],
            config: themeState.themes[0].content,
            theme: themeState.themes[0].name,
          });
        } else {
          setThemeState({
            ...themeState,
            themes: themeState.themes.filter((localTheme) => localTheme.name !== theme.name),
          });
        }

        toast.success('Theme uninstalled successfully.');
      })
      .catch((err) => {
        toast.error('Could not uninstall theme. Try again later.');
        console.error(err);
      });
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
            {settingsContentItems[settingsIndex].title === 'General' && <SettingsPerformance />}
            {settingsContentItems[settingsIndex].title === "What's New" && <SettingsNew />}
            {settingsContentItems[settingsIndex].title === 'Appearance' && (
              <>
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
                        config: themeState.themes.find((theme) => theme.name === e?.label)!.content,
                        currentTheme: themeState.themes.find((theme) => theme.name === e?.label)!,
                        theme: themeState.themes.find((theme) => theme.name === e?.label)!.name,
                      });

                      if (runtime.store) {
                        runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
                          if (db) {
                            db.themePreference = themeState.themes.find((theme) => theme.name === e?.label)!.name;
                            runtime.store
                              .set(`profile-store-${runtime.currentUser}`, {
                                ...db,
                              })
                              .then(() => {
                                runtime.store.save();
                              });
                          }
                        });
                      }
                    }}
                  />
                  <p className="mt-8 opacity-80">Current Theme</p>
                  <div
                    className="mt-8 rounded-lg p-4 w-1/2 shadow-lg"
                    style={{
                      backgroundColor: 'var(--sidebar-bg)',
                    }}
                  >
                    <img
                      src={
                        themeState.currentTheme?.icon ??
                        'https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM='
                      }
                      className="w-20 rounded-md"
                    />
                    <p className="mt-4 font-medium">{themeState.currentTheme?.name}</p>
                    <p className="mt-4 opacity-80 text-xs">
                      Created By {themeState.currentTheme?.created_by_alias}{' '}
                      <Moment fromNow date={themeState.currentTheme?.created_at} />
                    </p>
                    <p className="mt-4 opacity-80 text-xs">V{themeState.currentTheme?.version}</p>
                    <p className="mt-4">{themeState.currentTheme?.description ?? 'No Description.'}</p>
                    <p
                      onClick={() => {
                        if (themeState.currentTheme!.id === '-1') return;

                        onUninstall(themeState.currentTheme!);
                      }}
                      style={{
                        color: 'var(--sidebar-inset-text-color)',
                        opacity: themeState.currentTheme?.id === '-1' ? '50%' : '100%',
                      }}
                      className="bg-error p-2 text-sm w-full rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                    >
                      Uninstall
                    </p>
                    {themeState.currentTheme?.id === '-1' && (
                      <p className="text-sm mt-4">Cannot remove from device. This is a default theme.</p>
                    )}
                  </div>
                </div>
                <p className="mt-8 opacity-80">Manage Themes</p>
                <div className="flex flex-wrap">
                  {themeState.themes.map((theme, key) => (
                    <div
                      key={key}
                      className="mt-8 rounded-lg p-4 w-[40%] mr-4 shadow-lg flex flex-col justify-between"
                      style={{
                        backgroundColor: 'var(--sidebar-bg)',
                      }}
                    >
                      <img
                        src={
                          theme.icon ??
                          'https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM='
                        }
                        className="w-20 rounded-md"
                      />
                      <p className="mt-4 font-medium">{theme.name}</p>
                      <p className="mt-4 opacity-80 text-xs">
                        Created By {theme.created_by_alias} <Moment fromNow date={theme.created_at} />
                      </p>
                      <p className="mt-4 opacity-80 text-xs">V{theme.version}</p>
                      <p className="mt-4">{theme.description ?? 'No Description.'}</p>
                      <p
                        onClick={() => {
                          if (theme.id === '-1') return;

                          onUninstall(theme);
                        }}
                        style={{
                          color: 'var(--sidebar-inset-text-color)',
                          opacity: theme.id === '-1' ? '50%' : '100%',
                        }}
                        className="bg-error p-2 text-sm w-full rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                      >
                        Uninstall
                      </p>
                      {theme.id === '-1' && (
                        <p className="text-sm mt-4">Cannot remove from device. This is a default theme.</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-8 pb-20">
                  <p className="mb-4">Marketplace</p>
                  <a href="https://bytesbrowser.com" target="_blank" className="underline opacity-80 text-sm">
                    Create your own theme
                  </a>
                  <NoInternetFeature>
                    <div className="flex flex-wrap">
                      {data?.getThemes
                        .filter((newTheme) => {
                          if (themeState.themes.find((theme) => theme.name === newTheme.name)) {
                            return false;
                          } else {
                            return true;
                          }
                        })
                        .map((theme, key) => (
                          <div
                            key={key}
                            className="mt-8 rounded-lg p-4 w-[40%] mr-4 shadow-lg flex flex-col justify-between"
                            style={{
                              backgroundColor: 'var(--sidebar-bg)',
                            }}
                          >
                            <img
                              src={
                                theme.icon ??
                                'https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM='
                              }
                              className="w-20 rounded-md"
                            />
                            <p className="mt-4 font-medium">{theme.name}</p>
                            <p className="mt-4 opacity-80 text-xs">
                              Created By {theme.created_by_alias} <Moment fromNow date={theme.created_at} />
                            </p>
                            <p className="mt-4 opacity-80 text-xs">V{theme.version}</p>
                            <p className="mt-4">{theme.description ?? 'No Description.'}</p>
                            <p
                              onClick={() => onInstall(theme)}
                              style={{
                                color: 'var(--sidebar-inset-text-color)',
                                opacity: theme.id === '-1' ? '50%' : '100%',
                              }}
                              className="bg-success p-2 text-sm w-full rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                            >
                              Install
                            </p>
                            {theme.id === '-1' && (
                              <p className="text-sm mt-4">Cannot remove from device. This is a default theme.</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </NoInternetFeature>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
