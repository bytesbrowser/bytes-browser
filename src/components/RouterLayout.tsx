import { useState, useEffect } from "react";
import { Device } from "./Device";
import { Device as DeviceInterface } from "../lib/types";
import { useRecoilState } from "recoil";
import { runtimeState } from "../lib/state/runtime.state";
import { useParams } from "react-router-dom";

export const RouterLayout = ({ children }: { children: React.ReactNode }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);

  const { driveId } = useParams();

  const [devices, setDevices] = useState<DeviceInterface[]>([
    {
      name: "Root Drive",
      available: 1000000,
      used: 10000,
      id: "0",
      mount_point: "/",
      removable: false,
      size: 1000000,
    },
    {
      name: "NVME F",
      available: 1000000,
      used: 10000,
      id: "1",
      mount_point: "/",
      removable: false,
      size: 1000000,
    },
    {
      name: "Remove Drive USB A",
      available: 1000000,
      used: 10000,
      id: "2",
      mount_point: "/",
      removable: true,
      size: 1000000,
    },
  ]);

  useEffect(() => {
    if (runtime.currentDrive && runtime.currentDrive.id !== driveId) {
      setRuntime({
        ...runtime,
        currentDrive: devices.find((device) => device.id === driveId) ?? null,
      });
    }
  }, [driveId]);

  return (
    <div className="layout">
      <div className="sidebar bg-sidebar w-1/4 h-screen px-8 py-8">
        <div className="section">
          <div className="section-title text-sm opacity-50">
            Storage Devices
          </div>
          <div className="storage-devices mt-8">
            {devices.map((device, key) => (
              <Device
                device={device}
                key={key}
                selected={runtime.currentDrive?.id === device.id ?? false}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="content">{children}</div>
    </div>
  );
};
