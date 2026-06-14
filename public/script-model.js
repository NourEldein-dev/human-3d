// ===== GLOBAL VARIABLES =====
let scene, camera, renderer, model;
const viewer = document.getElementById('model-viewer');
const loadingElement = document.getElementById('loading');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let highlighted = null;
let clickableObjects = [];

// لون هايلايت موحد لكل الأجزاء
const UNIFIED_HIGHLIGHT_COLOR = 0x2563eb;

// تدوير تلقائي لمساعدة اختيار الظهر
let autoRotateEnabled = false;

// خريطة أجزاء الجسم حسب الفهرس
const bodyPartsByIndex = [
    { name: 'Head', ar: 'الرأس', en: 'Head', color: '#fbbf24', icon: 'custom-icon head' },
    { name: 'Chest', ar: 'الصدر', en: 'Chest', color: '#ef4444', icon: 'fas fa-heart' },
    { name: 'Belly', ar: 'البطن', en: 'Belly', color: '#10b981', icon: 'custom-icon stomach' },
    { name: 'Back', ar: 'الظهر', en: 'Back', color: '#6b7280', icon: 'custom-icon back' },
    { name: 'Right Arm', ar: 'الذراع الأيمن', en: 'Right Arm', color: '#3b82f6', icon: 'custom-icon bicep' },
    { name: 'Left Arm', ar: 'الذراع الأيسر', en: 'Left Arm', color: '#8b5cf6', icon: 'custom-icon bicep' },
    { name: 'Right Leg', ar: 'القدم اليمنى', en: 'Right Leg', color: '#f97316', icon: 'custom-icon foot_sole' },
    { name: 'Left Leg', ar: 'القدم اليسرى', en: 'Left Leg', color: '#ec4899', icon: 'custom-icon foot_sole' }
];

// ===== INITIALIZATION =====
async function init() {
    console.log("🚀 بدء تشغيل 3D Diagnosis System Model Viewer...");
    
    const user = JSON.parse(localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6f0ff);
    
    camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 10000);
    camera.position.set(0, 0, 800);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewer.innerHTML = '';
    viewer.appendChild(renderer.domElement);
    
    setupLighting();
    await loadMainModel();
    setupEventListeners();
    animate();
    
    console.log("✅ التهيئة اكتملت!");
}

// ===== SETUP LIGHTING =====
function setupLighting() {
    // إضاءة واقعية بدون التأثير على التفاعل
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 0.65));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(220, 380, 260);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 2000;
    keyLight.shadow.camera.left = -600;
    keyLight.shadow.camera.right = 600;
    keyLight.shadow.camera.top = 600;
    keyLight.shadow.camera.bottom = -600;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-320, 180, -260);
    scene.add(fillLight);

    // Rim Light (إضاءة من الخلف لإبراز الحواف ثلاثية الأبعاد)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(0, 300, -500);
    scene.add(rimLight);

    // أرضية خفيفة لالتقاط الظلال (بدون ما تبان)
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -420;
    ground.receiveShadow = true;
    ground.name = "shadow_ground";
    scene.add(ground);
}

// ===== LOAD MAIN MODEL =====
async function loadMainModel() {
    console.log("📦 جاري تحميل النموذج الرئيسي...");
    
    try {
        const loader = new THREE.GLTFLoader();
        loader.load('scene.gltf', (gltf) => {
            console.log("✅ تم تحميل النموذج الرئيسي!");
            model = gltf.scene;
            
            processMainModel(model);
            applyRealisticMaterialTweaks(model);
            
            scene.add(model);
            centerAndScaleModel();
            
            loadingElement.style.display = 'none';
            viewer.style.cursor = 'pointer';
            
            console.log(`✅ تم العثور على ${clickableObjects.length} جزء قابل للنقر`);
            
            // تسجيل جميع الأجزاء للتصحيح
            console.log("🔍 جميع أجزاء النموذج:");
            model.traverse((child, index) => {
                if (child.isMesh) {
                    console.log(`📦 [${index}] Mesh: ${child.name || 'بدون اسم'}, Material: ${child.material?.name || 'بدون اسم'}`);
                }
            });
            
            showNotification('تم تحميل النموذج التشريحي بنجاح', 'success');
            
        }, undefined, (error) => {
            console.error('❌ خطأ في تحميل النموذج:', error);
            showNotification('خطأ في تحميل النموذج الرئيسي', 'error');
            setTimeout(createBackupModel, 1000);
        });
        
    } catch (error) {
        console.error('❌ خطأ في تحميل النموذج:', error);
        showNotification('خطأ في تحميل النموذج الرئيسي', 'error');
        setTimeout(createBackupModel, 1000);
    }
}

