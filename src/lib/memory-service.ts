import { db, isFirebaseConfigured } from "./firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where 
} from "firebase/firestore";

export interface MediaAsset {
  url: string;
  publicId: string;
  name: string;
  type?: string;
  size?: number;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  date: string;
  time: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  userId: string;
  category: "Note" | "Activity" | "Insight" | "Reminder" | string;
  summary?: string;
  favorite?: boolean;
  
  // Phase 3 media array assets
  images?: MediaAsset[];
  audios?: MediaAsset[];
  documents?: MediaAsset[];

  // Backward compatibility singular fields
  attachment?: {
    name: string;
    type: string;
  };
  audioDuration?: number;

  // Phase 6 enhancements timing fields
  fromTime?: string;
  toTime?: string;
  duration?: string;
}

const LOCAL_STORAGE_KEY = "memory_ai_local_memories";

// Helper to check if Firestore is accessible
const useFirestore = () => {
  return isFirebaseConfigured && db !== null;
};

// Initialize Mock data in LocalStorage if empty
const getLocalMemories = (): Memory[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse local memories", e);
    }
  }

  // Prepopulate default items
  const defaultMemories: Memory[] = [
    {
      id: "1",
      title: "Phase 1 App Setup",
      content: "Abhishek requested Phase 1 authentication and mobile UI implementation using Next.js 15 and Tailwind.",
      date: new Date().toISOString().split("T")[0],
      time: "13:15",
      createdAt: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 3,
      tags: ["setup", "nextjs", "auth"],
      userId: "mock-user-123",
      category: "Activity",
    },
    {
      id: "2",
      title: "Brainstorming Session",
      content: "Brainstorming session: Apple-inspired minimalist monochrome styling achieves the highest visual premium factor. Keep layouts simple and typography clean.",
      date: new Date().toISOString().split("T")[0],
      time: "09:30",
      createdAt: Date.now() - 1000 * 60 * 60 * 7, // 7 hours ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 7,
      tags: ["design", "ui", "ux"],
      userId: "mock-user-123",
      category: "Insight",
      images: [
        {
          url: "https://picsum.photos/id/15/800/600",
          publicId: "mock-image-1",
          name: "design_moodboard.png",
        }
      ]
    },
    {
      id: "3",
      title: "Firebase Configuration",
      content: "Setup Firebase Console configuration variables in .env.local prior to Phase 2 deployment.",
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Yesterday
      time: "16:50",
      createdAt: Date.now() - 1000 * 60 * 60 * 24, // 24 hours ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 24,
      tags: ["firebase", "deployment"],
      userId: "mock-user-123",
      category: "Reminder",
    },
  ];

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultMemories));
  return defaultMemories;
};

const saveLocalMemories = (memories: Memory[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  }
};

