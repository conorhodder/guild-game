export function questChannel(activityId: string, questId: string): string {
  return `quest:${activityId}:${questId}`;
}
