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
    }
        if (this.addPhaseForm) {
        this.addPhaseForm.addEventListener('submit', this.handleAddPhase.bind(this));
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
            // Clear session data
            localStorage.removeItem('exo_session');
            // Redirect to login page after successful sign-out
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
                this.fetchProjects();
                this.fetchMaterials();
                this.fetchWorkers();
                this.fetchContractors();
                this.fetchReports();
                this.checkAdminStatus();

            } else {
                console.log("No user is authenticated. Redirecting to login page.");
                window.location.href = 'index.html';
            }
        });
    }

    // Fetch reports from Firestore and display them
    fetchReports() {
        if (!this.userId) return;

        const reportsCollectionRef = collection(db, `artifacts/${appId}/users/${this.userId}/reports`);
        onSnapshot(reportsCollectionRef, (snapshot) => {
            this.reportsHistory.innerHTML = ''; // Clear previous reports
            if (snapshot.empty) {
                this.reportsHistory.innerHTML = `<p class="text-center text-gray-500">لا توجد تقارير سابقة.</p>`;
                return;
            }

            snapshot.forEach(doc => {
                const report = doc.data();
                const reportElement = document.createElement('div');
                reportElement.classList.add('report-item', 'bg-gray-100', 'p-4', 'rounded-lg', 'shadow-sm', 'mb-4');
                
                // Format timestamp
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
        // Set default date to today
        const reportDateInput = document.getElementById('reportDate');
        if (reportDateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            reportDateInput.value = formattedDate;
        }
    }

    // Fetch projects from Firestore
    fetchProjects() {
        const projectsCollectionRef = collection(db, `artifacts/${appId}/public/data/projects`);
        onSnapshot(projectsCollectionRef, (snapshot) => {
            this.projects = [];
            const projectNameSelect = document.getElementById('projectName');
           if (this.phaseProjectSelect) {
    this.phaseProjectSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
}
...
if (this.phaseProjectSelect) {
    const option = document.createElement('option');
    option.value = doc.id; // نخزن الـ id عشان نقدر نعدل في المشروع
    option.textContent = data.name;
    this.phaseProjectSelect.appendChild(option);
}

            // Update admin projects list
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

                // Add to admin list
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

            // Set up project phase handler
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

            // Update admin materials list
            if (this.materialsList) {
                this.materialsList.innerHTML = '';
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

                // Add to admin list
                if (this.materialsList && this.userRole === 'admin') {
                    const materialItem = document.createElement('div');
                    materialItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
                    materialItem.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="font-medium">${data.name}</span>
                            <button onclick="dashboard.deleteMaterial('${doc.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                        </div>
                        <div class="text-xs text-gray-500">${data.unit}</div>
                    `;
                    this.materialsList.appendChild(materialItem);
                }
            });

            if (this.materialsList && this.materials.length === 0) {
                this.materialsList.innerHTML = '<p class="text-sm text-gray-500">لا توجد مواد</p>';
            }
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
            this.updateWorkersContractorsList();
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
            this.updateWorkersContractorsList();
        });
    }

    updateWorkersContractorsList() {
        if (!this.workersContractorsList || this.userRole !== 'admin') return;

        this.workersContractorsList.innerHTML = '';
        
        // Add workers
        this.workers.forEach(worker => {
            const workerItem = document.createElement('div');
            workerItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
            workerItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium">${worker.name}</span>
                    <button onclick="dashboard.deleteWorker('${worker.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                </div>
                <div class="text-xs text-gray-500">عامل - ${worker.unit}</div>
            `;
            this.workersContractorsList.appendChild(workerItem);
        });

        // Add contractors
        this.contractors.forEach(contractor => {
            const contractorItem = document.createElement('div');
            contractorItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
            contractorItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium">${contractor.name}</span>
                    <button onclick="dashboard.deleteContractor('${contractor.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                </div>
                <div class="text-xs text-gray-500">مقاول - ${contractor.unit}</div>
            `;
            this.workersContractorsList.appendChild(contractorItem);
        });

        if (this.workers.length === 0 && this.contractors.length === 0) {
            this.workersContractorsList.innerHTML = '<p class="text-sm text-gray-500">لا توجد عمالة أو مقاولين</p>';
        }
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

            // Reset date to today
            const reportDateInput = document.getElementById('reportDate');
            if (reportDateInput) {
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0];
                reportDateInput.value = formattedDate;
            }
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

    handleAdminPanelClick() {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Hide all user tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show the admin panel tab
        const adminTab = document.getElementById('adminPanelTab');
        if (adminTab) {
            adminTab.classList.remove('hidden');
        }
    }

    async handleAddProject(event) {
        event.preventDefault();
        const projectName = document.getElementById('newProjectName').value.trim();
        const projectPhasesStr = document.getElementById('newProjectPhases').value.trim();

        if (!projectName || !projectPhasesStr) {
            this.showMessage("يرجى ملء جميع الحقول.");
            return;
        }

        const phases = projectPhasesStr.split(',').map(phase => phase.trim()).filter(phase => phase);

        if (phases.length === 0) {
            this.showMessage("يرجى إدخال مرحلة واحدة على الأقل.");
            return;
        }

        try {
            const projectsCollection = collection(db, `artifacts/${appId}/public/data/projects`);
            await addDoc(projectsCollection, {
                name: projectName,
                phases: phases,
                createdAt: new Date()
            });
            this.showMessage(`تمت إضافة المشروع "${projectName}" بنجاح!`);
            this.addProjectForm.reset();
        } catch (error) {
            console.error("Error adding project:", error);
            this.showMessage("حدث خطأ أثناء إضافة المشروع. يرجى المحاولة مرة أخرى.");
        }
    }

    async handleAdminSubmit(event) {
        event.preventDefault();
        const itemType = this.adminItemTypeSelect.value;
        const itemName = this.adminItemNameInput.value.trim();
        const itemUnit = this.adminItemUnitInput.value.trim();

        if (!itemType || !itemName || !itemUnit) {
            this.showMessage("يرجى ملء جميع الحقول.");
            return;
        }

        try {
            let collectionName;
            switch (itemType) {
                case 'materials':
                    collectionName = 'materials';
                    break;
                case 'workers':
                    collectionName = 'workers';
                    break;
                case 'contractors':
                    collectionName = 'contractors';
                    break;
                default:
                    this.showMessage("نوع البند غير صالح.");
                    return;
            }

            const collectionRef = collection(db, `artifacts/${appId}/public/data/${collectionName}`);
            await addDoc(collectionRef, {
                name: itemName,
                unit: itemUnit,
                createdAt: new Date()
            });
            this.showMessage(`تمت إضافة ${itemName} بنجاح إلى قاعدة البيانات!`);
            this.adminForm.reset();
        } catch (error) {
            console.error("Error adding admin item:", error);
            this.showMessage("حدث خطأ أثناء إضافة البند. يرجى المحاولة مرة أخرى.");
        }
    }

    // Delete functions for admin
    async deleteProject(projectId) {
        if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/projects`, projectId));
                this.showMessage("تم حذف المشروع بنجاح!");
            } catch (error) {
                console.error("Error deleting project:", error);
                this.showMessage("حدث خطأ أثناء حذف المشروع.");
            }
        }
    }

    async deleteMaterial(materialId) {
        if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/materials`, materialId));
                this.showMessage("تم حذف المادة بنجاح!");
            } catch (error) {
                console.error("Error deleting material:", error);
                this.showMessage("حدث خطأ أثناء حذف المادة.");
            }
        }
    }

    async deleteWorker(workerId) {
        if (confirm('هل أنت متأكد من حذف هذا العامل؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/workers`, workerId));
                this.showMessage("تم حذف العامل بنجاح!");
            } catch (error) {
                console.error("Error deleting worker:", error);
                this.showMessage("حدث خطأ أثناء حذف العامل.");
            }
        }
    }

    async deleteContractor(contractorId) {
        if (confirm('هل أنت متأكد من حذف هذا المقاول؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/contractors`, contractorId));
                this.showMessage("تم حذف المقاول بنجاح!");
            } catch (error) {
                console.error("Error deleting contractor:", error);
                this.showMessage("حدث خطأ أثناء حذف المقاول.");
            }
        }
    }
    async handleAddPhase(event) {
        event.preventDefault();
        const projectId = document.getElementById('existingProject').value;
        const newPhase = document.getElementById('newPhase').value.trim();

        if (!projectId || !newPhase) {
            this.showMessage("يرجى اختيار المشروع وإدخال اسم المرحلة.");
            return;
        }

        try {
            // Get current project data
            const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
            const projectSnap = await getDoc(projectRef);
            
            if (!projectSnap.exists()) {
                this.showMessage("المشروع المحدد غير موجود.");
                return;
            }

            const projectData = projectSnap.data();
            const currentPhases = projectData.phases || [];

            // Check if phase already exists
            if (currentPhases.includes(newPhase)) {
                this.showMessage("هذه المرحلة موجودة بالفعل في المشروع.");
                return;
            }

            // Add new phase
            const updatedPhases = [...currentPhases, newPhase];
            
            await updateDoc(projectRef, {
                phases: updatedPhases,
                updatedAt: new Date()
            });

            this.showMessage(`تمت إضافة المرحلة "${newPhase}" بنجاح إلى المشروع!`);
            this.addPhaseForm.reset();
        } catch (error) {
            console.error("Error adding phase:", error);
            this.showMessage("حدث خطأ أثناء إضافة المرحلة. يرجى المحاولة مرة أخرى.");
        }
    }

    // Edit modal functions
    showEditModal(type, id, name, unitOrPhases) {
        this.currentEditItem = { type, id, name, unitOrPhases };
        this.editItemName.value = name;
        
        if (type === 'project') {
            this.editUnitDiv.classList.add('hidden');
            this.editPhasesDiv.classList.remove('hidden');
            this.editProjectPhases.value = unitOrPhases;
        } else {
            this.editUnitDiv.classList.remove('hidden');
            this.editPhasesDiv.classList.add('hidden');
            this.editItemUnit.value = unitOrPhases;
        }
        
        this.editModal.classList.remove('hidden');
        this.editModal.classList.add('flex');
    }

    hideEditModal() {
        this.editModal.classList.add('hidden');
        this.editModal.classList.remove('flex');
        this.currentEditItem = null;
    }

    async handleEditSubmit(event) {
        event.preventDefault();
        
        if (!this.currentEditItem) return;

        const { type, id } = this.currentEditItem;
        const newName = this.editItemName.value.trim();
        
        if (!newName) {
            this.showMessage("يرجى إدخال اسم صالح.");
            return;
        }

        try {
            let updateData = {
                name: newName,
                updatedAt: new Date()
            };

            if (type === 'project') {
                const phasesStr = this.editProjectPhases.value.trim();
                if (!phasesStr) {
                    this.showMessage("يرجى إدخال مرحلة واحدة على الأقل.");
                    return;
                }
                const phases = phasesStr.split(',').map(phase => phase.trim()).filter(phase => phase);
                updateData.phases = phases;
            } else {
                const newUnit = this.editItemUnit.value.trim();
                if (!newUnit) {
                    this.showMessage("يرجى إدخال وحدة صالحة.");
                    return;
                }
                updateData.unit = newUnit;
            }

            let collectionName;
            switch (type) {
                case 'project':
                    collectionName = 'projects';
                    break;
                case 'material':
                    collectionName = 'materials';
                    break;
                case 'worker':
                    collectionName = 'workers';
                    break;
                case 'contractor':
                    collectionName = 'contractors';
                    break;
                default:
                    this.showMessage("نوع العنصر غير صالح.");
                    return;
            }

            const itemRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, id);
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
        this.projectsList = document.getElementById('projectsList');
        this.materialsList = document.getElementById('materialsList');
        this.workersContractorsList = document.getElementById('workersContractorsList');

        // Edit modal elements
        this.editModal = document.getElementById('editModal');
        this.editForm = document.getElementById('editForm');
        this.editItemName = document.getElementById('editItemName');
        this.editItemUnit = document.getElementById('editItemUnit');
        this.editProjectPhases = document.getElementById('editProjectPhases');
        this.editUnitDiv = document.getElementById('editUnitDiv');
        this.editPhasesDiv = document.getElementById('editPhasesDiv');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');

        // Current edit context
        this.currentEditItem = null;

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
        if (this.cancelEditBtn) {
            this.cancelEditBtn.addEventListener('click', this.hideEditModal.bind(this));
        }
        if (this.editForm) {
            this.editForm.addEventListener('submit', this.handleEditSubmit.bind(this));
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
            // Clear session data
            localStorage.removeItem('exo_session');
            // Redirect to login page after successful sign-out
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
                this.fetchProjects();
                this.fetchMaterials();
                this.fetchWorkers();
                this.fetchContractors();
                this.fetchReports();
                this.checkAdminStatus();

            } else {
                console.log("No user is authenticated. Redirecting to login page.");
                window.location.href = 'index.html';
            }
        });
    }

    // Fetch reports from Firestore and display them
    fetchReports() {
        if (!this.userId) return;

        const reportsCollectionRef = collection(db, `artifacts/${appId}/users/${this.userId}/reports`);
        onSnapshot(reportsCollectionRef, (snapshot) => {
            this.reportsHistory.innerHTML = ''; // Clear previous reports
            if (snapshot.empty) {
                this.reportsHistory.innerHTML = `<p class="text-center text-gray-500">لا توجد تقارير سابقة.</p>`;
                return;
            }

            snapshot.forEach(doc => {
                const report = doc.data();
                const reportElement = document.createElement('div');
                reportElement.classList.add('report-item', 'bg-gray-100', 'p-4', 'rounded-lg', 'shadow-sm', 'mb-4');
                
                // Format timestamp
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
        // Set default date to today
        const reportDateInput = document.getElementById('reportDate');
        if (reportDateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            reportDateInput.value = formattedDate;
        }
    }

    // Fetch projects from Firestore
    fetchProjects() {
        const projectsCollectionRef = collection(db, `artifacts/${appId}/public/data/projects`);
        onSnapshot(projectsCollectionRef, (snapshot) => {
            this.projects = [];
            const projectNameSelect = document.getElementById('projectName');
            if (projectNameSelect) {
                projectNameSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
            }

            // Update admin projects list
            if (this.projectsList) {
                this.projectsList.innerHTML = '';
            }

            // Update existing projects dropdown for adding phases
            const existingProjectSelect = document.getElementById('existingProject');
            if (existingProjectSelect) {
                existingProjectSelect.innerHTML = '<option value="" disabled selected>اختر المشروع</option>';
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

                // Add to existing projects dropdown
                if (existingProjectSelect) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = data.name;
                    existingProjectSelect.appendChild(option);
                }

                // Add to admin list
                if (this.projectsList && this.userRole === 'admin') {
                    const projectItem = document.createElement('div');
                    projectItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
                    projectItem.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="font-medium">${data.name}</span>
                            <div class="flex space-x-1 space-x-reverse">
                                <button onclick="dashboard.editProject('${doc.id}', '${data.name}', '${data.phases.join(', ')}')" class="text-blue-500 text-xs hover:text-blue-700">تعديل</button>
                                <button onclick="dashboard.deleteProject('${doc.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                            </div>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${data.phases.join(', ')}</div>
                    `;
                    this.projectsList.appendChild(projectItem);
                }
            });

            // Set up project phase handler
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
            console.log("Materials snapshot received, docs count:", snapshot.size);
            this.materials = [];
            if (this.materialNameSelect) {
                this.materialNameSelect.innerHTML = '<option value="" disabled selected>اختر المادة</option>';
            }

            // Update admin materials list
            if (this.materialsList) {
                this.materialsList.innerHTML = '';
            }

            if (snapshot.empty) {
                console.log("No materials found in database");
                if (this.materialsList) {
                    this.materialsList.innerHTML = '<p class="text-sm text-gray-500">لا توجد مواد</p>';
                }
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                console.log("Processing material:", data);
                this.materials.push({ id: doc.id, ...data });
                
                if (this.materialNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.materialNameSelect.appendChild(option);
                }

                // Add to admin list
                if (this.materialsList && this.userRole === 'admin') {
                    const materialItem = document.createElement('div');
                    materialItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
                    // Escape quotes in data to prevent HTML issues
                    const escapedName = data.name.replace(/'/g, '&#39;');
                    const escapedUnit = data.unit.replace(/'/g, '&#39;');
                    materialItem.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="font-medium">${data.name}</span>
                            <div class="flex space-x-1 space-x-reverse">
                                <button onclick="dashboard.editMaterial('${doc.id}', '${escapedName}', '${escapedUnit}')" class="text-blue-500 text-xs hover:text-blue-700">تعديل</button>
                                <button onclick="dashboard.deleteMaterial('${doc.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                            </div>
                        </div>
                        <div class="text-xs text-gray-500">${data.unit}</div>
                    `;
                    this.materialsList.appendChild(materialItem);
                }
            });

            console.log("Total materials loaded:", this.materials.length);
        }, (error) => {
            console.error("Error fetching materials:", error);
            this.showMessage("خطأ في تحميل المواد من قاعدة البيانات");
        });
    }

    fetchWorkers() {
        const workersCollectionRef = collection(db, `artifacts/${appId}/public/data/workers`);
        onSnapshot(workersCollectionRef, (snapshot) => {
            console.log("Workers snapshot received, docs count:", snapshot.size);
            this.workers = [];
            if (this.workerNameSelect) {
                this.workerNameSelect.innerHTML = '<option value="" disabled selected>اختر العامل</option>';
            }
            
            if (snapshot.empty) {
                console.log("No workers found in database");
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log("Processing worker:", data);
                this.workers.push({ id: doc.id, ...data });
                if (this.workerNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.workerNameSelect.appendChild(option);
                }
            });
            
            console.log("Total workers loaded:", this.workers.length);
            this.updateWorkersContractorsList();
        }, (error) => {
            console.error("Error fetching workers:", error);
            this.showMessage("خطأ في تحميل العمالة من قاعدة البيانات");
        });
    }

    fetchContractors() {
        const contractorsCollectionRef = collection(db, `artifacts/${appId}/public/data/contractors`);
        onSnapshot(contractorsCollectionRef, (snapshot) => {
            console.log("Contractors snapshot received, docs count:", snapshot.size);
            this.contractors = [];
            if (this.contractorNameSelect) {
                this.contractorNameSelect.innerHTML = '<option value="" disabled selected>اختر المقاول</option>';
            }
            
            if (snapshot.empty) {
                console.log("No contractors found in database");
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log("Processing contractor:", data);
                this.contractors.push({ id: doc.id, ...data });
                if (this.contractorNameSelect) {
                    const option = document.createElement('option');
                    option.value = data.name;
                    option.textContent = `${data.name} (${data.unit})`;
                    this.contractorNameSelect.appendChild(option);
                }
            });
            
            console.log("Total contractors loaded:", this.contractors.length);
            this.updateWorkersContractorsList();
        }, (error) => {
            console.error("Error fetching contractors:", error);
            this.showMessage("خطأ في تحميل المقاولين من قاعدة البيانات");
        });
    }

    updateWorkersContractorsList() {
        if (!this.workersContractorsList || this.userRole !== 'admin') return;

        this.workersContractorsList.innerHTML = '';
        
        // Add workers
        this.workers.forEach(worker => {
            const workerItem = document.createElement('div');
            workerItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
            // Escape quotes in data to prevent HTML issues
            const escapedName = worker.name.replace(/'/g, '&#39;');
            const escapedUnit = worker.unit.replace(/'/g, '&#39;');
            workerItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium">${worker.name}</span>
                    <div class="flex space-x-1 space-x-reverse">
                        <button onclick="dashboard.editWorker('${worker.id}', '${escapedName}', '${escapedUnit}')" class="text-blue-500 text-xs hover:text-blue-700">تعديل</button>
                        <button onclick="dashboard.deleteWorker('${worker.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                    </div>
                </div>
                <div class="text-xs text-gray-500">عامل - ${worker.unit}</div>
            `;
            this.workersContractorsList.appendChild(workerItem);
        });

        // Add contractors
        this.contractors.forEach(contractor => {
            const contractorItem = document.createElement('div');
            contractorItem.classList.add('admin-panel-item', 'p-2', 'mb-2');
            // Escape quotes in data to prevent HTML issues
            const escapedName = contractor.name.replace(/'/g, '&#39;');
            const escapedUnit = contractor.unit.replace(/'/g, '&#39;');
            contractorItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium">${contractor.name}</span>
                    <div class="flex space-x-1 space-x-reverse">
                        <button onclick="dashboard.editContractor('${contractor.id}', '${escapedName}', '${escapedUnit}')" class="text-blue-500 text-xs hover:text-blue-700">تعديل</button>
                        <button onclick="dashboard.deleteContractor('${contractor.id}')" class="text-red-500 text-xs hover:text-red-700">حذف</button>
                    </div>
                </div>
                <div class="text-xs text-gray-500">مقاول - ${contractor.unit}</div>
            `;
            this.workersContractorsList.appendChild(contractorItem);
        });

        if (this.workers.length === 0 && this.contractors.length === 0) {
            this.workersContractorsList.innerHTML = '<p class="text-sm text-gray-500">لا توجد عمالة أو مقاولين</p>';
        }
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

            // Reset date to today
            const reportDateInput = document.getElementById('reportDate');
            if (reportDateInput) {
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0];
                reportDateInput.value = formattedDate;
            }
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

    handleAdminPanelClick() {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Hide all user tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show the admin panel tab
        const adminTab = document.getElementById('adminPanelTab');
        if (adminTab) {
            adminTab.classList.remove('hidden');
        }
    }

    async handleAddProject(event) {
        event.preventDefault();
        const projectName = document.getElementById('newProjectName').value.trim();
        const projectPhasesStr = document.getElementById('newProjectPhases').value.trim();

        if (!projectName || !projectPhasesStr) {
            this.showMessage("يرجى ملء جميع الحقول.");
            return;
        }

        const phases = projectPhasesStr.split(',').map(phase => phase.trim()).filter(phase => phase);

        if (phases.length === 0) {
            this.showMessage("يرجى إدخال مرحلة واحدة على الأقل.");
            return;
        }

        try {
            const projectsCollection = collection(db, `artifacts/${appId}/public/data/projects`);
            await addDoc(projectsCollection, {
                name: projectName,
                phases: phases,
                createdAt: new Date()
            });
            this.showMessage(`تمت إضافة المشروع "${projectName}" بنجاح!`);
            this.addProjectForm.reset();
        } catch (error) {
            console.error("Error adding project:", error);
            this.showMessage("حدث خطأ أثناء إضافة المشروع. يرجى المحاولة مرة أخرى.");
        }
    }

    async handleAdminSubmit(event) {
        event.preventDefault();
        const itemType = this.adminItemTypeSelect.value;
        const itemName = this.adminItemNameInput.value.trim();
        const itemUnit = this.adminItemUnitInput.value.trim();

        if (!itemType || !itemName || !itemUnit) {
            this.showMessage("يرجى ملء جميع الحقول.");
            return;
        }

        // Show loading message
        this.showMessage("جاري إضافة العنصر...");

        try {
            let collectionName;
            switch (itemType) {
                case 'materials':
                    collectionName = 'materials';
                    break;
                case 'workers':
                    collectionName = 'workers';
                    break;
                case 'contractors':
                    collectionName = 'contractors';
                    break;
                default:
                    this.showMessage("نوع البند غير صالح.");
                    return;
            }

            const collectionRef = collection(db, `artifacts/${appId}/public/data/${collectionName}`);
            
            // Check if item with same name already exists
            const existingItems = await getDocs(collectionRef);
            const duplicateExists = existingItems.docs.some(doc => 
                doc.data().name.toLowerCase() === itemName.toLowerCase()
            );

            if (duplicateExists) {
                this.showMessage(`عنصر بالاسم "${itemName}" موجود بالفعل.`);
                return;
            }

            const newItemData = {
                name: itemName,
                unit: itemUnit,
                createdAt: new Date(),
                createdBy: this.userId
            };

            console.log("Adding new item:", newItemData, "to collection:", collectionName);
            
            const docRef = await addDoc(collectionRef, newItemData);
            console.log("Item added successfully with ID:", docRef.id);
            
            this.showMessage(`تمت إضافة ${itemName} بنجاح إلى قاعدة البيانات!`);
            this.adminForm.reset();
            
            // Force refresh of the specific collection
            switch (itemType) {
                case 'materials':
                    this.fetchMaterials();
                    break;
                case 'workers':
                    this.fetchWorkers();
                    break;
                case 'contractors':
                    this.fetchContractors();
                    break;
            }
            
        } catch (error) {
            console.error("Error adding admin item:", error);
            this.showMessage(`حدث خطأ أثناء إضافة البند: ${error.message}`);
        }
    }

    // Delete functions for admin
    async deleteProject(projectId) {
        if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/projects`, projectId));
                this.showMessage("تم حذف المشروع بنجاح!");
            } catch (error) {
                console.error("Error deleting project:", error);
                this.showMessage("حدث خطأ أثناء حذف المشروع.");
            }
        }
    }

    async deleteMaterial(materialId) {
        if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/materials`, materialId));
                this.showMessage("تم حذف المادة بنجاح!");
            } catch (error) {
                console.error("Error deleting material:", error);
                this.showMessage("حدث خطأ أثناء حذف المادة.");
            }
        }
    }

    async deleteWorker(workerId) {
        if (confirm('هل أنت متأكد من حذف هذا العامل؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/workers`, workerId));
                this.showMessage("تم حذف العامل بنجاح!");
            } catch (error) {
                console.error("Error deleting worker:", error);
                this.showMessage("حدث خطأ أثناء حذف العامل.");
            }
        }
    }

    async deleteContractor(contractorId) {
        if (confirm('هل أنت متأكد من حذف هذا المقاول؟')) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/contractors`, contractorId));
                this.showMessage("تم حذف المقاول بنجاح!");
            } catch (error) {
                console.error("Error deleting contractor:", error);
                this.showMessage("حدث خطأ أثناء حذف المقاول.");
            }
        }
    }
}

// Create global dashboard instance for delete functions
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});