export const memoryService = {
  // Query memories
  async fetchMemories(userId: string): Promise<Memory[]> {
    if (useFirestore() && db) {
      try {
        const memoriesRef = collection(db, "memories");
        const q = query(memoriesRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const list: Memory[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
          } as Memory);
        });
        
        // Sort client-side to bypass Firestore custom index requirement
        return list.sort((a, b) => b.createdAt - a.createdAt);
      } catch (error) {
        console.error("Firestore fetch memories failed, falling back to LocalStorage:", error);
      }
    }

    // Local Storage Fallback
    const local = getLocalMemories();
    return local
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  // Fetch individual memory details
  async fetchMemoryById(id: string, userId: string): Promise<Memory | null> {
    if (useFirestore() && db) {
      try {
        const docRef = doc(db, "memories", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return { id: docSnap.id, ...data } as Memory;
        }
      } catch (error) {
        console.error("Firestore get memory failed:", error);
      }
    }

    const local = getLocalMemories();
    const found = local.find((m) => m.id === id && m.userId === userId);
    return found || null;
  },

  // Add new memory
  async createMemory(memoryData: Omit<Memory, "id" | "createdAt" | "updatedAt">): Promise<Memory> {
    const timestamp = Date.now();
    const newDoc = {
      ...memoryData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (useFirestore() && db) {
      try {
        const docRef = await addDoc(collection(db, "memories"), newDoc);
        return {
          id: docRef.id,
          ...newDoc,
        };
      } catch (error) {
        console.error("Firestore add memory failed, saving locally:", error);
      }
    }

    // Local Storage Fallback
    const local = getLocalMemories();
    const memoryWithId: Memory = {
      id: "local-" + Date.now() + Math.random().toString(36).substr(2, 5),
      ...newDoc,
    };
    local.push(memoryWithId);
    saveLocalMemories(local);
    return memoryWithId;
  },

  // Update memory
  async updateMemory(id: string, userId: string, updateData: Partial<Omit<Memory, "id" | "createdAt" | "userId">>): Promise<boolean> {
    const timestamp = Date.now();
    const dataToUpdate = {
      ...updateData,
      updatedAt: timestamp,
    };

    if (useFirestore() && db) {
      try {
        const docRef = doc(db, "memories", id);
        await updateDoc(docRef, dataToUpdate);
        return true;
      } catch (error) {
        console.error("Firestore update memory failed, editing locally:", error);
      }
    }

    // Local Storage Fallback
    const local = getLocalMemories();
    const index = local.findIndex((m) => m.id === id && m.userId === userId);
    if (index !== -1) {
      local[index] = {
        ...local[index],
        ...dataToUpdate,
      };
      saveLocalMemories(local);
      return true;
    }
    return false;
  },

  // Delete memory
  async deleteMemory(id: string, userId: string): Promise<boolean> {
    if (useFirestore() && db) {
      try {
        const docRef = doc(db, "memories", id);
        await deleteDoc(docRef);
        return true;
      } catch (error) {
        console.error("Firestore delete memory failed, deleting locally:", error);
      }
    }

    // Local Storage Fallback
    const local = getLocalMemories();
    const initialLength = local.length;
    const filtered = local.filter((m) => !(m.id === id && m.userId === userId));
    if (filtered.length !== initialLength) {
      saveLocalMemories(filtered);
      return true;
    }
    return false;
  },

  // Create a shared logs compiler entry with expiration
  async createSharedLink(userId: string, date: string, memories: Memory[], durationHours: number, aiSummary?: string): Promise<string> {
    const createdAt = Date.now();
    const expiresAt = createdAt + durationHours * 60 * 60 * 1000;
    const shareData = {
      userId,
      date,
      memories,
      createdAt,
      expiresAt,
      durationHours,
      aiSummary
    };

    if (useFirestore() && db) {
      try {
        const docRef = await addDoc(collection(db, "shared_logs"), shareData);
        return docRef.id;
      } catch (error) {
        console.error("Firestore add shared_logs failed, saving locally:", error);
      }
    }

    // Local Storage Fallback
    const localSharedKey = "memory_ai_local_shared_logs";
    const sharedLogs = JSON.parse(localStorage.getItem(localSharedKey) || "[]");
    const shareId = "share-" + Date.now() + Math.random().toString(36).substr(2, 5);
    sharedLogs.push({ id: shareId, ...shareData });
    localStorage.setItem(localSharedKey, JSON.stringify(sharedLogs));
    return shareId;
  },

  // Fetch shared logs data by shareId
  async fetchSharedLink(id: string): Promise<{ date: string; memories: Memory[]; expiresAt: number; durationHours: number; aiSummary?: string } | null> {
    if (useFirestore() && db) {
      try {
        const docRef = doc(db, "shared_logs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as any;
        }
      } catch (error) {
        console.error("Firestore fetch shared_logs failed:", error);
        throw error;
      }
    }

    // Local Storage Fallback
    const localSharedKey = "memory_ai_local_shared_logs";
    const sharedLogs = JSON.parse(localStorage.getItem(localSharedKey) || "[]");
    const found = sharedLogs.find((s: any) => s.id === id);
    return found || null;
  }
};
