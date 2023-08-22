import { Route, Routes } from 'react-router-dom';

import { Auth } from '../pages/Auth';
import { FolderExplorer } from '../pages/FolderExplorer';
import { Settings } from '../pages/Settings';
import { RouterLayout } from './RouterLayout';

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
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
