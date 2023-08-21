import { Link } from "react-router-dom";
import { Device as DeviceInterface } from "../lib/types";
import { Tooltip } from "react-tooltip";
import { formatBytes } from "../lib/utils/formatBytes";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export const Device = ({
  device,
  selected,
  id,
}: {
  device: DeviceInterface;
  selected: boolean;
  id: number;
}) => {
  const [randomTooltipID] = useState(String(Math.random()));

  const [randomEjectTooltipID] = useState(String(Math.random()));

  const [percentUsed, setPercentUsed] = useState(0);

  useEffect(() => {
    setPercentUsed((device.used / device.size) * 100);
  }, [device]);

  const safely_eject = () => {
    console.log("ejecting")
    
    invoke("safely_eject_removable", { mountPath: device.mount_point }).then((res) => {
      console.log(res)
    }).catch(err => {
      console.log(err)
    })
  };

  return (
    <>
      <Link
        to={`/drive/${id}`}
        className="device flex items-center justify-between mb-6 cursor-pointer transition-all hover:opacity-50"
      >
        <div className="left flex items-center">
          {device.removable ? (
            <svg
              width="20"
              height="20"
              className="mr-4"
              style={{
                opacity: selected ? 1 : 0.5,
              }}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.36719 6.39844H9.35156C9.4418 6.39844 9.51562 6.32461 9.51562 6.23438V5.25C9.51562 5.15977 9.4418 5.08594 9.35156 5.08594H8.36719C8.27695 5.08594 8.20312 5.15977 8.20312 5.25V6.23438C8.20312 6.32461 8.27695 6.39844 8.36719 6.39844ZM15.5859 8.85938V2.95312C15.5859 2.59014 15.2927 2.29688 14.9297 2.29688H6.07031C5.70732 2.29688 5.41406 2.59014 5.41406 2.95312V8.85938C4.05645 8.85938 2.95312 9.92783 2.95312 11.2383V18.5391C2.95312 18.6293 3.02695 18.7031 3.11719 18.7031H17.8828C17.973 18.7031 18.0469 18.6293 18.0469 18.5391V11.2383C18.0469 9.92783 16.9436 8.85938 15.5859 8.85938ZM14.1094 8.85938H6.89062V3.77344H14.1094V8.85938ZM11.6484 6.39844H12.6328C12.723 6.39844 12.7969 6.32461 12.7969 6.23438V5.25C12.7969 5.15977 12.723 5.08594 12.6328 5.08594H11.6484C11.5582 5.08594 11.4844 5.15977 11.4844 5.25V6.23438C11.4844 6.32461 11.5582 6.39844 11.6484 6.39844Z"
                fill="white"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              className="mr-4"
              style={{
                opacity: selected ? 1 : 0.5,
              }}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.059 10.898L15.888 2.971C15.7736 2.68426 15.5757 2.43845 15.3201 2.26535C15.0645 2.09225 14.7628 1.99981 14.454 2H5.54603C4.91403 2 4.34603 2.384 4.11203 2.971L0.941028 10.898C0.653133 11.6187 0.568057 12.4044 0.695028 13.17L1.28503 16.709C1.34494 17.0697 1.53089 17.3974 1.80978 17.6338C2.08868 17.8702 2.44242 18 2.80803 18H17.191C17.946 18 18.59 17.454 18.714 16.709L19.304 13.17C19.4329 12.4045 19.3481 11.6184 19.059 10.898ZM16.959 15.245C16.9242 15.4561 16.8154 15.6479 16.6522 15.7862C16.489 15.9245 16.282 16.0003 16.068 16H3.93203C3.7181 16.0003 3.51105 15.9245 3.34784 15.7862C3.18463 15.6479 3.07589 15.4561 3.04103 15.245L2.67603 13.052C2.6542 12.9226 2.66088 12.7899 2.69563 12.6633C2.73037 12.5367 2.79232 12.4192 2.87717 12.319C2.96201 12.2189 3.0677 12.1384 3.18685 12.0833C3.30601 12.0282 3.43575 11.9998 3.56703 12H16.434C16.992 12 17.417 12.501 17.325 13.052L16.959 15.245Z"
                fill="white"
              />
            </svg>
          )}
          <p>
            {device.name.length > 15
              ? device.name.slice(0, 15) + "..."
              : device.name}
          </p>
        </div>
        <div className="right flex items-center">
          <svg
           onClick={(e) => {
            console.log("start eject")
            safely_eject()
          }}
            style={{
              display: device.removable ? "block" : "none",
            }}
            data-tooltip-id={randomEjectTooltipID}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer mr-2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 19V17H19V19H5ZM5.35 15L12 5L18.65 15H5.35Z"
              fill="white"
            />
          </svg>
          <svg
            data-tooltip-id={randomTooltipID}
            className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="white"
              d="M11 17h2v-6h-2v6Zm1-8q.425 0 .713-.288T13 8q0-.425-.288-.713T12 7q-.425 0-.713.288T11 8q0 .425.288.713T12 9Zm0 13q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"
            />
          </svg>
        </div>
      </Link>
      <Tooltip
        className="tooltip z-[999]"
        opacity={"100%"}
        id={randomEjectTooltipID}
      >
        <p>Eject</p>
      </Tooltip>
      <Tooltip
        className="tooltip z-[999]"
        id={randomTooltipID}
        opacity={"100%"}
      >
        <div className="p-2">
          <h1 className="text-xl mb-4">{device.name}</h1>
          <p className="opacity-50 mb-4">
            {device.file_system_type} {device.disk_type}
          </p>

          <div className="h-[10px] w-full bg-slate-300 rounded-md">
            <div
              className="h-full bg-success flex items-center justify-center"
              style={{
                width: `${percentUsed}%`,
                borderTopLeftRadius: "6px",
                borderBottomLeftRadius: "6px",
              }}
            ></div>
          </div>
          <p className="mt-2">
            {Math.floor(percentUsed)}% ({formatBytes(device.used)} of{" "}
            {formatBytes(device.size)}) used
          </p>
        </div>
      </Tooltip>
    </>
  );
};
