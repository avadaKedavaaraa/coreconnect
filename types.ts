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
  sortOrder?: 'newest' | 'oldest' | 'alphabetical' | 'manual';
}

export interface ItemStyle {
  titleColor?: string;
  titleColorEnd?: string;
  contentColor?: string;
  fontFamily?: string;
  isGradient?: boolean;
}

// --- NEW INTERFACE FOR UPDATE POPUPS ---
export interface UpdateAnnouncement {
  version: string;       // e.g. "2.5" - changing this triggers the popup for users
  title: string;
  content: string;       // Supports HTML/Text
  isActive: boolean;
  buttonText?: string;   // e.g. "Acknowledge"
}

export interface LectureRule {
  id: string;
  subject: string;
  batch?: 'AICS' | 'CSDA';
  image?: string;          // Banner Image
  customMessage?: string;  // Description
  
  // --- UPDATED SCHEDULING FIELDS ---
  days: string[];          // Changed from single 'dayOfWeek' to array ['Monday', 'Wednesday']
  startDate?: string;      // ISO Date (YYYY-MM-DD) - When does this course start?
  endDate?: string;        // ISO Date (YYYY-MM-DD) - When does it end?
  startTime: string;       // HH:mm
  endTime?: string;        // HH:mm - When does the class finish?
  
  link: string;
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
  isPinned?: boolean;
  likes?: number;
  isLiked?: boolean;
  author?: string;
  image?: string;        // Main Cover Image
  images?: string[];     // Gallery Images
  fileUrl?: string;
  order_index?: number;
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
  themeGradient?: boolean; // Enable gradient/neon mode
  preferredFont?: string;
  highContrast?: boolean; // Accessibility setting
  brightness?: number; // 50 to 150
  contrast?: number; // 50 to 150
  defaultSector?: string;
  visitCount: number;
  totalTimeSpent: number; // Seconds
  lastActive: string; // ISO String
  skipIntro?: boolean;      // If true, skips LoadingScanner and IdentityGate
  lastLineage?: Lineage;    // Remembers if you were Wizard/Muggle
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
  
  // --- NEW CONFIG FIELD ---
  updatePopup?: UpdateAnnouncement;

  cursorStyle?: 'classic' | 'minimal' | 'blade' | 'enchanted';
  defaultFont?: string;
  sortOrder?: 'newest' | 'oldest' | 'alphabetical' | 'manual'; // Fallback global sort
}

