export type RosterPlayer = {
  id: string;
  name: string;
  emoji: string;
  active: boolean;
  selectionOrder: number | null;
};

export const EMOJI_OPTIONS = ["🦄", "🐶", "🦝", "🐸", "🐼", "🦊", "🐻", "😺"];
