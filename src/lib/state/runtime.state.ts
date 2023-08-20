import { atom } from "recoil";
import { Device } from "../types";

export const runtimeState = atom<{
  currentDrive: Device | null;
  readVolumes: boolean;
  readTags: boolean;
}>({
  key: "runtime_state",
  default: {
    currentDrive: null,
    readVolumes: false,
    readTags: false,
  },
});
