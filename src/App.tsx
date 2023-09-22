import { invoke, os } from '@tauri-apps/api';
import { Event } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission } from '@tauri-apps/api/notification';
import { appWindow } from '@tauri-apps/api/window';
import 'animate.css/animate.min.css';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import Router from './components/Router';
import { Theme } from './graphql';
import { useHotkey } from './lib/commands';
import { BytesBrowserDarkTheme, BytesBrowserLightTheme } from './lib/constants';
import CommandsEmitter from './lib/emitters/commands.emitter';
import { runtimeState } from './lib/state/runtime.state';
import { themeState as themeStateRoot } from './lib/state/theme.state';
import { Command, CommandRunEvent, Profile, ProfileStore } from './lib/types';

const App = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [useTitlebar, setUseTitlebar] = useState<boolean>(false);
  const [themeState, setThemeState] = useRecoilState(themeStateRoot);

  useHotkey('CommandOrControl+Shift+Space', (_shortcut) => {
    setRuntime({
      ...runtime,
      searchOpen: true,
    });
  });

  useEffect(() => {
    setupCommandActions();

    checkNotificationPermission();
  }, []);

  const setupCommandActions = () => {
    runtime.store.get<ProfileStore>(`profile-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const commands = db.commands;

        let successfull = 0;
        let failed = 0;

        await commands.forEach(async (command) => {
          await invoke('init_command', { command: command })
            .then((res) => {
              successfull++;
            })
            .catch((err) => {
              failed++;
            });
        });

        if (successfull < 1) {
          toast.error(`Failed to initialize ${failed} commands.`);
        } else {
          toast.success(`Initialized ${successfull} commands. ${failed} failed.`);
        }
      }
    });

    CommandsEmitter.on('change', (command: Command) => {
      invoke('init_command', { command: command })
        .then((res) => {
          toast.success(`Initialized ${command.name} command.`);
        })
        .catch((err) => {
          toast.error(`Failed to initialize ${command.name} command.`);
        });
    });

    appWindow.listen('command-executed', (msg: Event<CommandRunEvent>) => {
      setRuntime({
        ...runtime,
        commandLogs: [...runtime.commandLogs, msg.payload],
      });

      if (msg.payload.error) {
        toast.error(msg.payload.command + ' failed to run.');
      } else {
        toast.success(msg.payload.command + ' ran successfully.');
      }
    });
  };

  const checkNotificationPermission = async () => {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
  };

  useEffect(() => {
    invoke('get_installed_themes')
      .then(async (res: any) => {
        if (res.includes('does not exist')) {
          res = [];
        }

        res = res.map((item: Theme) => ({
          ...item,
          content: JSON.parse(item.content),
        }));

        if (runtime.store) {
          runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
            if (db) {
              if (db.themePreference) {
                setThemeState({
                  ...themeState,
                  themes: [BytesBrowserDarkTheme, BytesBrowserLightTheme, ...res],
                  currentTheme: [BytesBrowserDarkTheme, BytesBrowserLightTheme, ...res].find(
                    (theme: Theme) => theme.name === db.themePreference,
                  ),
                  config: [BytesBrowserDarkTheme, BytesBrowserLightTheme, ...res].find(
                    (theme: Theme) => theme.name === db.themePreference,
                  ).content,
                });
              } else {
                setThemeState({
                  ...themeState,
                  themes: [BytesBrowserDarkTheme, BytesBrowserLightTheme, ...res],
                });
              }
            } else {
              setThemeState({
                ...themeState,
              });
            }
          });
        }
      })
      .catch((err) => {
        console.error(err);

        setThemeState({
          ...themeState,
        });
      });
  }, []);

  useEffect(() => {
    if (document != null) {
      os.platform().then((platform) => {
        if (platform === 'darwin') {
          const titlebar = document.getElementsByClassName('titlebar')[0];
          if (titlebar) {
            titlebar.setAttribute('style', 'display: none;');
          }

          const app = document.getElementsByClassName('app')[0];
          if (app) {
            app.classList.add('macos');
          }
        } else {
          const titlebarLeft = document.getElementById('titlebar-left')!;
          if (titlebarLeft) {
            titlebarLeft.setAttribute('style', 'padding-left: 0;');
          }

          setUseTitlebar(true);

          document.getElementById('titlebar-minimize')!.addEventListener('click', () => appWindow.minimize());
          document.getElementById('titlebar-maximize')!.addEventListener('click', () => appWindow.toggleMaximize());
          document.getElementById('titlebar-close')!.addEventListener('click', () => appWindow.close());
        }
      });
    }
  }, [runtime.currentUser]);

  useEffect(() => {
    if (runtime.readVolumes && useTitlebar) {
      const titlebarLeft = document.getElementById('titlebar-left')!;
      if (titlebarLeft) {
        titlebarLeft.setAttribute('style', 'background-color: var(--sidebar-bg); padding-left: 270px;');
      }
      const app = document.getElementsByClassName('app')[0];
      if (app) {
        app.setAttribute('style', 'margin-top: 30px;');
      }
    }
  }, [runtime]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <div className="app">
        <Router />
      </div>
    </BrowserRouter>
  );
};

export default App;
