// Firebase login + cloud save for Sudoku (same accounts as Supermania Ludo)
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signInAnonymously,signOut,updateProfile} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const fc=await import('./firebase-config.js?t='+Date.now());
const cfg=fc.firebaseConfig||fc.default;
if(!cfg||!cfg.apiKey||!cfg.appId)throw new Error('Firebase config is missing apiKey or appId in firebase-config.js');

const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const mail=u=>u.toLowerCase()+'@supermania.games';
const ref=()=>doc(db,'sudokuSaves',auth.currentUser.uid);

export const me=()=>auth.currentUser&&{uid:auth.currentUser.uid,name:auth.currentUser.displayName||'Player'};
export const onUser=cb=>onAuthStateChanged(auth,cb);
export const signIn=(u,p)=>signInWithEmailAndPassword(auth,mail(u),p);
export const signUp=async(u,p)=>{const c=await createUserWithEmailAndPassword(auth,mail(u),p);await updateProfile(c.user,{displayName:u})};
export const guest=async name=>{const c=await signInAnonymously(auth);await updateProfile(c.user,{displayName:name})};
export const logout=()=>signOut(auth);
export const pull=async()=>{const s=await getDoc(ref());return s.exists()?s.data():null};
export const push=data=>setDoc(ref(),data,{merge:true});
