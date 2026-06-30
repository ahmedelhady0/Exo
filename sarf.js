// ═══════════════════════════════════════════════════════════
// منطق فورم الصرف على المشروع
// ═══════════════════════════════════════════════════════════
import { auth, db, storage, appId, PHASES, MATERIALS_NO_RETURN, showMessage, hideMessage, todayStr } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

let currentUser = null;
let currentUsername = '';
let allMaterials = [];

const fDate = document.getElementById('fDate');
const fProject = document.getElementById('fProject');
const fPhase = document.getElementById('fPhase');
const fMaterial = document.getElementById('fMaterial');
const fUnit = document.getElementById('fUnit');
const fQuantity = document.getElementById('fQuantity');
const fContractor = document.getElementById('fContractor');
const fImage = document.getElementById('fImage');
const fNotes = document.getElementById('fNotes');
const foamRemainingWrap = document.getElementById('foamRemainingWrap');
const fRemaining = document.getElementById('fRemaining');
const spendForm = document.getElementById('spendForm');
const submitBtn = document.getElementById('submitBtn');
const uploadProgressWrap = document.getElementById('uploadProgressWrap');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const closeMessageBtn = document.getElementById('closeMessageBtn');

closeMessageBtn?.addEventListener('click', hideMessage);
fDate.value = todayStr();

PHASES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    fPhase.appendChild(opt);
});

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    const userSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/users/${user.uid}`));
    currentUsername = userSnap.exists() ? (userSnap.data().username || '') : '';
    await loadMaterials();
});

async function loadMaterials() {
    const snap = await getDocs(collection(db, `artifacts/${appId}/public/data/materials`));
    allMaterials = [];
    snap.forEach(d => allMaterials.push({ id: d.id, ...d.data() }));
}

fPhase.addEventListener('change', () => {
    const phase = fPhase.value;
    fMaterial.innerHTML = '<option value="" disabled selected>اختر المادة</option>';
    const matchingMaterials = allMaterials.filter(m => m.phase === phase);

    if (matchingMaterials.length === 0) {
        fMaterial.innerHTML = '<option value="" disabled selected>لا توجد مواد لهذه المرحلة</option>';
        fMaterial.disabled = true;
        return;
    }

    matchingMaterials.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.dataset.unit = m.unit;
        fMaterial.appendChild(opt).textContent = `${m.name} (${m.unit})`;
    });
    fMaterial.disabled = false;
    fUnit.value = '';
    foamRemainingWrap.classList.add('hidden');
});

fMaterial.addEventListener('change', () => {
    const selected = fMaterial.options[fMaterial.selectedIndex];
    fUnit.value = selected?.dataset?.unit || '';

    // أظهر حقل "متبقي في العربية" لو المادة من مواد الفوم
    if (MATERIALS_NO_RETURN.includes(fMaterial.value)) {
        foamRemainingWrap.classList.remove('hidden');
        fRemaining.required = false;
    } else {
        foamRemainingWrap.classList.add('hidden');
    }
});

// المرحلة لما تكون "فوم" ميكنش لازم رجوع — بس الفلترة شغالة من اختيار المادة فعلياً

spendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('خطأ: المستخدم غير مسجل دخول'); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';

    try {
        let imageUrl = '';
        const file = fImage.files[0];
        if (file) {
            uploadProgressWrap.classList.remove('hidden');
            const fileRef = ref(storage, `warehouse-images/spend/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            imageUrl = await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snap) => { uploadProgressBar.style.width = (snap.bytesTransferred / snap.totalBytes * 100) + '%'; },
                    reject,
                    async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                );
            });
        }

        const isFoam = MATERIALS_NO_RETURN.includes(fMaterial.value);

        await addDoc(collection(db, `artifacts/${appId}/public/data/movements`), {
            movementType: 'spend',
            date: fDate.value,
            project: fProject.value,
            phase: fPhase.value,
            material: fMaterial.value,
            unit: fUnit.value,
            quantity: parseFloat(fQuantity.value),
            remainingWithContractor: isFoam && fRemaining.value !== '' ? parseFloat(fRemaining.value) : null,
            contractor: fContractor.value.trim(),
            imageUrl,
            notes: fNotes.value.trim(),
            createdBy: currentUser.uid,
            createdByName: currentUsername,
            timestamp: new Date(),
            syncedToSheets: false
        });

        showMessage('✅ تم تسجيل الصرف بنجاح!');
        spendForm.reset();
        fDate.value = todayStr();
        fMaterial.innerHTML = '<option value="" disabled selected>اختر المرحلة أولاً</option>';
        fMaterial.disabled = true;
        foamRemainingWrap.classList.add('hidden');
        uploadProgressWrap.classList.add('hidden');
        uploadProgressBar.style.width = '0%';

        setTimeout(() => hideMessage(), 1800);

    } catch (error) {
        console.error(error);
        showMessage('حدث خطأ أثناء الحفظ: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الصرف';
    }
});
