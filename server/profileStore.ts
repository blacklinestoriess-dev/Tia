import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface OwnerMemory {
  id: string;
  fact: string;
  category?: 'work' | 'personal' | 'preference' | 'identity' | 'general' | 'user_requested';
  createdAt: string;
  updatedAt?: string;
}

export interface OwnerProfile {
  name: string;
  relationship: 'owner';
  location: string;
  occupation_status: string;
  personality_traits: string[];
  additional_memories: OwnerMemory[];
  custom_fields?: Record<string, string>;
  last_updated: string;
}

export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  name: 'Anurag',
  relationship: 'owner',
  location: 'Patna, India',
  occupation_status: 'working on a startup',
  personality_traits: ['intelligent', 'curious', 'ambitious'],
  additional_memories: [
    {
      id: 'mem-init-1',
      fact: 'Anurag is the creator and owner of Tia.',
      category: 'identity',
      createdAt: '2026-09-10T23:47:24.000Z',
    },
    {
      id: 'mem-init-2',
      fact: 'Anurag lives in Patna, India and is building a startup.',
      category: 'work',
      createdAt: '2026-09-10T23:47:24.000Z',
    },
  ],
  custom_fields: {},
  last_updated: '2026-09-10T23:47:24.000Z',
};

// Determine file storage path
function getStoragePath(): string {
  // If in ES module context
  try {
    const currentDir = process.cwd();
    const dataDir = path.resolve(currentDir, 'server', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.resolve(dataDir, 'owner_profile.json');
  } catch {
    const dataDir = path.resolve('/server', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.resolve(dataDir, 'owner_profile.json');
  }
}

// In-memory cached copy
let cachedProfile: OwnerProfile | null = null;

/**
 * Loads the persistent owner profile from disk.
 * Initializes with DEFAULT_OWNER_PROFILE if file doesn't exist yet.
 */
export function getOwnerProfile(): OwnerProfile {
  if (cachedProfile) {
    return cachedProfile;
  }

  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.name) {
        cachedProfile = {
          name: parsed.name || DEFAULT_OWNER_PROFILE.name,
          relationship: 'owner',
          location: parsed.location || DEFAULT_OWNER_PROFILE.location,
          occupation_status:
            parsed.occupation_status || DEFAULT_OWNER_PROFILE.occupation_status,
          personality_traits: Array.isArray(parsed.personality_traits)
            ? parsed.personality_traits
            : DEFAULT_OWNER_PROFILE.personality_traits,
          additional_memories: Array.isArray(parsed.additional_memories)
            ? parsed.additional_memories
            : [],
          custom_fields: parsed.custom_fields || {},
          last_updated: parsed.last_updated || new Date().toISOString(),
        };
        return cachedProfile;
      }
    }
  } catch (err) {
    console.warn('Error reading owner_profile.json, falling back to default:', err);
  }

  // Initialize file with default profile
  cachedProfile = { ...DEFAULT_OWNER_PROFILE };
  saveOwnerProfile(cachedProfile);
  return cachedProfile;
}

/**
 * Atomically saves the owner profile to persistent disk storage.
 */
export function saveOwnerProfile(profile: OwnerProfile): boolean {
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    profile.last_updated = new Date().toISOString();
    cachedProfile = profile;

    const tmpPath = `${filePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(profile, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error('Failed to write owner_profile.json:', err);
    return false;
  }
}

/**
 * Updates specific fields in the owner profile.
 */
export function updateOwnerProfile(
  updates: Partial<Omit<OwnerProfile, 'relationship' | 'last_updated'>>
): OwnerProfile {
  const current = getOwnerProfile();

  const updated: OwnerProfile = {
    ...current,
    name: typeof updates.name === 'string' && updates.name.trim() ? updates.name.trim() : current.name,
    location:
      typeof updates.location === 'string' && updates.location.trim()
        ? updates.location.trim()
        : current.location,
    occupation_status:
      typeof updates.occupation_status === 'string' && updates.occupation_status.trim()
        ? updates.occupation_status.trim()
        : current.occupation_status,
    personality_traits: Array.isArray(updates.personality_traits)
      ? updates.personality_traits
      : current.personality_traits,
    custom_fields: {
      ...(current.custom_fields || {}),
      ...(updates.custom_fields || {}),
    },
    additional_memories: Array.isArray(updates.additional_memories)
      ? updates.additional_memories
      : current.additional_memories,
    relationship: 'owner',
    last_updated: new Date().toISOString(),
  };

  saveOwnerProfile(updated);
  return updated;
}

/**
 * Adds an explicit fact or memory requested by Anurag.
 */
export function addOwnerMemory(
  fact: string,
  category: OwnerMemory['category'] = 'general'
): OwnerProfile {
  const current = getOwnerProfile();
  const trimmed = fact.trim();
  if (!trimmed) return current;

  // Check if identical fact already exists
  const exists = current.additional_memories.some(
    (m) => m.fact.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return current;

  const newMemory: OwnerMemory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fact: trimmed,
    category,
    createdAt: new Date().toISOString(),
  };

  const updated: OwnerProfile = {
    ...current,
    additional_memories: [newMemory, ...current.additional_memories],
    last_updated: new Date().toISOString(),
  };

  saveOwnerProfile(updated);
  return updated;
}

/**
 * Removes a specific memory fact by id.
 */
export function deleteOwnerMemory(id: string): OwnerProfile {
  const current = getOwnerProfile();
  const updated: OwnerProfile = {
    ...current,
    additional_memories: current.additional_memories.filter((m) => m.id !== id),
    last_updated: new Date().toISOString(),
  };

  saveOwnerProfile(updated);
  return updated;
}

/**
 * Resets the profile back to the initial default Anurag profile.
 */
export function resetOwnerProfile(): OwnerProfile {
  const fresh: OwnerProfile = {
    ...DEFAULT_OWNER_PROFILE,
    last_updated: new Date().toISOString(),
  };
  saveOwnerProfile(fresh);
  return fresh;
}
