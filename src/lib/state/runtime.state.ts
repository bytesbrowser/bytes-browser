import { atom } from "recoil";
import { Device } from "../types";

export const runtimeState = atom<{
  currentDrive: Device | null;
}>({
  key: "runtime_state",
  default: {
    currentDrive: null,
  },
});
