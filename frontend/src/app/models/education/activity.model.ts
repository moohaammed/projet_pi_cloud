export type ActivityType = 'QUIZ' | 'GAME' | 'CONTENT' | 'EXERCICE';
export type Stade = 'LEGER' | 'MODERE' | 'SEVERE';

export interface QuizData {
  questions: {
    texte: string;
    options: string[];
    reponse_correcte: number;
    explication: string;
  }[];
}

export interface GameData {
  theme: 'animaux' | 'fleurs' | 'fruits' | 'transport';
  nombreCartes: 6 | 8 | 10 | 12;
  timer: number;
  paires?: { id: number; emoji: string; nom: string }[];
}

export interface ContentData {
  contentType: 'video' | 'article';
  videoUrl?: string;
  imageUrl?: string;
  langue?: string;
  description?: string;
}

export interface ExerciceData {
  sousType: string;
  repetitions: number;
  audioGuide?: string;
  etapes: { num: number; consigne: string; dureeSecondes: number }[];
}

export interface ActivityModel {
  id?:               string;
  title:             string;
  type:              ActivityType;
  stade:             Stade;
  description:       string;        // ✅ ? retiré
  data:              QuizData | GameData | ContentData | ExerciceData | string;
  estimatedMinutes:  number;        // ✅ ? retiré
  active:            boolean;       // ✅ ? retiré
  createdAt?:        string;        // celui-ci reste optionnel, normal
}