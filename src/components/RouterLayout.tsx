import { useState, useEffect } from "react";
import { Device } from "./Device";
import { Device as DeviceInterface } from "../lib/types";
import { useRecoilState } from "recoil";
import { runtimeState } from "../lib/state/runtime.state";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api";
import { Triangle } from "react-loader-spinner";
import useTimer from "../lib/hooks/useTimer";
import { TimeText } from "./TimeText";

export const RouterLayout = ({ children }: { children: React.ReactNode }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const { isActive, start, reset, pause, seconds } = useTimer();

  const { driveId } = useParams();

  const [devices, setDevices] = useState<DeviceInterface[]>([{
    name: "Drive 1",
    available: 999000000000,
    mount_point: "",
    removable: false,
    size: 1000000000000,
    used: 1000000000
  }]);

  useEffect(() => {

    if(runtime.readVolumes) return;
    
    reset();
    start();

    invoke("get_volumes").then((volumes: any) => {
      const new_volumes: DeviceInterface[] = [];

      for (const volume of volumes) {
        if (new_volumes.find((vol) => vol.name === volume.name)) {
          continue;
        } else {
          new_volumes.push(volume);
        }
      }

      setRuntime({
        ...runtime,
        readVolumes: true,
        currentDrive: new_volumes[0]!
      });

      pause();

      setDevices(new_volumes);
    });
  }, []);

  useEffect(() => {
    if (
      runtime.currentDrive &&
      runtime.currentDrive.name !== devices[driveId as any].name
    ) {
      setRuntime({
        ...runtime,
        currentDrive: devices[driveId as any] ?? null,
      });
    }
  }, [driveId]);

  console.log(runtime.currentDrive, driveId)

  return (
    <>
      {runtime.readVolumes ? (
        <div className="layout">
          <div className="sidebar bg-sidebar w-[300px] h-screen px-8 py-8">
            <div className="section">
              <div className="section-title text-sm opacity-50">
                Storage Devices
              </div>
              <div className="storage-devices mt-8">
                {devices.map((device, key) => (
                  <Device
                    device={device}
                    key={key}
                    selected={
                      runtime.currentDrive?.name === device.name ?? false
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="content">{children}</div>
        </div>
      ) : (
        <div className="loader flex justify-center items-center h-screen flex-col">
          <Triangle
            height="80"
            width="80"
            color="white"
            ariaLabel="triangle-loading"
            visible={true}
          />
          <p className="mt-8 opacity-50">Getting things ready</p>
          <TimeText seconds={seconds} className="mt-8 opacity-50" prefix="Elapsed Caching Time:" />
        </div>
      )}
    </>
  );
};
