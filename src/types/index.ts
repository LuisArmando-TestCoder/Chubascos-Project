export type Post = {
  id: string;
  userId: string;
  title: string;
  content: string;
  slug: string;
  tagIds: string[];
  shaderId?: string;
  eventId?: string;
  isVisible: boolean;
  isIndexed: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
};

export type User = {
  id: string; // Document ID (email)
  email: string;
  username?: string;
  bio?: string;
  photoUrl?: string;
  contacts: Contact[];
  createdAt: any;
};

export type Contact = {
  label: string;
  url: string;
};

export type Event = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  day: any;
  hour: string;
  place: string;
  price?: number;
  urls: string[];
  contacts: string[];
  tagIds: string[];
  createdAt: any;
  updatedAt: any;
};

export type Tag = {
  id: string;
  value: string;
  slug: string;
  usedBy: number;
};

export type Shader = {
  id: string;
  ownerUserId: string;
  name: string;
  description?: string;
  glslCode: string;
  isPublic: boolean;
  usedBy: number;
  createdAt: any;
  updatedAt: any;
};
