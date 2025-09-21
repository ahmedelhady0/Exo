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

        this.initListeners();
        this.loadInitialData();
        this.checkAuthStatus();
        this.setupTabSwitching();
    }

    // Initialize all event listeners
    initListeners() {
        if (this.reportForm) {
            this.reportForm.addEventListener('submit', this.handleReportSubmit.bind(this));
        }
        if (this.signOutBtn) {
            this.signOutBtn.addEventListener('click', this.handleSignOut.bind(this));
        }
        if (this.closeMessageBtn) {
            this.closeMessageBtn.addEventListener('click', () => this.hideMessage());
        }

        // Dynamic form listeners
        if (this.itemTypeSelect) {
            this.itemTypeSelect.addEventListener('change', this.handleItemTypeChange.bind(this));
        }
        if (this.materialNameSelect) {
            this.materialNameSelect.addEventListener('change', this.handleMaterialNameChange.bind(this));
        }
        if (this.workerNameSelect) {
            this.workerNameSelect.addEventListener('change', this.handleWorkerNameChange.bind(this));
        }
        if (this.contractorNameSelect) {
            this.contractorNameSelect.addEventListener('change', this.handleContractorNameChange.bind(this));
        }
    }

    // New method to handle tab switching
    setupTabSwitching() {
        const navLinks = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = e.target.getAttribute('data-tab');

                // Hide all tab contents
                tabContents.forEach(tab => {
                    tab.classList.add('hidden');
                });

                // Show the selected tab content
                const selectedTab = document.getElementById(targetTab + 'Tab');
                if (selectedTab) {
                    selectedTab.classList.remove('hidden');
                }
            });
        });
    }

    async handleSignOut() {
        try {
            await signOut(auth);
            this.showMessage("تم تسجيل الخروج بنجاح.");
            // Redirect to login page after successful sign-out
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error signing out:", error);
            this.showMessage("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
        }
    }
    
    // Auth status checker
    checkAuthStatus() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                this.userId = user.uid;
                
                // Fetch the username from Firestore
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${user.uid}`);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const username = userData.username || 'المستخدم'; // Use 'المستخدم' as a fallback
                    this.userWelcome.textContent = `مرحباً، ${username}`;
                } else {
                    this.userWelcome.textContent = `مرحباً، ${this.userId.substring(0, 8)}...`;
                }

                console.log("User is authenticated:", this.userId);

                // Fetch data after successful authentication
                this.fetchMaterials();
                this.fetchWorkers();
                this.fetchContractors();

            } else {
                console.log("No user is authenticated. Redirecting to login page.");
            }
        });
    }

    // Display system messages
    showMessage(message) {
        this.messageText.textContent = message;
        this.messageBox.classList.remove('hidden');
        this.messageBox.classList.add('flex');
    }

    hideMessage() {
        this.messageBox.classList.add('hidden');
        this.messageBox.classList.remove('flex');
    }

    // Loads static initial data
    loadInitialData() {
        const projects = [
            { name: "مشروع 1", phases: ["الأسطح", "الخزانات"] },
            { name: "مشروع 2", phases: ["الحمامات", "الواجهات"] },
            { name: "مشروع 3", phases: ["الشبكات", "الدهانات"] }
        ];

        const projectNameSelect = document.getElementById('projectName');
        if (projectNameSelect) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.name;
                option.textContent = project.name;
                projectNameSelect.appendChild(option);
            });
            projectNameSelect.addEventListener('change', () => {
                const projectPhaseSelect = document.getElementById('projectPhase');
                projectPhaseSelect.innerHTML = '<option value="" disabled selected>اختر المرحلة</option>';
                const selectedProject = projects.find(p => p.name === projectNameSelect.value);
                if (selectedProject) {
                    selectedProject.phases.forEach(phase => {
                        const option = document.createElement('option');
                        option.value = phase;
                        option.textContent = phase;
                        projectPhaseSelect.appendChild(option);
                    });
                }
            });
        }
    }

    // Dynamic form logic
    handleItemTypeChange() {
        const itemType = this.itemTypeSelect.value;
        this.materialsSection.classList.add('hidden');
        this.workersSection.classList.add('hidden');
        this.contractorsSection.classList.add('hidden');
        if (itemType === 'مواد') {
            this.materialsSection.classList.remove('hidden');
        } else if (itemType === 'عمالة') {
            this.workersSection.classList.remove('hidden');
        } else if (itemType === 'مقاول') {
            this.contractorsSection.classList.remove('hidden');
        }
    }

    handleMaterialNameChange() {
        const selectedMaterial = this.materials.find(m => m.name === this.materialNameSelect.value);
        this.materialUnitInput.value = selectedMaterial ? selectedMaterial.unit : '';
    }

    handleWorkerNameChange() {
        const selectedWorker = this.workers.find(w => w.name === this.workerNameSelect.value);
        this.workerUnitInput.value = selectedWorker ? selectedWorker.unit : '';
    }

    handleContractorNameChange() {
        const selectedContractor = this.contractors.find(c => c.name === this.contractorNameSelect.value);
        this.contractorUnitInput.value = selectedContractor ? selectedContractor.unit : '';
    }

    // Firestore data fetching for select fields
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
        });
    }

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
        });
    }

    fetchContractors() {
        const contractorsCollectionRef = collection(db, `artifacts/${appId}/public/data/contractors`);
        onSnapshot(contractorsCollectionRef, (snapshot) => {
            this.contractors = [];
            if (this.contractorNameSelect) {
                this.contractorNameSelect.innerHTML = '<option value="" disabled selected>اختر المقاول</option>';
            }
            snapshot.forEach(doc => {
                const data = doc.data();
                this.contractors.push({ id: doc.id, ...data });
                if (this.contractorNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.contractorNameSelect.appendChild(option);
                }
            });
        });
    }

    // Form submission
    async handleReportSubmit(event) {
        event.preventDefault();
        const formData = new FormData(this.reportForm);
        const data = Object.fromEntries(formData.entries());

        if (!this.userId) {
            this.showMessage("خطأ: المستخدم غير مصرح به. يرجى المحاولة مرة أخرى.");
            return;
        }

        try {
            const reportsCollection = collection(db, `artifacts/${appId}/users/${this.userId}/reports`);
            await addDoc(reportsCollection, {
                ...data,
                timestamp: new Date()
            });
            this.showMessage("تم إرسال التقرير بنجاح!");
            this.reportForm.reset();
            this.materialsSection.classList.add('hidden');
            this.workersSection.classList.add('hidden');
            this.contractorsSection.classList.add('hidden');
        } catch (error) {
            console.error("Error adding document: ", error);
            this.showMessage("حدث خطأ أثناء إرسال التقرير. يرجى المحاولة مرة أخرى.");
        }
    }

    // Admin panel functionality
    async checkAdminStatus() {
        if (!this.currentUser) return;

        const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${this.currentUser.uid}`);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                this.userRole = 'admin';
                this.adminPanelBtn.classList.remove('hidden');
            } else {
                this.userRole = 'user';
                this.adminPanelBtn.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            this.userRole = 'user';
            this.adminPanelBtn.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
