import { os } from '@tauri-apps/api';
import { appWindow } from '@tauri-apps/api/window';
import 'animate.css/animate.min.css';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

import Router from './components/Router';
import { runtimeState } from './lib/state/runtime.state';

const App = () => {
  const runtime = useRecoilValue(runtimeState);
  const [useTitlebar, setUseTitlebar] = useState<boolean>(false);

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
            titlebarLeft.setAttribute('style', 'background-color: #27272D;');
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
        titlebarLeft.setAttribute('style', 'background-color: #1c1b20;');
      }
      const app = document.getElementsByClassName('app')[0];
      if (app) {
        app.setAttribute('style', 'margin-top: 30px;');
      }

      const content = document.getElementsByClassName('content')[0];
      if (content) {
        content.setAttribute('style', 'margin-top: 30px;');
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
