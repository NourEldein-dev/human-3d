// ===== GLOBAL VARIABLES =====
let scene, camera, renderer, armModel;
const viewer = document.getElementById('model-viewer');
const loadingElement = document.getElementById('loading');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let highlighted = null;
let clickableObjects = [];

// لون هايلايت موحد لكل أجزاء الذراع الأيسر
const UNIFIED_HIGHLIGHT_COLOR = 0x2563eb;

// مدة بقاء الهايلايت قبل الاختفاء (مللي ثانية)
const HIGHLIGHT_DURATION_MS = 2500;
let highlightTimeout = null;

// خريطة أجزاء الذراع الأيسر (حسب الاسم أو الفهرس)
const partMapByName = {
    'shoulder_L': { name: 'shoulder_L', ar: 'كتف', en: 'Shoulder', icon: 'custom-icon shoulder' },
    'upperarm_L': { name: 'upperarm_L', ar: 'يد علوية', en: 'Upper Arm', icon: 'custom-icon bicep' },
    'elbow_L': { name: 'elbow_L', ar: 'كوع', en: 'Elbow', icon: 'fas fa-angles-left' },
    'forearm_L': { name: 'forearm_L', ar: 'يد سفلية', en: 'Forearm', icon: 'custom-icon forearm' },
    'wrist_L': { name: 'wrist_L', ar: 'معصم', en: 'Wrist', icon: 'fas fa-clock' },
    'hand_L': { name: 'hand_L', ar: 'يد', en: 'Hand', icon: 'custom-icon hand' },
};

const partsByIndex = [
    { name: 'shoulder_L', ar: 'كتف', en: 'Shoulder', icon: 'custom-icon shoulder' },
    { name: 'upperarm_L', ar: 'يد علوية', en: 'Upper Arm', icon: 'custom-icon bicep' },
    { name: 'elbow_L', ar: 'كوع', en: 'Elbow', icon: 'fas fa-angles-left' },
    { name: 'forearm_L', ar: 'يد سفلية', en: 'Forearm', icon: 'custom-icon forearm' },
    { name: 'wrist_L', ar: 'معصم', en: 'Wrist', icon: 'fas fa-clock' },
    { name: 'hand_L', ar: 'يد', en: 'Hand', icon: 'custom-icon hand' },
];


// ===== INITIALIZATION =====
async function init() {
    console.log("🚀 بدء تحميل تفاصيل الذراع الأيسر...");
    
    const user = JSON.parse(localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6f0ff);
    
    camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 10000);
    camera.position.set(0, 0, 500);
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
    await loadBellyModel();
    setupEventListeners();
    animate();
    
    console.log("✅ تهيئة تفاصيل الذراع الأيسر اكتملت!");
}

// ===== SETUP LIGHTING =====
function setupLighting() {
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

    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -420;
    ground.receiveShadow = true;
    ground.name = "shadow_ground";
    scene.add(ground);
}

// ===== LOAD HEAD MODEL =====
async function loadBellyModel() {
    console.log("🫁 جاري تحميل نموذج الذراع الأيسر التفصيلي...");
    
    try {
        const loader = new THREE.GLTFLoader();
        loader.load('arm_L.gltf', (gltf) => {
            console.log("✅ تم تحميل نموذج الذراع الأيسر!");
            
            armModel = gltf.scene;
            clickableObjects = [];
            
            // معالجة نموذج الذراع الأيسر
            processBellyModel(armModel);
            
            // إضافة للمشهد
            scene.add(armModel);
            
            // تكبير وتوسيع الرأس
            centerAndScaleModel();
            
            loadingElement.style.display = 'none';
            viewer.style.cursor = 'pointer';
            
            console.log(`🫁 تم العثور على ${clickableObjects.length} جزء من الذراع الأيسر`);
            
            showNotification('تم تحميل تفاصيل الذراع الأيسر بنجاح', 'success');
            
        }, undefined, (error) => {
            console.error('❌ خطأ في تحميل نموذج الذراع الأيسر:', error);
            showNotification('لا يمكن تحميل تفاصيل الذراع الأيسر', 'error');
            setTimeout(createBackupBellyModel, 1000);
        });
        
    } catch (error) {
        console.error('❌ خطأ في تحميل نموذج الذراع الأيسر:', error);
        showNotification('لا يمكن تحميل تفاصيل الذراع الأيسر', 'error');
        setTimeout(createBackupBellyModel, 1000);
    }
}

