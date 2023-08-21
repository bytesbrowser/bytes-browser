import { Navigate, Route, Routes } from "react-router-dom";
import { RouterLayout } from "./RouterLayout";
import { FolderExplorer } from "../pages/FolderExplorer";
import { Settings } from "../pages/Settings";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/drive/0" />} />
      <Route
        path="/drive/:driveId"
        element={
          <RouterLayout>
            <FolderExplorer />
          </RouterLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <RouterLayout>
            <Settings />
          </RouterLayout>
        }
      />
    </Routes>
  );
};

export default Router;
