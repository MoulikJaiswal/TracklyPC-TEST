






export interface MistakeCounts {
  concept?: number;
  calculation?: number;
  silly?: number;
  time?: number;
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
  timeSpent?: number; // in minutes
  mistakes?: MistakeCounts;
  marks?: number; // For custom mark entry
  total?: number; // For custom mark entry
}

export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unattempted: number;
}

export interface TestResult {
  id: string;
  name: string;
  date: string;
  marks: number;
  total: number;
  duration?: number; // in minutes
  temperament: 'Calm' | 'Anxious' | 'Focused' | 'Fatigued';
  
  examType: 'JEE Main' | 'JEE Advanced' | 'NEET' | 'Custom / General';
  markingScheme?: MarkingScheme;

  testScope?: 'Full' | 'Part';
  partTestChapters?: Record<string, string[]>;
  
  breakdown?: Record<string, SubjectBreakdown>;
  
  weakTopics?: string[];
  postTestNotes?: string;

  timestamp: number;
  stream?: StreamType;

  attachment?: string | null;
  attachmentType?: 'image' | 'pdf' | null;
  fileName?: string | null;
  coachingName?: string;
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

  attachments?: Attachment[];

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
  lastActivity: number; 
  isOnline?: boolean;
  
  status: 'focus' | 'break' | 'idle';
  subject: 'Physics' | 'Chemistry' | 'Maths' | 'Biology' | 'Other';
  
  focusEndTime?: number;
  focusDuration?: number;
  intention?: string;
  accumulatedFocusTime?: number;
  
  isAway?: boolean;
  
  dailyFocusTime?: number;
  weeklyFocusTime?: number;
  lastFocusDate?: string;
  lastFocusWeek?: number;
}

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  color: string;
  activeCount: number;
  createdBy?: string;
  createdAt?: number;
  isSystem?: boolean;
  status?: 'active' | 'closing';
  isPrivate?: boolean;
  roomCode?: string;
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

export interface ActivityThresholds {
  level2: number; // in minutes
  level3: number; // in minutes
  level4: number; // in minutes
}