// ===== PROCESS HEAD MODEL =====
function processBellyModel(armModel) {
    let partIndex = 0;
    
    armModel.traverse((child) => {
        if (child.isMesh) {
            // جعل المادة ثلاثية الأبعاد وواقعية
            const grayMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xd1dcf0,
                roughness: 0.35,
                metalness: 0.15,
                clearcoat: 0.5,
                clearcoatRoughness: 0.15,
                side: THREE.DoubleSide
            });
            
            child.material = grayMaterial;
            
            // التعرف على الجزء حسب الاسم (الأفضل) أو الفهرس
            const meshName = (child.name || "").trim();
            const partInfo = partMapByName[meshName] || partsByIndex[partIndex] || partsByIndex[partsByIndex.length-1];
            
            console.log(`🫁 الجزء ${partIndex}: ${child.name || 'بدون اسم'} -> ${partInfo.ar}`);
            
            child.userData = {
                originalColor: new THREE.Color(0xd8b39a),
                originalMaterial: child.material,
                clickable: true,
                bodyPart: partInfo.name,
                arabicName: partInfo.ar,
                englishName: partInfo.en,
                partColor: partInfo.color,
                partIcon: partInfo.icon,
                partType: 'armLeftPart',
                partIndex: partIndex
            };
            
            clickableObjects.push(child);
            partIndex++;
        }
    });
    
    console.log(`📊 تم معالجة ${clickableObjects.length} جزء من الذراع الأيسر`);
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
        
        console.log("🎯 تم النقر على جزء من الذراع الأيسر!");
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
        showNotification('الرجاء النقر مباشرة على جزء من الذراع الأيسر', 'info');
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
        
        // جعل الهايلايت يختفي بعد ثواني
        if (highlightTimeout) clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => {
            resetHighlight();
        }, HIGHLIGHT_DURATION_MS);
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
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
    }
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

// ===== SELECT PART FROM GUIDE =====
window.selectBellyPart = function(partKey) {
    if (!clickableObjects || clickableObjects.length === 0) return;
    const target = clickableObjects.find(obj => obj?.userData?.bodyPart === partKey);
    if (!target) {
        console.warn('لم يتم العثور على جزء:', partKey);
        return;
    }
    // إزالة أي هايلايت سابق فورًا
    resetHighlight();
    highlightMesh(target);
};

// ===== CENTER AND SCALE MODEL =====
function centerAndScaleModel() {
    if (!armModel) return;
    
    const box = new THREE.Box3().setFromObject(armModel);
    const size = box.getSize(new THREE.Vector3());
    
    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = 500 / maxSize;
    
    armModel.scale.set(scale, scale, scale);
    
    box.setFromObject(armModel);
    const center = box.getCenter(new THREE.Vector3());
    armModel.position.x = -center.x;
    armModel.position.y = -center.y;
    armModel.position.z = -center.z;
    
    const newSize = box.getSize(new THREE.Vector3());
    const cameraDistance = Math.max(newSize.x, newSize.y, newSize.z) * 2.2;
    camera.position.set(0, 50, cameraDistance);
    camera.lookAt(0, 50, 0);
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    renderer.domElement.addEventListener('click', onModelClick, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);

    // تفعيل النقر على أيقونات/عناصر الدليل الجانبي
    document.querySelectorAll('.body-part-item').forEach(item => {
        item.addEventListener('click', () => {
            const partName = item.getAttribute('data-part');

            // إيجاد الميش المطابق لجزء الذراع الأيسر
            const mesh = clickableObjects.find(obj => obj?.userData?.bodyPart === partName);

            if (!mesh) {
                console.warn('⚠️ لم يتم العثور على الميش للجزء:', partName);
                showNotification('تعذر تحديد هذا الجزء من النموذج', 'error');
                return;
            }

            // تحديث حالة الاختيار في القائمة
            document.querySelectorAll('.body-part-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');

            // إزالة الهايلايت السابق ثم تطبيق الجديد
            resetHighlight();
            highlightMesh(mesh);
            handlePartClick(mesh);
        });
    });
}

