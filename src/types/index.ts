import type { Timestamp } from 'firebase-admin/firestore';

export type SerializedTimestamp = { seconds: number; nanoseconds: number };
export type FirestoreTimestamp = Timestamp | SerializedTimestamp | null;

export type Contact = {
  label: string;
  url: string;
};

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
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type User = {
  id: string;
  email: string;
  username?: string;
  usernameLower?: string;
  bio?: string;
  contacts: Contact[];
  sessionVersion: number;
  createdAt: FirestoreTimestamp;
};

export type Event = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  day: FirestoreTimestamp;
  hour: string;
  place: string;
  price?: number;
  urls: string[];
  contacts: string[];
  tagIds: string[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
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
  isDeleted: boolean;
  usedBy: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type LiveFeedItem = Post & {
  authorName?: string;
  eventType?: 'new' | 'updated';
};

export type SavedStore = {
  posts: string[];
  users: string[];
  events: string[];
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };
