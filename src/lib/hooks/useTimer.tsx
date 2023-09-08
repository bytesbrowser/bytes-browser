import { useEffect, useState } from 'react';

function useTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | number = -1;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0 && interval !== -1) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive]);

  const start = () => {
    setIsActive(true);
  };

  const pause = () => {
    setIsActive(false);
  };

  const reset = () => {
    setIsActive(false);
    setSeconds(initialSeconds);
  };

  return {
    seconds,
    start,
    pause,
    reset,
    isActive,
  };
}

export default useTimer;
