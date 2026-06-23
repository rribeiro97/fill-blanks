export type ExerciseType = "fill" | "open";

export interface Exercise {
  id: number;
  type?: ExerciseType;      // defaults to "fill" if absent
  // --- fill type ---
  parts?: string[];         // text fragments around the blanks
  answers?: string[];       // accepted answers (case-insensitive, accents required)
  // --- open type ---
  prompt?: string;          // e.g. "Une bonne journaliste :"
  suggested?: string;       // e.g. "Elle est curieuse et dynamique."
}

export interface ExerciseSet {
  title: string;
  instruction?: string;     // e.g. "Associez librement les adjectifs..."
  wordbank?: string[];      // e.g. ["calme", "souriant", "curieux"]
  exercises: Exercise[];
}
