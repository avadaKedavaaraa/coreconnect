// ============================================================================
// 1. TELEGRAM CHANNEL SETTINGS
// ============================================================================
// Enter your PUBLIC channel username here (without @ or t.me/)
// Example: if your link is t.me/NASA, put 'NASA'
export const TELEGRAM_CHANNEL = 'telegram'; 

// ============================================================================
// 2. YOUR FILES & IMAGES
// ============================================================================
// Add your files here. They will automatically appear in the App.
// Copy the image link from Telegram Desktop (Right Click Image > Copy Image Link)
export const MY_FILES = [
  {
    id: '1',
    title: 'Semester Schedule',
    description: 'The official timeline for 2024.',
    date: '2024.12.25',
    // Paste an image link below
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop', 
    subject: 'General'
  },
  {
    id: '2',
    title: 'Potion Recipes PDF',
    description: 'Advanced brewing techniques.',
    date: '2024.12.26',
    // You can leave image empty if it's just a text file
    image: '', 
    subject: 'Potions'
  },
  {
    id: '3',
    title: 'Defense Against Dark Arts',
    description: 'Notes on counter-curses.',
    date: '2024.12.27',
    image: 'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=500&auto=format&fit=crop',
    subject: 'Defense'
  }
];