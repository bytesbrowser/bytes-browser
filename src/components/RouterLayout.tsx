import { useState, useEffect } from "react";
import { Device } from "./Device";
import { BookmarkDoc, Device as DeviceInterface, TagDoc } from "../lib/types";
import { useRecoilState } from "recoil";
import { runtimeState } from "../lib/state/runtime.state";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api";
import { Triangle } from "react-loader-spinner";
import useTimer from "../lib/hooks/useTimer";
import { TimeText } from "./TimeText";
import { SidebarTags } from "./SidebarTags";
import { Tooltip } from "react-tooltip";
import { SidebarBookmarks } from "./SidebarBookmarks";
import { SidebarBottom } from "./SidebarBottom";

export const RouterLayout = ({ children }: { children: React.ReactNode }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const { start, reset, pause, seconds } = useTimer();

  const { driveId } = useParams();

  const [devices, setDevices] = useState<DeviceInterface[]>([]);
  const [tags, setTags] = useState<TagDoc[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkDoc[]>([]);
  const [refreshingVolumes, setRefreshingVolumes] = useState<boolean>(false);

  useEffect(() => {
    if (runtime.readVolumes) return;

    reset();
    start();

    getVolumes();
    getTags();
  }, []);

  useEffect(() => {
    if (
      runtime.currentDrive &&
      devices[driveId as any] &&
      runtime.currentDrive.name !== devices[driveId as any].name
    ) {
      setRuntime({
        ...runtime,
        currentDrive: devices[driveId as any] ?? null,
      });
    }
  }, [driveId]);

  const getTags = () => {
    invoke("get_tags").then((tags: any) => {
      setTags(tags);
      setRuntime({
        ...runtime,
        readTags: true,
      });
    });
  };

  const getBookmarks = () => {
    invoke("get_bookmarks").then((bookmarks: any) => {
      setBookmarks(bookmarks);
      setRuntime({
        ...runtime,
        readBookmarks: true,
      });
    });
  };

  const getVolumes = () => {
    if (refreshingVolumes) return;

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
        currentDrive: new_volumes[0]!,
      });

      pause();

      setDevices(new_volumes);
    });
  };

  const refreshVolumes = () => {
    console.log(refreshingVolumes);

    if (refreshingVolumes) return;

    setRefreshingVolumes(true);

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
        currentDrive: new_volumes[0]!,
      });

      setDevices(new_volumes);
      setRefreshingVolumes(false);
    });
  };

  return (
    <>
      <Tooltip
        id="refresh-tooltip"
        className="tooltip z-[999]"
        opacity={"100%"}
      >
        Refresh
      </Tooltip>
      {runtime.readVolumes ? (
        <div className="layout flex">
          <div className="sidebar bg-sidebar w-[300px] h-screen px-8 py-8 flex flex-col justify-between">
            <div className="section">
              <div className="section-title text-sm flex justify-between items-center">
                <p className="opacity-50">Storage Devices</p>
                <svg
                  onClick={refreshVolumes}
                  data-tooltip-id="refresh-tooltip"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className={`cursor-pointer hover:opacity-100 focus:border-none focus:outline-none ${
                    refreshingVolumes && "animate-spin"
                  }`}
                >
                  <path
                    fill="white"
                    d="M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25Zm8.762 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284l-1.686-1.666Z"
                  />
                </svg>
              </div>
              <div className="mt-8">
                {devices.map((device, key) => (
                  <Device
                    device={device}
                    key={key}
                    id={key}
                    selected={
                      runtime.currentDrive?.name === device.name ?? false
                    }
                  />
                ))}
              </div>
              <SidebarTags tags={tags} loading={runtime.readTags} />
              <SidebarBookmarks
                bookmarks={bookmarks}
                loading={runtime.readBookmarks}
              />
            </div>
            <SidebarBottom />
          </div>
          <div className="content flex-1 h-screen text-white bg-body">
            {children}
          </div>
        </div>
      ) : (
        <div className="loader flex justify-center items-center h-screen flex-col w-screen bg-body">
          <Triangle
            height="80"
            width="80"
            color="white"
            ariaLabel="triangle-loading"
            visible={true}
          />
          <p className="mt-8 opacity-50">Getting things ready</p>
          <TimeText
            seconds={seconds}
            className="mt-8 opacity-50"
            prefix="Elapsed Caching Time:"
          />
        </div>
      )}
    </>
  );
};
