export interface TimestampItem {
  time: string;
  topic: string;
}

export interface SocialHook {
  platform: string;
  content: string;
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  content: string;
}

export interface YouTubeShortIdea {
  timestamp: string;
  hook: string; // Why this moment goes viral
  score: number; // Viral potential 1-10
}

export interface YouTubeAssets {
  titles: string[]; // 3 Variations of high CTR titles
  description: string; // SEO optimized description
  thumbnailText: string[]; // Short text to put ON the image
  shorts: YouTubeShortIdea[];
  tags: string[];
}

export interface PodcastAssets {
  episodeTitles: string[]; // Array of options (3-5)
  hook: string; // The "Cold Open" paragraph
  showNotes: string; // NEW: Optimized for Apple/Spotify (Short, Bulleted)
  blogPost: string; // NEW: Replaces summary (Long, SEO)
  timestamps: TimestampItem[];
  newsletterDraft: string;
  guestSwipeEmail: string; // Email for the guest to send to their list
  linkedinCarousel: CarouselSlide[]; // Structured content for a carousel
  viralQuotes: string[]; // Short punchy quotes
  socialHooks: SocialHook[];
  youtube: YouTubeAssets; // New YouTube section
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}