export function secondsAgoToDate(secondsAgo: number): Date {
  const millisAgo: number = secondsAgo * 1000; // Convert seconds ago to milliseconds ago
  const date: Date = new Date(Date.now() - millisAgo);
  return date;
}
