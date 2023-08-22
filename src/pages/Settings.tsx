import { useState } from "react";
import { settingsContentItems, settingsSidebarConfig } from "../lib/constants";
import { SettingsAccount } from "../components/settings/SettingsAccount";
import { SettingsProfiles } from "../components/settings/SettingsProfiles";

export const Settings = () => {
  const [settingsIndex, setSettingsIndex] = useState(0);

  return (
    <div className="px-8 pt-8 animate__animated animate__fadeIn overflow-hidden overflow-y-auto h-screen">
      <h1 className="text-2xl font-bold">App Settings</h1>
      <hr className="mt-4 opacity-20" />
      <div className="flex mt-8">
        <div className="settings-sidebar w-[150px]">
          {settingsSidebarConfig.map((item, key) => (
            <div
              onClick={() => setSettingsIndex(key)}
              className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-sidebar ${
                settingsIndex === key && "bg-sidebar"
              } ${settingsIndex !== key && "opacity-50"}`}
              key={key}
            >
              <p className="font-light text-sm">{item}</p>
            </div>
          ))}
          <div
            className={`sidebar-item my-8 px-4 py-2 rounded-md cursor-pointer transition-all hover:bg-error group`}
          >
            <p className="font-medium group-hover:text-white text-sm text-error">
              Logout
            </p>
          </div>
        </div>
        <div className="flex-1 mt-8 ml-8 pl-8 border-l border-gray-500 animate__animated animate__fadeIn">
          <p className="text-lg mb-4">
            {settingsContentItems[settingsIndex].title}
          </p>
          <p className="text-sm opacity-50">
            {settingsContentItems[settingsIndex].desc}
          </p>
          <div className="mt-8">
            {settingsContentItems[settingsIndex].title === "My Account" && (
              <SettingsAccount />
            )}
            {settingsContentItems[settingsIndex].title === "Profiles" && (
              <SettingsProfiles />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
