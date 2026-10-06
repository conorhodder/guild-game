function timeParts(simMs: number): {
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.floor(simMs / 1000);
  const day = Math.floor(totalSeconds / 86_400) + 1;
  const secondsInDay = totalSeconds % 86_400;

  return {
    day,
    hours: Math.floor(secondsInDay / 3600),
    minutes: Math.floor((secondsInDay % 3600) / 60),
    seconds: secondsInDay % 60,
  };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatSimClock(simMs: number): string {
  const { day, hours, minutes, seconds } = timeParts(simMs);
  return `Day ${day}, ${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

export function formatLogTimestamp(simMs: number): string {
  const { day, hours, minutes, seconds } = timeParts(simMs);
  return `[D${day} ${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}]`;
}