function onMouseMove(event) {
    if (!armModel) return;
    
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
    if (scene && camera && renderer) {
        renderer.render(scene, camera);
    }
}

// ===== SHOW NOTIFICATION =====
function showNotification(message, type) {
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

// ===== CREATE BACKUP HEAD MODEL =====
function createBackupBellyModel() {
    console.log("إنشاء نموذج احتياطي للرأس...");
    
    armModel = new THREE.Group();
    clickableObjects = [];
    
    const parts = [
        { name: "Scalp", geom: new THREE.SphereGeometry(25, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), pos: [0, 25, 0], ar: "فروة الرأس", en: "Scalp", color: "#fbbf24", icon: "fas fa-head-side" },
        { name: "Nose", geom: new THREE.ConeGeometry(3, 8, 8), pos: [0, 15, 12], rot: [Math.PI/2, 0, 0], ar: "الأنف", en: "Nose", color: "#fbbf24", icon: "fas fa-nose" },
        { name: "Eyes", geom: new THREE.BoxGeometry(15, 5, 2), pos: [0, 20, 10], ar: "العينان", en: "Eyes", color: "#fbbf24", icon: "fas fa-eye" },
        { name: "Ears", geom: new THREE.BoxGeometry(3, 8, 2), pos: [15, 15, 0], ar: "الأذنان", en: "Ears", color: "#fbbf24", icon: "fas fa-ear" },
        { name: "Jaw", geom: new THREE.BoxGeometry(20, 10, 15), pos: [0, 5, 0], ar: "الفك", en: "Jaw", color: "#fbbf24", icon: "fas fa-teeth" }
    ];
    
    parts.forEach((part, index) => {
        const material = new THREE.MeshPhysicalMaterial({ 
            color: 0xd1dcf0,
            roughness: 0.35,
            metalness: 0.15,
            clearcoat: 0.5,
            clearcoatRoughness: 0.15,
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
            partType: 'armLeftPart',
            partIndex: index
        };
        
        clickableObjects.push(mesh);
        armModel.add(mesh);
    });
    
    scene.add(armModel);
    centerAndScaleModel();
    
    loadingElement.style.display = 'none';
    viewer.style.cursor = 'pointer';
    
    console.log("✅ تم إنشاء النموذج الاحتياطي للرأس مع", clickableObjects.length, "جزء");
    showNotification('تم تحميل تفاصيل الذراع الأيسر الاحتياطية', 'info');
}

// ===== INITIALIZE =====
window.addEventListener('DOMContentLoaded', () => {
    console.log("🫁 بدء تشغيل تفاصيل الذراع الأيسر...");
    
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
            color: #1e293b !important;
            font-weight: 600 !important;
        }
        
        .notification-success i { color: #10b981; }
        .notification-info i { color: #3b82f6; }
        .notification-error i { color: #ef4444; }
    `;
    document.head.appendChild(style);
    
    init();


const arm_LTranslations = {
  "shoulder_L": "كتف",
  "upperarm_L": "يد علوية",
  "elbow_L": "كوع",
  "forearm_L": "يد سفلية",
  "wrist_L": "معصم",
  "hand_L": "يد"
};

function translateSelected_arm_LTranslations(meshName) {
  return arm_LTranslations[meshName] || meshName;
}

});