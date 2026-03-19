// components/leaderboardData.ts
export type Person = {
  id: string;
  name: string;
  photos: number;
  avatarUri?: string;
};

// ✅ Single source of truth (replace with backend later)
export const PEOPLE: Person[] = [
  { id: "me", name: "You", photos: 42 }, // no avatar (uses icon)
  {
    id: "1",
    name: "Alice",
    photos: 31,
    avatarUri: "https://i.pravatar.cc/120?img=12",
  },
  {
    id: "2",
    name: "Ben",
    photos: 18,
    avatarUri: "https://i.pravatar.cc/120?img=32",
  },
  {
    id: "3",
    name: "Chloe",
    photos: 55,
    avatarUri: "https://i.pravatar.cc/120?img=45",
  },
  {
    id: "4",
    name: "Daniel",
    photos: 9,
    avatarUri: "https://i.pravatar.cc/120?img=22",
  },
];

export function getLeaderboard(people: Person[] = PEOPLE) {
  return [...people].sort((a, b) => b.photos - a.photos);
}

export function getRankForUser(userId: string, people: Person[] = PEOPLE) {
  const lb = getLeaderboard(people);
  const idx = lb.findIndex((p) => p.id === userId);
  return idx === -1 ? null : idx + 1; // 1-based rank
}
