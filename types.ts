
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
  name?: string; // Optional user-defined display name (falls back to `topic` if absent)
  attempted: number;
  correct: number;
  mistakes: MistakeCounts;
  questionLogs?: QuestionLog[]; // Added for Stopwatch Question tracking
  timestamp: number;
  duration?: number; // Total seconds spent in this session
  plannedDuration?: number; // Total seconds planned for the session
  focusRating?: number; // 1-10 rating of focus quality
  stream?: StreamType;
  type?: 'focus' | 'stopwatch'; // Distinguish session types
}

export interface QuestionLog {
  timestamp: number;
  duration: number; // in seconds
  result: 'correct' | keyof MistakeCounts;
  subject: string; // Added to track subject per question
}

export type AdvancedQuestionType = 'singleCorrect' | 'multipleCorrect' | 'numerical' | 'matchFollowing' | 'paragraph';

export interface AdvancedQuestionStats {
  correct: number;
  incorrect: number;
  unattempted: number;
  partialCorrect?: number;
}

export interface SubjectBreakdown {
  correct: number;
  incorrect: number;
  unattempted: number;
  timeSpent?: number; // in minutes
  mistakes?: MistakeCounts;
  marks?: number; // For custom mark entry
  total?: number; // For custom mark entry
  advancedBreakdown?: Record<AdvancedQuestionType, AdvancedQuestionStats>;
}

export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unattempted: number;
}

export interface AdvancedMarkingScheme {
  singleCorrect?: { correct: number; incorrect: number };
  multipleCorrect?: { correct: number; incorrect: number; partial?: number };
  numerical?: { correct: number; incorrect: number };
  matchFollowing?: { correct: number; incorrect: number; partial?: number };
  paragraph?: { correct: number; incorrect: number };
  [key: string]: { correct: number; incorrect: number; partial?: number } | undefined;
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
  advancedMarkingScheme?: AdvancedMarkingScheme;

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

export type ViewType = 'daily' | 'planner' | 'focus' | 'tests' | 'analytics' | 'log' | 'privacy' | 'group-focus' | 'friends';

export type ThemeId = 'midnight' | 'obsidian' | 'void' | 'forest' | 'morning' | 'earth' | 'default-dark' | 'default-light';

export type StreamType = 'JEE' | 'NEET' | 'General';

export interface CountdownTarget {
  id: string;
  date: string;
  name: string;
}

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

// --- STUDY BUDDY TYPES ---
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  studyBuddyUsername?: string;
  friendCode?: string;
  xp?: number;
  level?: number;
  currentStreak?: number;
  maxStreak?: number;
  currentXpWeek?: string; // e.g. "2024-W05"
  lastWeekXp?: number;
  lastWeekLevel?: number;
  stream?: StreamType;
}

export interface FriendRequest {
  uid: string;
  displayName: string;
  photoURL: string | null;
  friendCode: string;
  timestamp: number;
}

export interface Friend {
  uid: string;
  displayName: string;
  photoURL: string | null;
  friendCode: string;
}

export interface PresenceState {
  isOnline: boolean;
  state: 'idle' | 'focus' | 'break';
  subject?: string | null;
  endTime?: number | null;
  dailyFocusTime?: number; // Added to track total seconds today
  weeklyFocusTime?: number; // Added to track total seconds this week
  yearlyFocusTime?: number; // Added to track total seconds this year
  subjectSplit?: Record<string, number>; // Object mapping subject name to total seconds
  dailySubjectSplit?: Record<string, number>;
  weeklySubjectSplit?: Record<string, number>;
  yearlySubjectSplit?: Record<string, number>;
  lastChanged: object; // serverTimestamp
  xp?: number;
  level?: number;
}
