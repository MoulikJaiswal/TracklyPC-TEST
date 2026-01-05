
export interface MistakeCounts {
  concept?: number;
  formula?: number;
  calc?: number;
  read?: number;
  panic?: number;
  overthink?: number;
}

export interface Session {
  id: string;
  subject: string;
  topic: string;
  attempted: number;
  correct: number;
  mistakes: MistakeCounts;
  timestamp: number;
}

export interface QuestionLog {
  timestamp: number;
  duration: number; // in seconds
  result: 'correct' | keyof MistakeCounts;
  subject: string; // Added to track subject per question
}

export interface SubjectBreakdown {
  correct: number;
  incorrect: number;
  unattempted: number;
  calcErrors: number;
  otherErrors: number;
  mistakes?: MistakeCounts;
}

export interface TestResult {
  id: string;
  name: string;
  date: string;
  marks: number;
  total: number;
  temperament: 'Calm' | 'Anxious' | 'Focused' | 'Fatigued';
  type?: 'full' | 'part'; // New field
  syllabus?: { // New field
    Physics: string[];
    Chemistry: string[];
    Maths: string[];
  };
  analysis?: string; // Legacy field
  breakdown?: {
    Physics: SubjectBreakdown;
    Chemistry: SubjectBreakdown;
    Maths: SubjectBreakdown;
  };
  timestamp: number;
  attachment?: string; // Base64 string of the file
  attachmentType?: 'image' | 'pdf';
  fileName?: string;
}

export interface Target {
  id: string;
  date: string;
  text: string;
  completed: boolean;
  timestamp: number;
  type?: 'task' | 'test';
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  timestamp: number;
  lastModified: number;
  tags?: string[];
  type?: 'text' | 'image' | 'pdf';
  attachment?: string;
  fileName?: string;
}

export type ViewType = 'daily' | 'planner' | 'focus' | 'tests' | 'analytics' | 'log' | 'resources' | 'library';

export type ThemeId = 'midnight' | 'obsidian' | 'void' | 'forest' | 'morning' | 'earth' | 'default-dark' | 'default-light';
