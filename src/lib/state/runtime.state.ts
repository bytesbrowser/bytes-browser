import { atom } from "recoil";
import { Device } from "../types";
import { Store } from "tauri-plugin-store-api";

export const runtimeState = atom<{
  currentDrive: Device | null;
  readVolumes: boolean;
  readTags: boolean;
  readBookmarks: boolean;
  store: Store;
  profileStore: Store;
  currentUser: number;
}>({
  key: "runtime_state",
  default: {
    currentDrive: null,
    readVolumes: false,
    readTags: false,
    readBookmarks: false,
    store: new Store(".settings.dat"),
    profileStore: new Store(".profiles.dat"),
    currentUser: 0,
  },
});
