// Dashboard functionality with Firebase
import { auth, db, appId, adminUsername } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, onSnapshot, addDoc, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.userRole = 'user';
        this.userId = null;
        this.materials = [];
        this.workers = [];
        this.contractors = [];
        this.projects = [];

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
        this.reportsHistory = document.getElementById('reportsHistory');
        
        // Admin elements
        this.adminForm = document.getElementById('adminForm');
        this.adminItemTypeSelect = document.getElementById('adminItemType');
        this.adminItemNameInput = document.getElementById('adminItemName');
        this.adminItemUnitInput = document.getElementById('adminItemUnit');
        this.addProjectForm = document.getElementById('addProjectForm');
        this.addPhaseForm = document.getElementById('addPhaseForm');
        this.phaseProjectSelect = document.getElementById('phaseProjectSelect');
        this.projectsList = document.getElementById('projectsList');
        this.materialsList = document.getElementById('materialsList');
        this.workersContractorsList = document.getElementById('workersContractorsList');

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

        // Admin Panel listeners
        if (this.adminPanelBtn) {
            this.adminPanelBtn.addEventListener('click', this.handleAdminPanelClick.bind(this));
        }
        if (this.adminForm) {
            this.adminForm.addEventListener('submit', this.handleAdminSubmit.bind(this));
        }
        if (this.addProjectForm) {
            this.addProjectForm.addEventListener('submit', this.handleAddProject.bind(this));
        }
        if (this.addPhaseForm) {
            this.addPhaseForm.addEventListener('submit', this.handleAddPhase.bind(this));
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

                // Remove active class from all nav links
                navLinks.forEach(navLink => {
                    navLink.classList.remove('active');
                });

                // Add active class to clicked nav link
                e.target.classList.add('active');

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
            localStorage.removeItem('exo_session');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
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
                
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${user.uid}`);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const username = userData.username || 'المستخدم';
                    this.userWelcome.textContent = `مرحباً، ${username}`;
                } else {
                    this.userWelcome.textContent = `مرحباً، ${this.userId.substring(0, 8)}...`;
                }

                this.fetchProjects();
                this.fetchMaterials();
                this.fetchWorkers();
                this.fetchContractors();
                this.fetchReports();
                this.checkAdminStatus();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // Fetch reports
    fetchReports() {
        if (!this.userId) return;
        const reportsCollectionRef = collection(db, `artifacts/${appId}/users/${this.userId}/reports`);
        onSnapshot(reportsCollectionRef, (snapshot) => {
            this.reportsHistory.innerHTML = '';
            if (snapshot.empty) {
                this.reportsHistory.innerHTML = `<p class="text-center text-gray-500">لا توجد تقارير سابقة.</p>`;
                return;
            }
            snapshot.forEach(doc => {
                const report = doc.data();
                const reportElement = document.createElement('div');
                reportElement.classList.add('report-item', 'bg-gray-100', 'p-4', 'rounded-lg', 'shadow-sm', 'mb-4');
                
                const date = report.timestamp.toDate ? report.timestamp.toDate() : new Date(report.timestamp);
                const formattedDate = date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const formattedTime = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                
                let reportDetails = `
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-gray-800">تقرير بتاريخ:</span>
                        <span class="text-sm text-gray-600">${formattedDate} - ${formattedTime}</span>
                    </div>
                    <p class="mb-1"><span class="font-semibold text-gray-700">المشروع:</span> ${report.projectName}</p>
                    <p class="mb-1"><span class="font-semibold text-gray-700">المرحلة:</span> ${report.projectPhase}</p>
                    <p class="mb-1"><span class="font-semibold text-gray-700">نوع البند:</span> ${report.itemType}</p>
                `;

                if (report.itemType === 'مواد') {
                    reportDetails += `
                        <p class="mb-1"><span class="font-semibold text-gray-700">اسم المادة:</span> ${report.materialName}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الكمية:</span> ${report.quantity}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الوحدة:</span> ${report.materialUnit}</p>
                    `;
                } else if (report.itemType === 'عمالة') {
                    reportDetails += `
                        <p class="mb-1"><span class="font-semibold text-gray-700">اسم العامل:</span> ${report.workerName}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الكمية:</span> ${report.quantity}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الوحدة:</span> ${report.workerUnit}</p>
                    `;
                } else if (report.itemType === 'مقاول') {
                    reportDetails += `
                        <p class="mb-1"><span class="font-semibold text-gray-700">اسم المقاول:</span> ${report.contractorName}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الكمية:</span> ${report.quantity}</p>
                        <p class="mb-1"><span class="font-semibold text-gray-700">الوحدة:</span> ${report.contractorUnit}</p>
                    `;
                }
                
                reportDetails += `
                    <p class="mb-1"><span class="font-semibold text-gray-700">التكلفة الفردية:</span> ${report.costPerUnit} ريال</p>
                    <p class="mb-1"><span class="font-semibold text-gray-700">المجموع:</span> ${(report.costPerUnit * report.quantity).toFixed(2)} ريال</p>
                    <p class="mt-2 text-sm text-gray-500">الوصف: ${report.itemDescription || 'لا يوجد'}</p>
                `;
                reportElement.innerHTML = reportDetails;
                this.reportsHistory.appendChild(reportElement);
            });
        });
    }

    showMessage(message) {
        this.messageText.textContent = message;
        this.messageBox.classList.remove('hidden');
        this.messageBox.classList.add('flex');
    }

    hideMessage() {
        this.messageBox.classList.add('hidden');
        this.messageBox.classList.remove('flex');
    }

    loadInitialData() {
        const reportDateInput = document.getElementById('reportDate');
        if (reportDateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            reportDateInput.value = formattedDate;
        }
    }

    // Fetch projects
    fetchProjects() {
        const projectsCollectionRef = collection(db, `artifacts/${appId}/public/data/projects`);
        onSnapshot(projectsCollectionRef, (snapshot) => {
            this.projects = [];
            const projectNameSelect = document.getElementById('projectName');
            if (projectNameSelect) {
                projectNameSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
            }
            if (this.phaseProjectSelect) {
                this.phaseProjectSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
            }

            if (this.projectsList) {
                this.projectsList.innerHTML = '';
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                this.projects.push({ id: doc.id, ...data });
                
                if (projectNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = data.name;
                    projectNameSelect.appendChild(option);
                }

                if (this.phaseProjectSelect) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = data.name;
                    this.phaseProjectSelect.appendChild(option);
                }

                if (this.projectsList && this.userRole === 'admin') {
                    const projectItem = document.createElement('div');
                    projectItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
                    projectItem.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="font-medium">${data.name}</span>
                            <button onclick="dashboard.deleteProject('${doc.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${data.phases.join(', ')}</div>
                    `;
                    this.projectsList.appendChild(projectItem);
                }
            });

            if (projectNameSelect) {
                projectNameSelect.addEventListener('change', () => {
                    const projectPhaseSelect = document.getElementById('projectPhase');
                    projectPhaseSelect.innerHTML = '<option value="" disabled selected>اختر المرحلة</option>';
                    const selectedProject = this.projects.find(p => p.name === projectNameSelect.value);
                    if (selectedProject && selectedProject.phases) {
                        selectedProject.phases.forEach(phase => {
                            const option = document.createElement('option');
                            option.value = phase;
                            option.textContent = phase;
                            projectPhaseSelect.appendChild(option);
                        });
                    }
                });
            }

            if (this.projectsList && this.projects.length === 0) {
                this.projectsList.innerHTML = '<p class="text-sm text-gray-500">لا توجد مشاريع</p>';
            }
        });
    }

    // Dynamic form logic
    handleItemTypeChange() { ... }
    handleMaterialNameChange() { ... }
    handleWorkerNameChange() { ... }
    handleContractorNameChange() { ... }

    // Fetch materials, workers, contractors
    fetchMaterials() { ... }
    fetchWorkers() { ... }
    fetchContractors() { ... }
    updateWorkersContractorsList() { ... }

    // Report submit
    async handleReportSubmit(event) { ... }

    // Admin panel
    async checkAdminStatus() { ... }
    handleAdminPanelClick() { ... }
    async handleAddProject(event) { ... }
    async handleAdminSubmit(event) { ... }

    // Delete functions
    async deleteProject(projectId) { ... }
    async deleteMaterial(materialId) { ... }
    async deleteWorker(workerId) { ... }
    async deleteContractor(contractorId) { ... }

    // New: Add Phase
    async handleAddPhase(event) {
        event.preventDefault();
        const projectId = this.phaseProjectSelect.value;
        const newPhase = document.getElementById('newPhaseName').value.trim();

        if (!projectId || !newPhase) {
            this.showMessage("يرجى اختيار المشروع وإدخال اسم المرحلة.");
            return;
        }

        try {
            const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
            const projectSnap = await getDoc(projectRef);

            if (projectSnap.exists()) {
                const projectData = projectSnap.data();
                const phases = projectData.phases || [];

                if (phases.includes(newPhase)) {
                    this.showMessage("هذه المرحلة موجودة بالفعل.");
                    return;
                }

                phases.push(newPhase);
                await updateDoc(projectRef, { phases });

                this.showMessage(`تمت إضافة المرحلة "${newPhase}" بنجاح!`);
                this.addPhaseForm.reset();
            } else {
                this.showMessage("المشروع غير موجود.");
            }
        } catch (error) {
            console.error("Error adding phase:", error);
            this.showMessage("حدث خطأ أثناء إضافة المرحلة. يرجى المحاولة مرة أخرى.");
        }
    }
}

// Global instance
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});
