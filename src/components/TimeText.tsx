import { useEffect, useState } from "react";
import { secondsToTime } from "../lib/utils/secondsToTime";

export const TimeText = ({
  className = "",
  seconds,
  prefix = "",
}: {
  className?: string;
  seconds: number;
  prefix?: string;
}) => {
  const [timeData, setTimeData] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setTimeData(secondsToTime(seconds));
  }, [seconds]);

  if(seconds === 0) return (<></>)

  return (
    <>
      <p className={className}>
        {prefix}{" "}
        {timeData.hours > 0 && (
          <>
            {timeData.hours} hr{timeData.hours > 1 && "s"}{" "}
          </>
        )}
        {timeData.minutes > 0 && (
          <>
            {timeData.minutes} minute{timeData.minutes > 1 && "s"}{" "}
          </>
        )}
        {timeData.seconds} second{timeData.seconds > 1 && "s"}
      </p>
    </>
  );
};
