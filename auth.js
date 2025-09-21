// Firebase Authentication functionality
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, setLogLevel, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('debug');

const firebaseConfig = {
    apiKey: "AIzaSyDNztzQF29nvHbys9yRPv5bICPGVbg32n8",
    authDomain: "exco-60e92.firebaseapp.com",
    projectId: "exco-60e92",
    storageBucket: "exco-60e92.firebasestorage.app",
    messagingSenderId: "875802729058",
    appId: "1:875802729058:web:8f1f18f775032f0f270f3b",
    measurementId: "G-3W0477KK1X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'exo-daily-reports';
const adminUsername = "admin"; // Admin username

class AuthManager {
    constructor() {
        this.messageBox = document.getElementById('messageBox');
        this.messageText = document.getElementById('messageText');
        this.closeMessageBtn = document.getElementById('closeMessageBtn');
        this.authEmailInput = document.getElementById('authEmail');
        this.authPasswordInput = document.getElementById('authPassword');
        this.signInBtn = document.getElementById('signInBtn');
        this.signUpBtn = document.getElementById('signUpBtn');
        
        this.init();
    }
    
    init() {
        // Event listeners
        if (this.signInBtn) {
            this.signInBtn.addEventListener('click', () => this.signIn());
        }
        if (this.signUpBtn) {
            this.signUpBtn.addEventListener('click', () => this.signUp());
        }
        if (this.closeMessageBtn) {
            this.closeMessageBtn.addEventListener('click', () => this.closeMessage());
        }
        
        // Update label text to username
        const emailLabel = document.querySelector('label[for="authEmail"]');
        if (emailLabel) {
            emailLabel.textContent = 'اسم المستخدم';
        }
        
        // Update placeholder text
        if (this.authEmailInput) {
            this.authEmailInput.placeholder = 'أدخل اسم المستخدم';
            this.authEmailInput.type = 'text';
        }
        
        // Check if user is already logged in
        this.checkAuthStatus();
    }
    
    showMessage(message) {
        this.messageText.textContent = message;
        this.messageBox.classList.remove('hidden');
        this.messageBox.classList.add('flex');
    }
    
    closeMessage() {
        this.messageBox.classList.add('hidden');
        this.messageBox.classList.remove('flex');
    }
    
    // Convert username to email format for Firebase
    usernameToEmail(username) {
        return `${username}@exo.local`;
    }
    
    // Convert email back to username
    emailToUsername(email) {
        return email.replace('@exo.local', '');
    }
    
    async findUserByUsername(username) {
        try {
            const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
            const q = query(usersRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error finding user:", error);
            return null;
        }
    }
    
    async signIn() {
        const username = this.authEmailInput.value.trim();
        const password = this.authPasswordInput.value.trim();
        
        if (!username || !password) {
            this.showMessage('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        if (username.length < 3) {
            this.showMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
            return;
        }
        
        this.showMessage('جاري تسجيل الدخول...');
        
        try {
            // Convert username to email format for Firebase
            const email = this.usernameToEmail(username);
            
            await signInWithEmailAndPassword(auth, email, password);
            this.showMessage('تم تسجيل الدخول بنجاح!');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error("Authentication Error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                this.showMessage('فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة');
            } else if (error.code === 'auth/api-key-not-valid') {
                this.showMessage('فشل المصادقة: مفتاح API غير صالح. يرجى التحقق من إعدادات المشروع');
            } else if (error.code === 'auth/too-many-requests') {
                this.showMessage('تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى لاحقاً');
            } else {
                this.showMessage(`فشل تسجيل الدخول: ${error.message}`);
            }
        }
    }
    
    async signUp() {
        const username = this.authEmailInput.value.trim();
        const password = this.authPasswordInput.value.trim();
        
        if (!username || !password) {
            this.showMessage('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        if (username.length < 3) {
            this.showMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        // Check if username contains valid characters only
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            this.showMessage('اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط');
            return;
        }
        
        this.showMessage('جاري إنشاء الحساب...');
        
        try {
            // Check if username already exists
            const existingUser = await this.findUserByUsername(username);
            if (existingUser) {
                this.showMessage('اسم المستخدم مستخدم بالفعل. اختر اسماً آخر');
                return;
            }
            
            // Convert username to email format for Firebase
            const email = this.usernameToEmail(username);
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            
            // Determine user role
            const userRole = username.toLowerCase() === adminUsername.toLowerCase() ? 'admin' : 'user';
            
            // Store user data with username
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, newUser.uid);
            await setDoc(userDocRef, { 
                username: username,
                role: userRole, 
                email: email,
                created: new Date() 
            });
            
            this.showMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
            
            setTimeout(() => {
                this.closeMessage();
                this.authEmailInput.focus();
            }, 2000);
            
        } catch (error) {
            console.error("Authentication Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                this.showMessage('اسم المستخدم مستخدم بالفعل. اختر اسماً آخر أو قم بتسجيل الدخول');
            } else if (error.code === 'auth/api-key-not-valid') {
                this.showMessage('فشل المصادقة: مفتاح API غير صالح. يرجى التحقق من إعدادات المشروع');
            } else if (error.code === 'auth/weak-password') {
                this.showMessage('كلمة المرور ضعيفة. استخدم كلمة مرور أقوى');
            } else {
                this.showMessage(`فشل إنشاء الحساب: ${error.message}`);
            }
        }
    }
    
    checkAuthStatus() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        // Store user session data
                        const session = {
                            uid: user.uid,
                            username: userData.username || this.emailToUsername(user.email),
                            role: userData.role || 'user',
                            loginTime: new Date().toISOString()
                        };
                        localStorage.setItem('exo_session', JSON.stringify(session));
                        
                        // Redirect to dashboard if already logged in and not on login page
                        if (!window.location.href.includes('index.html') && !window.location.href.endsWith('/')) {
                            return;
                        }
                        window.location.href = 'dashboard.html';
                    }
                } catch (error) {
                    console.error("Error checking auth status:", error);
                }
            }
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for use in other modules
export { auth, db, appId, adminUsername };
