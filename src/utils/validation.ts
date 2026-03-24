import { z } from 'zod';

export const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  tagIds: z.array(z.string()).max(4),
  shaderId: z.string().optional(),
  eventId: z.string().optional(),
  isVisible: z.boolean().default(true),
  isIndexed: z.boolean().default(true),
});

export const UserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9-]+$/).optional(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  contacts: z.array(z.object({
    label: z.string().min(1).max(50),
    url: z.string().url(),
  })).max(5),
});

export const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  day: z.any(), // Will be handled as Firestore Timestamp
  hour: z.string().min(1).max(50),
  place: z.string().min(1).max(200),
  price: z.number().nonnegative().optional(),
  urls: z.array(z.string().url()).max(5),
  contacts: z.array(z.string().min(1).max(100)).max(5),
  tagIds: z.array(z.string()).max(4),
});

export const ShaderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  glslCode: z.string().min(1).max(50000),
  isPublic: z.boolean().default(false),
});
