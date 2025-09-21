// Dashboard functionality with Firebase
import { auth, db, appId, adminUsername } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, onSnapshot, addDoc, doc, getDoc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.userRole = 'user';
        this.userId = null;
        this.materials = [];
        this.workers = [];
        this.contractors = [];
        
        // Element references
        this.userWelcome = document.getElementById('userWelcome');
        this.signOutBtn = document.getElementById('signOutBtn');
        this.adminPanelBtn = document.getElementById('adminPanelBtn');
        this.reportForm = document.getElementById('reportForm');
        this.messageBox = document.getElementById('messageBox');
        this.messageText = document.getElementById('messageText');
        this.closeMessageBtn = document.getElementById('closeMessageBtn');
        
        // Form elements
        this.itemTypeSelect = document.getElementById('itemType');
        this.materialsSection = document.getElementById('materialsSection');
        this.workersSection = document.getElementById('workersSection');
        this.contractorsSection = document.getElementById('contractorsSection');
        this.materialNameSelect = document.getElementById('materialName');
        this.materialUnitInput = document.getElementById('materialUnit');
        this.workerNameSelect = document.getElementById('workerName');
        this.workerUnitInput = document.getElementById('workerUnit');
        this.contractorNameSelect = document.getElementById('contractorName');
        this.contractorUnitInput = document.getElementById('contractorUnit');
        
        // Navigation
        this.navLinks = document.querySelectorAll('.nav-link');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.init();
    }
    
    init() {
        // Check authentication
        this.checkAuth();
        
        // Event listeners
        this.signOutBtn.addEventListener('click', () => this.signOut());
        this.closeMessageBtn.addEventListener('click', () => this.closeMessage());
        
        // Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Form events
        if (this.itemTypeSelect) {
            this.itemTypeSelect.addEventListener('change', (e) => this.handleItemTypeChange(e));
        }
        
        if (this.reportForm) {
            this.reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
        }
        
        // Set today's date
        const reportDateInput = document.getElementById('reportDate');
        if (reportDateInput) {
            reportDateInput.value = new Date().toISOString().split('T')[0];
        }
    }
    
    checkAuth() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                this.userId = user.uid;
                await this.loadUserData();
                this.setupDashboard();
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'index.html';
            }
        });
    }
    
    async loadUserData() {
        try {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, this.userId);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                this.userRole = userData.role || 'user';
                const username = userData.username || this.emailToUsername(this.currentUser.email);
                this.userWelcome.textContent = `مرحباً ${username}`;
            } else {
                // Create user document if not exists
                const username = this.emailToUsername(this.currentUser.email);
                const initialRole = username.toLowerCase() === adminUsername.toLowerCase() ? 'admin' : 'user';
                await setDoc(userDocRef, { 
                    username: username,
                    role: initialRole, 
                    email: this.currentUser.email, 
                    created: new Date() 
                });
                this.userRole = initialRole;
                this.userWelcome.textContent = `مرحباً ${username}`;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            this.showMessage('خطأ في تحميل بيانات المستخدم');
        }
    }
    
    setupDashboard() {
        // Show/hide admin features
        if (this.userRole === 'admin') {
            this.adminPanelBtn.classList.remove('hidden');
        } else {
            this.adminPanelBtn.classList.add('hidden');
        }
        
        // Load data
        this.fetchProjects();
        this.fetchMaterials();
        this.fetchWorkers();
        this.fetchContractors();
    }
    
    emailToUsername(email) {
        return email.replace('@exo.local', '');
    }
    
    switchTab(tabName) {
        // Update active nav link
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === tabName) {
                link.classList.add('active');
            }
        });
        
        // Show appropriate tab content
        this.tabContents.forEach(content => {
            content.style.display = 'none';
        });
        
        const activeTab = document.getElementById(`${tabName}Tab`);
        if (activeTab) {
            activeTab.style.display = 'block';
        }
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
    
    async signOut() {
        try {
            await signOut(auth);
            localStorage.removeItem('exo_session');
            this.showMessage('تم تسجيل الخروج بنجاح');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            console.error('Sign out error:', error);
            this.showMessage('خطأ في تسجيل الخروج');
        }
    }
    
    // Projects management
    fetchProjects() {
        const projectsCollectionRef = collection(db, `artifacts/${appId}/public/data/projects`);
        onSnapshot(projectsCollectionRef, (snapshot) => {
            const projects = [];
            snapshot.forEach(doc => {
                projects.push(doc.data());
            });
            projects.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            
            const projectSelect = document.getElementById('projectName');
            if (projectSelect) {
                projectSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.name;
                    option.textContent = project.name;
                    projectSelect.appendChild(option);
                });
            }
        });
    }
    
    // Materials management
    fetchMaterials() {
        const materialsCollectionRef = collection(db, `artifacts/${appId}/public/data/materials`);
        onSnapshot(materialsCollectionRef, (snapshot) => {
            this.materials = [];
            if (this.materialNameSelect) {
                this.materialNameSelect.innerHTML = '<option value="" disabled selected>اختر المادة</option>';
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.materials.push({ id: doc.id, ...data });
                
                if (this.materialNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.materialNameSelect.appendChild(option);
                }
            });
            
            // Update material unit when selection changes
            if (this.materialNameSelect && this.materialUnitInput) {
                this.materialNameSelect.addEventListener('change', (e) => {
                    const selectedMaterial = this.materials.find(m => m.name === e.target.value);
                    this.materialUnitInput.value = selectedMaterial ? selectedMaterial.unit : '';
                });
            }
        });
    }
    
    // Workers management
    fetchWorkers() {
        const workersCollectionRef = collection(db, `artifacts/${appId}/public/data/workers`);
        onSnapshot(workersCollectionRef, (snapshot) => {
            this.workers = [];
            if (this.workerNameSelect) {
                this.workerNameSelect.innerHTML = '<option value="" disabled selected>اختر العامل</option>';
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.workers.push({ id: doc.id, ...data });
                
                if (this.workerNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.workerNameSelect.appendChild(option);
                }
            });
            
            // Update worker unit when selection changes
            if (this.workerNameSelect && this.workerUnitInput) {
                this.workerNameSelect.addEventListener('change', (e) => {
                    const selectedWorker = this.workers.find(w => w.name === e.target.value);
                    this.workerUnitInput.value = selectedWorker ? selectedWorker.unit : '';
                });
            }
        });
    }
    
    // Contractors management
    // fetchContractors() {
    //     const contractorsCollectionRef = collection(db, `artifacts/${appId}/public/data/contractors`);
    //     onSnapshot(contractorsCollectionRef, (snapshot) => {
    //         this.contractors = [];
    //         if (this.contractorNameSelect) {
    //             this.contractorNameSelect.innerHTML = '<option value="" disabled selected>اختر المقاول</option>';
    //         }
            
    //         snapshot.forEach(doc => {
    //             const data = doc.data();
    //             this.contractors.push({ id: doc.id, ...data });
                
    //             if (this.contractorNameSelect) {
    //                 const option = document.createElement('option');
    //                 option.value = data.name;
    //                 option.textContent = `${data.name} (${data.unit})`;
} 