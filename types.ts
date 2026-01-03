

export enum Lineage {
  WIZARD = 'WIZARD',
  MUGGLE = 'MUGGLE'
}

export interface Sector {
  id: string;
  wizardName: string;
  muggleName: string;
  wizardIcon: string; 
  muggleIcon: string;
  description: string;
}

export interface ItemStyle {
  titleColor?: string;
  titleColorEnd?: string; // Added for gradients
  contentColor?: string;
  fontFamily?: 'wizard' | 'muggle' | 'sans';
  isGradient?: boolean;
}

export interface LectureRule {
  id: string;
  subject: string;
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  startTime: string; // "10:00"
  link: string; // The join link
  endDate?: string; // ISO date string
  recurrence: 'weekly' | 'monthly';
  isActive: boolean;
}

export interface CarouselItem {
  id: string;
  title: string;
  date: string;
  content: string;
  type: 'announcement' | 'file' | 'video' | 'task' | 'mixed' | 'link' | 'code';
  sector?: string;
  style?: ItemStyle;
  subject?: string;
  isUnread?: boolean;
  likes?: number;
  isLiked?: boolean;
  author?: string;
  image?: string;
  fileUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
}

export interface UserProfile {
  id: string; // UUID for tracking
  displayName: string;
  house: 'Griffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff' | 'Sector-7' | 'Sector-3' | 'Sector-1' | 'Sector-9';
  themeColor?: string; // User selected accent color
  preferredFont?: 'wizard' | 'muggle' | 'sans' | 'playfair' | 'orbitron' | 'montserrat' | 'courier' | 'cursive' | 'tech' | 'retro';
  highContrast?: boolean; // Accessibility setting
  brightness?: number; // 50 to 150
  contrast?: number; // 50 to 150
  defaultSector?: string;
  visitCount: number;
  totalTimeSpent: number; // Seconds
  lastActive: string; // ISO String
}

export interface VisitorLog {
  visitor_id: string;
  display_name: string;
  total_time_spent: number;
  visit_count: number;
  last_active: string;
  ip_hash?: string;
}

export interface AdminPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
  isGod: boolean;
}

export interface AdminUser {
  username: string;
  role: string;
  lastActive: string;
  permissions: AdminPermissions;
  ip?: string;
  isBlocked?: boolean;
}

export interface AuditLog {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface GlobalConfig {
  wizardTitle: string;
  muggleTitle: string;
  wizardLogoText: string;
  muggleLogoText: string;
  wizardGateText: string;
  muggleGateText: string;
  wizardAlarmUrl: string;
  muggleAlarmUrl: string;
  wizardImage: string;
  muggleImage: string;
  wizardLogoUrl?: string; 
  muggleLogoUrl?: string;
  telegramLink?: string; 
  schedules?: LectureRule[]; 
  cursorStyle?: 'classic' | 'minimal' | 'blade' | 'enchanted';
}

export const SECTORS: Sector[] = [
  {
    id: 'announcements',
    wizardName: 'Daily Prophet',
    muggleName: 'Announcements',
    wizardIcon: 'Scroll',
    muggleIcon: 'Megaphone',
    description: 'Main news feed and critical updates.'
  },
  {
    id: 'lectures',
    wizardName: 'Owl Post Schedule',
    muggleName: 'Lecture Announcements',
    wizardIcon: 'Feather',
    muggleIcon: 'BellRing',
    description: 'Incoming knowledge streams and recordings.'
  },
  {
    id: 'books',
    wizardName: 'Restricted Section',
    muggleName: 'Books',
    wizardIcon: 'Lock',
    muggleIcon: 'Book',
    description: 'High-level knowledge materials.'
  },
  {
    id: 'notes',
    wizardName: 'Pensieve Memories',
    muggleName: 'Pre-Notes',
    wizardIcon: 'Waves',
    muggleIcon: 'FileText',
    description: 'Archived thoughts and preliminary data.'
  },
  {
    id: 'resources',
    wizardName: 'Room of Requirement',
    muggleName: 'Academic Resources',
    wizardIcon: 'DoorOpen',
    muggleIcon: 'Library',
    description: 'Tools appearing exactly when you need them.'
  },
  {
    id: 'tasks',
    wizardName: 'O.W.L. Tasks',
    muggleName: 'Tutorial Sheets',
    wizardIcon: 'ScrollText',
    muggleIcon: 'ClipboardList',
    description: 'Assessments and practical evaluations.'
  },
  {
    id: 'system_info',
    wizardName: 'Ministry Archives',
    muggleName: 'System Protocols',
    wizardIcon: 'CircleHelp',
    muggleIcon: 'Settings2',
    description: 'Operational status and documentation.'
  }
];