export interface Exercise {
  id: number;
  parts: string[];   // text fragments around the blanks
  answers: string[]; // accepted answers (multiple accepted = multiple correct)
}

export interface ExerciseSet {
  title: string;
  exercises: Exercise[];
}