export const FONT_LIBRARY = [
    // --- DEFAULTS ---
    { id: 'wizard', name: 'Wizard Serif', family: '"EB Garamond", serif', category: 'Default' },
    { id: 'muggle', name: 'Muggle Mono', family: '"JetBrains Mono", monospace', category: 'Default' },
    { id: 'sans', name: 'Modern Sans', family: '"Inter", sans-serif', category: 'Default' },

    // --- SERIF & ELEGANT ---
    { id: 'playfair', name: 'Playfair Display', family: '"Playfair Display", serif', category: 'Elegant' },
    { id: 'merriweather', name: 'Merriweather', family: '"Merriweather", serif', category: 'Serif' },
    { id: 'lora', name: 'Lora', family: '"Lora", serif', category: 'Serif' },
    { id: 'pt-serif', name: 'PT Serif', family: '"PT Serif", serif', category: 'Serif' },
    { id: 'crimson', name: 'Crimson Text', family: '"Crimson Text", serif', category: 'Classic' },
    { id: 'libre-baskerville', name: 'Libre Baskerville', family: '"Libre Baskerville", serif', category: 'Classic' },
    { id: 'cinzel', name: 'Cinzel', family: '"Cinzel", serif', category: 'Fantasy' },
    { id: 'abril', name: 'Abril Fatface', family: '"Abril Fatface", cursive', category: 'Display' },
    { id: 'dm-serif', name: 'DM Serif Display', family: '"DM Serif Display", serif', category: 'Display' },
    { id: 'bree', name: 'Bree Serif', family: '"Bree Serif", serif', category: 'Friendly' },
    { id: 'arvo', name: 'Arvo', family: '"Arvo", serif', category: 'Slab' },
    { id: 'bitter', name: 'Bitter', family: '"Bitter", serif', category: 'Slab' },
    { id: 'rokkitt', name: 'Rokkitt', family: '"Rokkitt", serif', category: 'Slab' },

    // --- SANS SERIF & CLEAN ---
    { id: 'roboto', name: 'Roboto', family: '"Roboto", sans-serif', category: 'Clean' },
    { id: 'opensans', name: 'Open Sans', family: '"Open Sans", sans-serif', category: 'Clean' },
    { id: 'lato', name: 'Lato', family: '"Lato", sans-serif', category: 'Clean' },
    { id: 'montserrat', name: 'Montserrat', family: '"Montserrat", sans-serif', category: 'Modern' },
    { id: 'poppins', name: 'Poppins', family: '"Poppins", sans-serif', category: 'Modern' },
    { id: 'raleway', name: 'Raleway', family: '"Raleway", sans-serif', category: 'Elegant' },
    { id: 'nunito', name: 'Nunito', family: '"Nunito", sans-serif', category: 'Round' },
    { id: 'rubik', name: 'Rubik', family: '"Rubik", sans-serif', category: 'Modern' },
    { id: 'work-sans', name: 'Work Sans', family: '"Work Sans", sans-serif', category: 'Clean' },
    { id: 'quicksand', name: 'Quicksand', family: '"Quicksand", sans-serif', category: 'Round' },
    { id: 'oswald', name: 'Oswald', family: '"Oswald", sans-serif', category: 'Condensed' },
    { id: 'anton', name: 'Anton', family: '"Anton", sans-serif', category: 'Condensed' },
    { id: 'bebas', name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', category: 'Condensed' },

    // --- TECH & MONOSPACE ---
    { id: 'orbitron', name: 'Orbitron', family: '"Orbitron", sans-serif', category: 'Sci-Fi' },
    { id: 'audiowide', name: 'Audiowide', family: '"Audiowide", sans-serif', category: 'Sci-Fi' },
    { id: 'exo', name: 'Exo 2', family: '"Exo 2", sans-serif', category: 'Sci-Fi' },
    { id: 'rajdhani', name: 'Rajdhani', family: '"Rajdhani", sans-serif', category: 'Tech' },
    { id: 'ubuntu', name: 'Ubuntu', family: '"Ubuntu", sans-serif', category: 'Tech' },
    { id: 'courier', name: 'Courier Prime', family: '"Courier Prime", monospace', category: 'Mono' },
    { id: 'fira', name: 'Fira Code', family: '"Fira Code", monospace', category: 'Code' },
    { id: 'space', name: 'Space Mono', family: '"Space Mono", monospace', category: 'Mono' },
    { id: 'vt323', name: 'VT323', family: '"VT323", monospace', category: 'Pixel' },
    { id: 'press', name: 'Press Start 2P', family: '"Press Start 2P", cursive', category: 'Pixel' },
    { id: 'share-tech', name: 'Share Tech Mono', family: '"Share Tech Mono", monospace', category: 'Tech' },

    // --- HANDWRITTEN & DISPLAY ---
    { id: 'cursive', name: 'Dancing Script', family: '"Dancing Script", cursive', category: 'Script' },
    { id: 'pacific', name: 'Pacifico', family: '"Pacifico", cursive', category: 'Script' },
    { id: 'shadows', name: 'Shadows Into Light', family: '"Shadows Into Light", cursive', category: 'Hand' },
    { id: 'indie', name: 'Indie Flower', family: '"Indie Flower", cursive', category: 'Hand' },
    { id: 'amatic', name: 'Amatic SC', family: '"Amatic SC", cursive', category: 'Hand' },
    { id: 'caveat', name: 'Caveat', family: '"Caveat", cursive', category: 'Hand' },
    { id: 'permanent', name: 'Permanent Marker', family: '"Permanent Marker", cursive', category: 'Bold' },
    { id: 'satisfy', name: 'Satisfy', family: '"Satisfy", cursive', category: 'Script' },
    { id: 'great-vibes', name: 'Great Vibes', family: '"Great Vibes", cursive', category: 'Elegant' },
    { id: 'lobster', name: 'Lobster', family: '"Lobster", cursive', category: 'Display' },
    { id: 'righteous', name: 'Righteous', family: '"Righteous", cursive', category: 'Retro' },
    { id: 'fredoka', name: 'Fredoka One', family: '"Fredoka One", cursive', category: 'Round' },
    { id: 'bangers', name: 'Bangers', family: '"Bangers", cursive', category: 'Comic' },
    { id: 'creepster', name: 'Creepster', family: '"Creepster", cursive', category: 'Horror' },
    { id: 'special-elite', name: 'Special Elite', family: '"Special Elite", cursive', category: 'Typewriter' },
    { id: 'monoton', name: 'Monoton', family: '"Monoton", cursive', category: 'Retro' },
    { id: 'rye', name: 'Rye', family: '"Rye", serif', category: 'Western' },
    { id: 'unifraktur', name: 'UnifrakturMaguntia', family: '"UnifrakturMaguntia", cursive', category: 'Gothic' },
];

export const SECTORS: Sector[] = [
  {
    id: 'announcements',
    wizardName: 'Daily Prophet',
    muggleName: 'Announcements',
    wizardIcon: 'Scroll',
    muggleIcon: 'Megaphone',
    description: 'Main news feed and critical updates.',
    sortOrder: 'newest'
  },
  {
    id: 'lectures',
    wizardName: 'Owl Post Schedule',
    muggleName: 'Lecture Announcements',
    wizardIcon: 'Feather',
    muggleIcon: 'BellRing',
    description: 'Incoming knowledge streams and recordings.',
    sortOrder: 'newest'
  },
  {
    id: 'books',
    wizardName: 'Restricted Section',
    muggleName: 'Books',
    wizardIcon: 'Lock',
    muggleIcon: 'Book',
    description: 'High-level knowledge materials.',
    sortOrder: 'alphabetical'
  },
  {
    id: 'notes',
    wizardName: 'Pensieve Memories',
    muggleName: 'Pre-Notes',
    wizardIcon: 'Waves',
    muggleIcon: 'FileText',
    description: 'Archived thoughts and preliminary data.',
    sortOrder: 'newest'
  },
  {
    id: 'resources',
    wizardName: 'Room of Requirement',
    muggleName: 'Academic Resources',
    wizardIcon: 'DoorOpen',
    muggleIcon: 'Library',
    description: 'Tools appearing exactly when you need them.',
    sortOrder: 'newest'
  },
  {
    id: 'tasks',
    wizardName: 'O.W.L. Tasks',
    muggleName: 'Tutorial Sheets',
    wizardIcon: 'ScrollText',
    muggleIcon: 'ClipboardList',
    description: 'Assessments and practical evaluations.',
    sortOrder: 'newest'
  },
  {
    id: 'system_info',
    wizardName: 'Ministry Archives',
    muggleName: 'System Protocols',
    wizardIcon: 'CircleHelp',
    muggleIcon: 'Settings2',
    description: 'Operational status and documentation.',
    sortOrder: 'newest'
  }
];