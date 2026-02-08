

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
  duration?: number; // Total seconds spent in this session
  plannedDuration?: number; // Total seconds planned for the session
  focusRating?: number; // 1-10 rating of focus quality
  stream?: StreamType;
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
  syllabus?: SyllabusData;
  testType?: 'Generic' | 'PYP' | 'Coaching Mock';
  pypYear?: number;
  pypSession?: string;
  coachingName?: string;
  analysis?: string; // Legacy field
  breakdown?: Record<string, SubjectBreakdown>;
  timestamp: number;
  attachment?: string | null;
  attachmentType?: 'image' | 'pdf' | null;
  fileName?: string | null;
  thumbnail?: string | null;
  stream?: StreamType;
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

export interface Attachment {
  id: string;
  data: string;
  fileName: string;
  type: 'image' | 'pdf';
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

  // For type='text' notes
  attachments?: Attachment[];

  // For type='image' or 'pdf' notes
  attachment?: string | null;
  fileName?: string | null;
  
  thumbnail?: string | null;
}

export type ViewType = 'daily' | 'planner' | 'focus' | 'tests' | 'analytics' | 'log' | 'privacy' | 'group-focus';

export type ThemeId = 'midnight' | 'obsidian' | 'void' | 'forest' | 'morning' | 'earth' | 'default-dark' | 'default-light';

export type StreamType = 'JEE' | 'NEET' | 'General';

// --- VIRTUAL LIBRARY TYPES ---

export interface StudyParticipant {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  // We use this timestamp to filter out "ghosts" (people who closed the tab hours ago)
  lastActivity: number; 
  isOnline?: boolean; // New flag for RTDB presence
  
  // Real-time State (Event Based)
  status: 'focus' | 'break' | 'idle';
  subject: 'Physics' | 'Chemistry' | 'Maths' | 'Biology' | 'Other';
  
  // If focusing
  focusEndTime?: number; // Timestamp when their timer rings
  focusDuration?: number; // Total minutes (for progress bar calc)
  intention?: string; // The specific task/goal they are working on
  accumulatedFocusTime?: number; // Total minutes focused in this session
  
  // New Engagement Fields
  isAway?: boolean; // True if AFK > 5 mins
  
  // New fields for leaderboard
  dailyFocusTime?: number;
  weeklyFocusTime?: number;
  lastFocusDate?: string; // YYYY-MM-DD
  lastFocusWeek?: number; // Week number of the year
}

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  color: string;
  activeCount: number;
  createdBy?: string; // User ID who created it
  createdAt?: number;
  isSystem?: boolean; // If true, cannot be deleted by users
  status?: 'active' | 'closing'; // Soft delete state
  isPrivate?: boolean; // If true, hidden from lobby list
}

// --- FOCUS ROOM TYPES FOR TIMER HOOK ---

export interface FocusRoomState {
  status: 'waiting' | 'break' | 'completed';
  startTime?: number;
  endTime?: number;
  pausedAt?: number;
}

export interface FocusRoomConfig {
  focusDuration: number;
}

export interface FocusRoom {
  id: string;
  state: FocusRoomState;
  config: FocusRoomConfig;
}

export type SyllabusData = Record<string, string[]>;