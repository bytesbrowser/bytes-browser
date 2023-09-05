import { invoke, os } from '@tauri-apps/api';
import { appWindow } from '@tauri-apps/api/window';
import 'animate.css/animate.min.css';
//@ts-ignore
import Feedback from 'feeder-react-feedback';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';

import Router from './components/Router';
import { Theme } from './graphql';
import { BytesBrowserDarkTheme, BytesBrowserLightTheme } from './lib/constants';
import { runtimeState } from './lib/state/runtime.state';
import { themeState as themeStateRoot } from './lib/state/theme.state';
import { Profile, ProfileStore } from './lib/types';

const App = () => {
  const runtime = useRecoilValue(runtimeState);
  const [useTitlebar, setUseTitlebar] = useState<boolean>(false);
  const [themeState, setThemeState] = useRecoilState(themeStateRoot);

  useEffect(() => {
    invoke('get_installed_themes')
      .then(async (res: any) => {
        if (res.includes('does not exist')) return;

        if (runtime.store) {
          runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
            if (db) {
              if (db.themePreference) {
                console.log('FOund theme pref');
                setThemeState({
                  ...themeState,
                  themes: res,
                  currentTheme: [BytesBrowserDarkTheme, BytesBrowserLightTheme, ...res].find(
                    (theme: Theme) => theme.name === db.themePreference,
                  )[0],
                });
              } else {
                setThemeState({
                  ...themeState,
                  themes: res,
                });
              }
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
