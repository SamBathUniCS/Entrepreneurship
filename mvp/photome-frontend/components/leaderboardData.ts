// components/leaderboardData.ts

export type Person = {
  id: string;
  name: string;
  photos: number;
  avatarUri?: string;
};

// sort friends by photo count
export function getLeaderboard(people: Person[]) {
  return [...people].sort((a, b) => b.photos - a.photos);
}

// get rank for a specific user
export function getRankForUser(userId: string, people: Person[]) {
  const lb = getLeaderboard(people);
  const idx = lb.findIndex((p) => p.id === userId);
  return idx === -1 ? null : idx + 1;
}