// ===== PROCESS MAIN MODEL =====
function processMainModel(model) {
    clickableObjects = [];
    let partIndex = 0;
    
    model.traverse((child) => {
        if (child.isMesh) {
            // جعل المادة ثلاثية الأبعاد وواقعية
            const grayMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xd1dcf0,
                roughness: 0.35,
                metalness: 0.15,
                clearcoat: 0.5,
                clearcoatRoughness: 0.15,
                side: THREE.DoubleSide,
                transparent: false,
                opacity: 1
            });
            
            child.material = grayMaterial;
            
            // التعرف على الجزء بناءً على الفهرس
            const partInfo = bodyPartsByIndex[partIndex] || 
                           { name: 'Unknown', ar: 'غير معروف', en: 'Unknown', color: '#9ca3af', icon: 'fas fa-question-circle' };
            
            console.log(`🔍 الجزء ${partIndex}: ${child.name || 'بدون اسم'} -> ${partInfo.ar}`);
            
            child.userData = {
                originalColor: new THREE.Color(0xd8b39a),
                originalMaterial: child.material,
                clickable: true,
                bodyPart: partInfo.name,
                arabicName: partInfo.ar,
                englishName: partInfo.en,
                partColor: partInfo.color,
                partIcon: partInfo.icon,
                partType: 'main',
                partIndex: partIndex
            };
            
            clickableObjects.push(child);
            partIndex++;
        }
    });
    
    console.log(`📊 تم معالجة ${clickableObjects.length} جزء من أصل ${bodyPartsByIndex.length} جزء متوقع`);
}

// ===== CLICK DETECTION =====
function onModelClick(event) {
    event.preventDefault();
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(clickableObjects, true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;
        
        console.log("🎯 تم النقر على جزء!");
        console.log("معلومات الجزء:", {
            name: mesh.name,
            partIndex: mesh.userData.partIndex,
            arabicName: mesh.userData.arabicName,
            englishName: mesh.userData.englishName
        });
        
        // إزالة الهايلايت السابق
        resetHighlight();
        
        // تطبيق الهايلايت الجديد
        highlightMesh(mesh);
        
        // التعامل مع النقر
        handlePartClick(mesh);
        
    } else {
        console.log("🖱️ تم النقر على الخلفية");
        showNotification('الرجاء النقر مباشرة على جزء من الجسم', 'info');
    }
}

// ===== HANDLE PART CLICK =====
function handlePartClick(mesh) {
    const partData = mesh.userData;
    
    if (!partData) {
        console.warn("⚠️ لا توجد بيانات للمسج");
        showNotification('تم تحديد منطقة', 'info');
        return;
    }
    
    console.log(`📍 تم تحديد: ${partData.arabicName} (${partData.bodyPart})`);
    
    // تحديث الواجهة
    updateUIForSelectedPart(partData);
    
    // إظهار إشعار
    showNotification(`تم تحديد ${partData.arabicName}`, 'success');
    
    // ملاحظة: إظهار/إخفاء أزرار التفاصيل يتم الآن داخل updateUIForSelectedPart
    // حتى يعمل سواءً تم الاختيار بالنقر على الموديل أو من الدليل الجانبي.
}

