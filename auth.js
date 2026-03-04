import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBb1Tp9duLgxojLxIIzrj_zOEDOQkv_-SI",
    authDomain: "controle-financeiro-a9138.firebaseapp.com",
    projectId: "controle-financeiro-a9138",
    storageBucket: "controle-financeiro-a9138.firebasestorage.app",
    messagingSenderId: "1000821412376",
    appId: "1:1000821412376:web:800ac9f65916069325296d"
};

let app;
let auth;
let provider;

export function initFirebase() {
    if (!app) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();
        // Configurações adicionais do provider se necessário
        provider.setCustomParameters({
            prompt: 'select_account'
        });
    }
    return { app, auth };
}

export async function loginWithGoogle() {
    if (!auth) initFirebase();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Erro no login popup:", error);
        throw error;
    }
}

export async function logout() {
    if (!auth) initFirebase();
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro no logout:", error);
        throw error;
    }
}

export function subscribeToAuthChanges(onUserAuthenticated, onUserNotAuthenticated) {
    if (!auth) initFirebase();
    
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            onUserAuthenticated(user);
        } else {
            onUserNotAuthenticated();
        }
    });
}

export function getCurrentUser() {
    if (!auth) initFirebase();
    return auth.currentUser;
}
