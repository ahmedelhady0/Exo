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
            await signOu