// ===== UPDATE UI =====
function updateUIForSelectedPart(partData) {
    // تحديث منطقة العرض العلوية
    const partAr = document.querySelector('.part-ar');
    const partEn = document.querySelector('.part-en');
    
    if (partAr) partAr.textContent = partData.arabicName;
    if (partEn) partEn.textContent = partData.englishName;
    
    const selectedPartDiv = document.getElementById('selected-part');
    if (selectedPartDiv) selectedPartDiv.style.display = 'block';
    
    // تحديث منطقة الإجراءات
    const selectedAr = document.getElementById('selected-ar');
    const selectedEn = document.getElementById('selected-en');
    const selectedIcon = document.getElementById('selected-part-icon');
    const actionsSection = document.getElementById('actions-section');
    
    if (selectedAr) selectedAr.textContent = partData.arabicName;
    if (selectedEn) selectedEn.textContent = partData.englishName;
    if (selectedIcon) {
        selectedIcon.className = partData.partIcon;
        selectedIcon.style.color = partData.partColor;
    }
    if (actionsSection) actionsSection.style.display = 'flex';
    
    // حفظ في localStorage
    localStorage.setItem('selected_body_part', JSON.stringify({
        en: partData.englishName,
        ar: partData.arabicName,
        bodyPart: partData.bodyPart,
        icon: partData.partIcon,
        color: partData.partColor,
        timestamp: new Date().toISOString()
    }));
    
    // إذا كان هناك دالة handlePartSelection، نستدعيها
    if (window.handlePartSelection) {
        window.handlePartSelection(partData.bodyPart);
    }
    
    // تمييز العنصر في الدليل الجانبي
    highlightBodyPartInGuide(partData.bodyPart);

    // ===== إظهار/إخفاء أزرار التفاصيل (Head/Chest/Belly) =====
    const headDetailsBtn = document.getElementById('head-details-btn');
    if (headDetailsBtn) headDetailsBtn.style.display = (partData.bodyPart === 'Head') ? 'flex' : 'none';

    const chestDetailsBtn = document.getElementById('chest-details-btn');
    if (chestDetailsBtn) chestDetailsBtn.style.display = (partData.bodyPart === 'Chest') ? 'flex' : 'none';

    const bellyDetailsBtn = document.getElementById('belly-details-btn');
    if (bellyDetailsBtn) bellyDetailsBtn.style.display = (partData.bodyPart === 'Belly') ? 'flex' : 'none';

    const rightArmDetailsBtn = document.getElementById('right-arm-details-btn');
    if (rightArmDetailsBtn) rightArmDetailsBtn.style.display = (partData.bodyPart === 'Right Arm') ? 'flex' : 'none';

    const leftArmDetailsBtn = document.getElementById('left-arm-details-btn');
    if (leftArmDetailsBtn) leftArmDetailsBtn.style.display = (partData.bodyPart === 'Left Arm') ? 'flex' : 'none';

    const rightLegDetailsBtn = document.getElementById('right-leg-details-btn');
    if (rightLegDetailsBtn) rightLegDetailsBtn.style.display = (partData.bodyPart === 'Right Leg') ? 'flex' : 'none';

    const leftLegDetailsBtn = document.getElementById('left-leg-details-btn');
    if (leftLegDetailsBtn) leftLegDetailsBtn.style.display = (partData.bodyPart === 'Left Leg') ? 'flex' : 'none';

}


// ===== BODY PARTS GUIDE (RIGHT PANEL) =====
function getBodyPartInfoByName(partName) {
    return bodyPartsByIndex.find(p => p.name === partName) || null;
}

