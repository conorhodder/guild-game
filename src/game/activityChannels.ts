export function questChannel(activityId: string, questId: string): string {
  return `quest:${activityId}:${questId}`;
}

export function campChannel(activityId: string, campId: string): string {
  return `camp:${activityId}:${campId}`;
}
