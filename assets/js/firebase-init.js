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
  query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZb8JUuzrDwR__koCZw7sFBWDGFyw_Slg",
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
async function uploadFile(file, folder) {
  const userId = currentUser?.uid || "anonymous";
  const safeName = encodeURIComponent(file.name || "file");
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(ref);
  return { url, path };
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

  /* ---- Storage uploads ---- */
  async uploadImage(file) {
    return uploadFile(file, "listings");
  },
  async uploadPhoto(file) {
    const folder = (file.type || "").startsWith("image/") ? "baristas/photos" : "baristas/cv";
    return uploadFile(file, folder);
  },
};

// Fire a global ready event once auth has settled.
authReady.then(() => {
  window.dispatchEvent(new CustomEvent("cw-firebase-ready"));
});
