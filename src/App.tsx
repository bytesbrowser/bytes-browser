import { useRecoilValue } from "recoil";
import Router from "./components/Router";
import { BrowserRouter } from "react-router-dom";

import { useEffect, useState } from "react";
import "animate.css/animate.min.css";
import { os } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { runtimeState } from "./lib/state/runtime.state";

const App = () => {
  const runtime = useRecoilValue(runtimeState);
  const [useTitlebar, setUseTitlebar] = useState<boolean>(false);

  useEffect(() => {
    if (document != null) {
      os.platform().then((platform) => {
        if (platform === "darwin") {
          const titlebar = document.getElementsByClassName("titlebar")[0];
          titlebar.setAttribute("style", "display: none;");

          const app = document.getElementsByClassName("app")[0];
          app.classList.add("macos");
        } else {
          const titlebarLeft = document.getElementById("titlebar-left")!;
          titlebarLeft.setAttribute("style", "background-color: #27272D;");

          setUseTitlebar(true);

          document
            .getElementById("titlebar-minimize")!
            .addEventListener("click", () => appWindow.minimize());
          document
            .getElementById("titlebar-maximize")!
            .addEventListener("click", () => appWindow.toggleMaximize());
          document
            .getElementById("titlebar-close")!
            .addEventListener("click", () => appWindow.close());
        }
      });
    }
  }, []);

  useEffect(() => {
    if (runtime.readVolumes && useTitlebar) {
      const titlebarLeft = document.getElementById("titlebar-left")!;
      titlebarLeft.setAttribute("style", "background-color: #1c1b20;");
      const app = document.getElementsByClassName("app")[0];
      app.setAttribute("style", "margin-top: 30px;");

      const content = document.getElementsByClassName("content")[0];
      content.setAttribute("style", "margin-top: 30px;");
    }
  }, [runtime]);

  return (
    <BrowserRouter>
      <div className="app">
        <Router />
      </div>
    </BrowserRouter>
  );
};

export default App;