function highlightBodyPartInGuide(partName) {
    const items = document.querySelectorAll('.body-parts-guide .body-part-item');
    items.forEach(item => item.classList.remove('selected'));

    const target = document.querySelector(`.body-parts-guide .body-part-item[data-part="${partName}"]`);
    if (target) {
        target.classList.add('selected');
        if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
}

function initBodyPartsGuide() {
    const guideItems = document.querySelectorAll('.body-parts-guide .body-part-item');
    guideItems.forEach(item => {
        item.addEventListener('click', () => {
            const partName = item.dataset.part;
            const info = getBodyPartInfoByName(partName);
            if (!info) return;

            const mesh = clickableObjects.find(obj => obj?.userData?.bodyPart === partName) || null;
            if (mesh) { resetHighlight(); highlightMesh(mesh); }

            updateUIForSelectedPart({
                bodyPart: partName,
                arabicName: info.ar,
                englishName: info.en,
                icon: info.icon,
                color: info.color
            });

            if (window.handlePartSelection) {
                window.handlePartSelection(partName);
            }

            highlightBodyPartInGuide(partName);
        });
    });
}


// ===== HIGHLIGHT MESH =====
function highlightMesh(mesh) {
    highlighted = mesh;
    
    if (mesh.material) {
        // حفظ اللون الأصلي
        if (!mesh.userData.originalColor) {
            mesh.userData.originalColor = mesh.material.color.clone();
        }
        
        // تطبيق لون هايلايت موحد
        mesh.material.color.setHex(UNIFIED_HIGHLIGHT_COLOR);
        
        // إضافة تأثير إشعاع خفيف
        mesh.material.emissive = new THREE.Color(UNIFIED_HIGHLIGHT_COLOR);
        mesh.material.emissiveIntensity = 0.3;
        
        // زيادة اللمعان قليلاً
        mesh.material.roughness = 0.5;
        
        mesh.material.needsUpdate = true;
        
        // إزالة الهايلايت بعد 2 ثانية (حتى لو تم تحديد جزء آخر بعده)
        setTimeout(() => {
            resetMeshColor(mesh);
            if (highlighted === mesh) highlighted = null;
        }, 2000);
    }
}

// ===== RESET HIGHLIGHT =====
function resetHighlight() {
    if (highlighted) {
        resetMeshColor(highlighted);
        highlighted = null;
    }
}

function resetMeshColor(mesh) {
    if (mesh.userData?.originalColor) {
        mesh.material.color.copy(mesh.userData.originalColor);
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
        mesh.material.roughness = 0.35;
        mesh.material.needsUpdate = true;
    }
}

// ===== THEME TOGGLE =====


// ===== CENTER AND SCALE MODEL =====
function centerAndScaleModel() {
    if (!model) return;
    
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    
    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = 350 / maxSize;
    
    model.scale.set(scale, scale, scale);
    
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;
    
    const newSize = box.getSize(new THREE.Vector3());
    const cameraDistance = Math.max(newSize.x, newSize.y, newSize.z) * 1.8;
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    renderer.domElement.addEventListener('click', onModelClick, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);

}

function onMouseMove(event) {
    if (!model) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(clickableObjects, true);
    viewer.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = viewer.clientWidth / viewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
}


// ===== MATERIAL / REALISM TWEAKS =====
function applyRealisticMaterialTweaks(root) {
    root.traverse((child) => {
        if (!child.isMesh) return;

        // ظلال
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        // تعديل خصائص المادة لتكون واقعية وثلاثية الأبعاد
        if (mat) {
            mat.color = new THREE.Color(0xd1dcf0);
            mat.roughness = 0.35;
            mat.metalness = 0.15;
            if (mat.isMeshPhysicalMaterial || 'clearcoat' in mat) {
                mat.clearcoat = 0.5;
                mat.clearcoatRoughness = 0.15;
            }
            mat.needsUpdate = true;
        }
    });
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);
    if (autoRotateEnabled && model) {
        model.rotation.y += 0.01;
    }
    if (scene && camera && renderer) {
        renderer.render(scene, camera);
    }
}

// ===== AUTO ROTATE TOGGLE (EXPOSED) =====
window.toggleAutoRotate = function() {
    autoRotateEnabled = !autoRotateEnabled;
    return autoRotateEnabled;
};

