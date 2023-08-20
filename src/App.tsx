import { RecoilRoot } from "recoil";
import Router from "./components/Router";
import { BrowserRouter } from "react-router-dom";

import { appWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import "animate.css/animate.min.css";

const App = () => {
  useEffect(() => {
    if (document != null) {
      document
        .getElementById("titlebar-minimize")
        ?.addEventListener("click", () => appWindow.minimize());
      document
        .getElementById("titlebar-maximize")
        ?.addEventListener("click", () => appWindow.toggleMaximize());
      document
        .getElementById("titlebar-close")
        ?.addEventListener("click", () => appWindow.close());
    }
  }, []);

  return (
    <RecoilRoot>
      <BrowserRouter>
        <div className="app">
          <Router />
        </div>
      </BrowserRouter>
    </RecoilRoot>
  );
};

export default App;
