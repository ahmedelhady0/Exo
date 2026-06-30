// ═══════════════════════════════════════════════════════════
// منطق الصفحة الرئيسية
// ═══════════════════════════════════════════════════════════
import { auth, db, appId, showMessage, hideMessage, formatDate } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const userWelcome = document.getElementById('userWelcome');
const signOutBtn = document.getElementById('signOutBtn');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const recentMovements = document.getElementById('recentMovements');
const closeMessageBtn = document.getElementById('closeMessageBtn');

closeMessageBtn?.addEventListener('click', hideMessage);

signOutBtn?.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('exo_warehouse_session');
    window.location.href = 'index.html';
});

const TYPE_LABELS = {
    receive: { text: 'استلام', cls: 'receive' },
    spend:   { text: 'صرف', cls: 'spend' },
    return:  { text: 'مرتجع', cls: 'return' }
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${user.uid}`);
    const userSnap = await getDoc(userDocRef);
    let username = user.uid.substring(0, 8);
    let role = 'supervisor';

    if (userSnap.exists()) {
        const data = userSnap.data();
        username = data.username || username;
        role = data.role || 'supervisor';
    }

    userWelcome.textContent = `مرحباً، ${username}`;
    localStorage.setItem('exo_warehouse_session', JSON.stringify({ uid: user.uid, username, role }));

    if (role === 'admin') {
        adminPanelBtn.classList.remove('hidden');
    }

    // آخر 5 حركات سجلها هذا المستخدم
    const movementsRef = collection(db, `artifacts/${appId}/public/data/movements`);
    const q = query(movementsRef, where('createdBy', '==', user.uid), orderBy('timestamp', 'desc'), limit(5));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            recentMovements.innerHTML = '<p class="text-center text-gray-500 text-sm">لا توجد حركات مسجلة بعد</p>';
            return;
        }
        recentMovements.innerHTML = '';
        snapshot.forEach(d => {
            const m = d.data();
            const t = TYPE_LABELS[m.movementType] || { text: m.movementType, cls: '' };
            const card = document.createElement('div');
            card.className = `movement-card type-${t.cls}`;
            card.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="movement-badge badge-${t.cls}">${t.text}</span>
                    <span class="text-xs text-gray-400">${formatDate(m.timestamp)}</span>
                </div>
                <p class="text-sm text-gray-800 font-semibold">${m.material} — ${m.quantity ?? ''} ${m.unit || ''}</p>
                <p class="text-xs text-gray-500">${m.project || ''} ${m.phase ? '· ' + m.phase : ''}</p>
            `;
            recentMovements.appendChild(card);
        });
    }, (err) => {
        console.error(err);
        recentMovements.innerHTML = '<p class="text-center text-gray-500 text-sm">تعذر تحميل الحركات</p>';
    });
});