// ===== SHOW NOTIFICATION =====
function showNotification(message, type) {
    // إزالة الإشعارات القديمة
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== CREATE BACKUP MODEL =====
function createBackupModel() {
    console.log("إنشاء نموذج احتياطي...");
    
    model = new THREE.Group();
    clickableObjects = [];
    
    const parts = [
        { name: "Head", geom: new THREE.SphereGeometry(35, 32, 32), pos: [0, 180, 0], ar: "الرأس", en: "Head", color: "#fbbf24", icon: "fas fa-brain" },
        { name: "Chest", geom: new THREE.CylinderGeometry(40, 45, 80, 16), pos: [0, 100, 0], ar: "الصدر", en: "Chest", color: "#ef4444", icon: "fas fa-heart" },
        { name: "Belly", geom: new THREE.CylinderGeometry(45, 40, 70, 16), pos: [0, 25, 0], ar: "البطن", en: "Belly", color: "#10b981", icon: "fas fa-stomach" },
        { name: "Back", geom: new THREE.BoxGeometry(75, 200, 25), pos: [0, 50, -35], ar: "الظهر", en: "Back", color: "#6b7280", icon: "fas fa-user-injured" },
        { name: "Right Arm", geom: new THREE.CylinderGeometry(15, 18, 120, 12), pos: [65, 80, 0], rot: [0, 0, Math.PI/6], ar: "الذراع الأيمن", en: "Right Arm", color: "#3b82f6", icon: "fas fa-hand-paper" },
        { name: "Left Arm", geom: new THREE.CylinderGeometry(15, 18, 120, 12), pos: [-65, 80, 0], rot: [0, 0, -Math.PI/6], ar: "الذراع الأيسر", en: "Left Arm", color: "#8b5cf6", icon: "fas fa-hand-paper" },
        { name: "Right Leg", geom: new THREE.CylinderGeometry(22, 25, 130, 12), pos: [25, -70, 0], ar: "القدم اليمنى", en: "Right Leg", color: "#f97316", icon: "fas fa-walking" },
        { name: "Left Leg", geom: new THREE.CylinderGeometry(22, 25, 130, 12), pos: [-25, -70, 0], ar: "القدم اليسرى", en: "Left Leg", color: "#ec4899", icon: "fas fa-walking" }
    ];
    
    parts.forEach((part, index) => {
        const material = new THREE.MeshPhysicalMaterial({ 
            color: 0xd1dcf0,
            roughness: 0.35,
            metalness: 0.15,
            clearcoat: 0.5,
            clearcoatRoughness: 0.15
        });
        
        const mesh = new THREE.Mesh(part.geom, material);
        mesh.position.set(...part.pos);
        
        if (part.rot) mesh.rotation.set(...part.rot);
        
        mesh.userData = {
            originalColor: new THREE.Color(0xd8b39a),
            clickable: true,
            bodyPart: part.name,
            arabicName: part.ar,
            englishName: part.en,
            partColor: part.color,
            partIcon: part.icon,
            partType: 'main',
            partIndex: index
        };
        
        clickableObjects.push(mesh);
        model.add(mesh);
    });
    
    scene.add(model);
    centerAndScaleModel();
    
    loadingElement.style.display = 'none';
    viewer.style.cursor = 'pointer';
    
    console.log("✅ تم إنشاء النموذج الاحتياطي مع", clickableObjects.length, "جزء");
    showNotification('تم تحميل النموذج الاحتياطي', 'info');
}

// ===== INITIALIZE =====
window.addEventListener('DOMContentLoaded', () => {
    console.log("🏥 بدء تشغيل 3D Diagnosis System...");

    // زر التدوير (يساعد في اختيار الظهر)
    const rotateBtn = document.getElementById('rotate-btn');
    if (rotateBtn) {
        const updateRotateBtnUI = () => {
            rotateBtn.classList.toggle('active', autoRotateEnabled);
            const label = rotateBtn.querySelector('span');
            if (label) label.textContent = autoRotateEnabled ? 'إيقاف التدوير' : 'تدوير';
        };

        rotateBtn.addEventListener('click', () => {
            autoRotateEnabled = !autoRotateEnabled;
            updateRotateBtnUI();
            showNotification(autoRotateEnabled ? 'تم تشغيل التدوير' : 'تم إيقاف التدوير', 'info');
        });

        updateRotateBtnUI();
    }
    
    // إضافة أنماط الإشعارات
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 9999;
            transform: translateY(-100px);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .notification-success {
            border-right: 4px solid #10b981;
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        }
        
        .notification-info {
            border-right: 4px solid #3b82f6;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
        }
        
        .notification-error {
            border-right: 4px solid #ef4444;
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
        }
        
        .notification i {
            font-size: 1.25rem;
        }

        .notification span {
            color: #111827;
            font-weight: 600;
        }
        
        .notification-success i { color: #10b981; }
        .notification-info i { color: #3b82f6; }
        .notification-error i { color: #ef4444; }
    `;
    document.head.appendChild(style);
    
    initBodyPartsGuide();
    init();
});

// ===== NAVIGATION TO DETAILS PAGES =====
function goToRightArmDetails(){ window.location.href = 'right-arm-details.html'; }
function goToLeftArmDetails(){ window.location.href = 'left-arm-details.html'; }
function goToRightLegDetails(){ window.location.href = 'right-leg-details.html'; }
function goToLeftLegDetails(){ window.location.href = 'left-leg-details.html'; }
// End of script
