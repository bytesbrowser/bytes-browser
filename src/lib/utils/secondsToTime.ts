export function secondsToTime(secs: number) {
  // Create a date object starting from a fixed point in time
  let date = new Date(0);
  date.setSeconds(secs);

  return {
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    seconds: date.getUTCSeconds(),
  };
}
