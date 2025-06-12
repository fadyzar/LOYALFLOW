export function calculateBreakDuration(startTime: string, endTime: string): string {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diffMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
  
  if (diffMinutes === 60) {
    return 'שעה';
  } else if (diffMinutes > 60) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours} שעות ו-${minutes} דקות` : `${hours} שעות`;
  } else {
    return `${diffMinutes} דקות`;
  }
}

export function formatTime(time: string): string {
  return time.slice(0, 5); // Remove seconds if present
}