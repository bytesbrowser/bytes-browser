import { RecoilRoot } from "recoil";
import Router from "./components/Router";
import { BrowserRouter } from "react-router-dom";

import { useEffect } from "react";
import "animate.css/animate.min.css";
import { os } from "@tauri-apps/api";

const App = () => {
  useEffect(() => {
    if (document != null) {
      os.platform().then((platform) => {
        if (platform === "darwin") {
          const titlebar = document.getElementsByClassName("titlebar")[0]
          titlebar.setAttribute("style", "display: none;");

          const app = document.getElementsByClassName("app")[0]
          app.classList.add("macos")
        }
      })
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
