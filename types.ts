
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
  contentColor?: string;
  fontFamily?: 'wizard' | 'muggle' | 'sans';
  isGradient?: boolean;
}

export interface CarouselItem {
  id: string;
  title: string;
  date: string;
  content: string;
  type: 'announcement' | 'file' | 'video' | 'task';
  sector?: string; // Target sector ID
  style?: ItemStyle; // Custom styling
  subject?: string;
  isUnread?: boolean;
  likes?: number;
  isLiked?: boolean;
  author?: string;
  image?: string; // Optional image URL
  fileUrl?: string; // Optional URL for the actual PDF/Video file
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
}

export interface UserProfile {
  house: 'Griffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff' | 'Sector-7' | 'Sector-3' | 'Sector-1' | 'Sector-9';
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
  }
];