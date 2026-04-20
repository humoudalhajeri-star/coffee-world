/**
 * Firebase bootstrap — loads the SDK and wires it into a global
 * `window.CW_FB` object used by `api.js`.
 *
 * This file is loaded as an ES module (<script type="module">), so the
 * CDN imports resolve natively in the browser. When the bundle is not
 * reachable (offline, CDN outage, etc.) the import fails silently and
 * `window.CW_FB` never gets defined — `api.js` then falls back to the
 * existing localStorage implementation.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc,
  updateDoc, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZb8JJUzrDwR__koCZw7sFBWDGFyw_Slg",
  authDomain: "coffee-world-52a27.firebaseapp.com",
  projectId: "coffee-world-52a27",
  storageBucket: "coffee-world-52a27.firebasestorage.app",
  messagingSenderId: "914103044463",
  appId: "1:914103044463:web:e3e63a997e0c6a73f0409a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/* ============================================================
 * Auth state
 * ============================================================ */
let currentUser = null;

const authReady = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser = user;
    resolve();
    window.dispatchEvent(new CustomEvent("cw-auth-changed", { detail: user }));
  });
  // Safety: if Firebase Auth never responds, still resolve after 5s so the
  // UI doesn't hang in an unknown state.
  setTimeout(resolve, 5000);
});

function toSerializableDoc(snapDoc) {
  const data = snapDoc.data() || {};
  const ts = data.createdAt;
  return {
    id: snapDoc.id,
    ...data,
    createdAt: ts?.toDate ? ts.toDate().toISOString() : ts || null,
  };
}

/* ============================================================
 * Storage
 * ============================================================ */

/**
 * Compress an image File into a JPEG Blob — drastically faster uploads
 * on mobile networks. A typical 5MB phone photo shrinks to ~100KB.
 * Non-images and small images bypass compression.
 */
async function compressImageToBlob(file, { maxDim = 1200, quality = 0.82 } = {}) {
  if (!file.type || !file.type.startsWith("image/") || file.size < 200_000) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => resolve(blob || file),
            "image/jpeg",
            quality
          );
        } catch { resolve(file); }
      };
      img.onerror = () => resolve(file);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file, folder, onProgress) {
  const userId = currentUser?.uid || "anonymous";
  // Compress images first so the actual upload is tiny
  const blob = await compressImageToBlob(file, { maxDim: 1000, quality: 0.78 });
  const isJpeg = blob !== file && blob.type === "image/jpeg";
  const baseName = (file.name || "file").replace(/\.[^.]+$/, "");
  const safeName = encodeURIComponent(isJpeg ? `${baseName}.jpg` : (file.name || "file"));
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;
  const ref = storageRef(storage, path);
  const contentType = blob.type || file.type || "application/octet-stream";

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, blob, { contentType });

    // Watchdog: if Firebase Storage never reports progress, assume it's
    // broken/unreachable and fail fast so the caller can fall back to
    // embedding the file in Firestore.
    let lastActivity = Date.now();
    const NO_PROGRESS_MS = 12_000;   // abort if stuck for 12s
    const TOTAL_MS      = 45_000;    // hard cap 45s
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > NO_PROGRESS_MS) {
        cleanup();
        try { task.cancel(); } catch {}
        reject(new Error("STORAGE_STUCK: Firebase Storage لم يستجب — تم التحويل للتخزين البديل"));
      }
    }, 2_000);
    const total = setTimeout(() => {
      cleanup();
      try { task.cancel(); } catch {}
      reject(new Error("STORAGE_TIMEOUT: تجاوز الرفع الحد الزمني"));
    }, TOTAL_MS);
    function cleanup() { clearInterval(watchdog); clearTimeout(total); }

    task.on(
      "state_changed",
      (snap) => {
        lastActivity = Date.now();
        if (typeof onProgress === "function" && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (err) => { cleanup(); reject(err); },
      async () => {
        cleanup();
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path });
        } catch (err) { reject(err); }
      }
    );
  });
}

/* ============================================================
 * Public surface: window.CW_FB
 * ============================================================ */
window.CW_FB = {
  ready: authReady,

  /* ---- Auth ---- */
  auth: {
    current() {
      if (!currentUser) return null;
      return {
        user: {
          id: currentUser.uid,
          name: currentUser.displayName || "",
          email: currentUser.email || "",
        },
        token: "firebase",
      };
    },
    async signUp({ name, email, password }) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        try { await updateProfile(cred.user, { displayName: name }); } catch {}
      }
      currentUser = cred.user;
      return this.current();
    },
    async signIn({ email, password }) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      currentUser = cred.user;
      return this.current();
    },
    async signOut() {
      await fbSignOut(auth);
      currentUser = null;
      return { ok: true };
    },
  },

  /* ---- Firestore: generic CRUD ---- */
  async listDocs(collName, { ownerOnly = false, searchFields = [], searchText = "" } = {}) {
    const snap = await getDocs(query(collection(db, collName), orderBy("createdAt", "desc")));
    let items = snap.docs.map(toSerializableDoc);
    if (ownerOnly && currentUser) {
      items = items.filter((x) => x.ownerId === currentUser.uid);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter((it) =>
        searchFields.some((f) => String(it[f] || "").toLowerCase().includes(q))
      );
    }
    return items;
  },

  async getDocById(collName, id) {
    const snap = await getDoc(doc(db, collName, id));
    if (!snap.exists()) return null;
    return toSerializableDoc(snap);
  },

  async createDoc(collName, data) {
    const withMeta = {
      ...data,
      ownerId: currentUser?.uid || null,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, collName), withMeta);
    return { id: ref.id, ...data, ownerId: withMeta.ownerId, createdAt: new Date().toISOString() };
  },

  async deleteDoc(collName, id) {
    await deleteDoc(doc(db, collName, id));
    return { ok: true };
  },

  async updateDoc(collName, id, data) {
    const clean = { ...data };
    // never overwrite immutable metadata on updates
    delete clean.id;
    delete clean.ownerId;
    delete clean.createdAt;
    clean.updatedAt = serverTimestamp();
    await updateDoc(doc(db, collName, id), clean);
    return { id, ...data, updatedAt: new Date().toISOString() };
  },

  /* ---- Storage uploads ---- */
  async uploadImage(file, onProgress) {
    return uploadFile(file, "listings", onProgress);
  },
  async uploadPhoto(file, onProgress) {
    const folder = (file.type || "").startsWith("image/") ? "baristas/photos" : "baristas/cv";
    return uploadFile(file, folder, onProgress);
  },
};

// Fire a global ready event once auth has settled.
authReady.then(() => {
  window.dispatchEvent(new CustomEvent("cw-firebase-ready"));
});
