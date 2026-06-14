<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Diagnosis System</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('style.css') }}">
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script>
        window.DDS_BOOTSTRAP = @json($ddsBootstrap ?? []);
    </script>
    <script src="{{ asset('js/dds-state.js') }}"></script>

    <script>
        (function(){
            const auth = localStorage.getItem("dds_auth");
            const legacy = localStorage.getItem("dds_auth") || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user');
            if (!auth && legacy){
                try{
                    const old = JSON.parse(legacy);
                    localStorage.setItem("dds_auth", JSON.stringify({
                        username: old.username || "مستخدم",
                        role: "user",
                        isGuest: !!old.isGuest,
                        loginTime: old.loginTime || new Date().toISOString()
                    }));
                }catch(e){}
            }
            const a = JSON.parse(localStorage.getItem("dds_auth") || "null");
            if (!a){
                window.location.href = "index.html";
                return;
            }
            window.DDS_AUTH = a;
        })();
    </script>
    
    <nav class="top-nav">
        <div class="nav-container">
            <div class="logo">
                <i class="fas fa-stethoscope"></i>
                <h1>3D Diagnosis <span class="logo-highlight">System</span></h1>
                <span class="logo-sub">تفاصيل الصدر</span>
            </div>
            
            <div class="nav-controls">
                <button class="nav-btn" onclick="backToModel()">
                    <i class="fas fa-arrow-right"></i>
                    <span>العودة للنموذج الرئيسي</span>
                </button>
                <button class="nav-btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    </nav>

    <div class="main-container model-selector-page">
        <div class="center-panel">
            <div class="viewer-header">
                <h2><i class="fas fa-heart"></i> تفاصيل أجزاء الصدر</h2>
                <p class="page-description">انقر على أي جزء من الصدر لتحديد منطقة الألم بدقة</p>
            </div>
            
            <div class="model-viewer-container">
                <div id="model-viewer">
                    <div class="loading" id="loading">
                        <div class="spinner"></div>
                        <p>جاري تحميل تفاصيل الصدر...</p>
                        <p class="loading-sub">الرجاء الانتظار</p>
                    </div>
                </div>
                
                <div class="viewer-overlay">
                    <div class="selected-part-display" id="selected-part" style="display: none;">
                        <div class="selected-part-header">
                            <i class="fas fa-crosshairs"></i>
                            <h3>المنطقة المحددة</h3>
                        </div>
                        <div class="selected-part-content">
                            <div class="part-name">
                                <span class="part-ar">""</span>
                                <span class="part-en">""</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="selected-part-actions" id="actions-section" style="display: none;">
                <div class="selected-info">
                    <div class="selected-icon">
                        <i id="selected-part-icon"></i>
                    </div>
                    <div class="selected-details">
                        <h3><i class="fas fa-check-circle"></i> تم تحديد المنطقة</h3>
                        <div class="selected-part-info">
                            <span class="selected-part-ar" id="selected-ar">""</span>
                            <span class="selected-part-en" id="selected-en">""</span>
                        </div>
                    </div>
                </div>
                <a href="diagnosis-chat.html" class="continue-link" id="continue-link">
                    الانتقال إلى التشخيص
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            
            <div class="viewer-instruction">
                <i class="fas fa-mouse-pointer"></i>
                <p id="instruction-text">انقر على أي جزء من الصدر لتحديد منطقة الألم.</p>
            </div>
        </div>

        <div class="right-panel">
            <div class="body-parts-guide">
                <h3><i class="fas fa-map"></i> دليل أجزاء الصدر</h3>
                
                <div class="body-parts-list">
                    <div class="body-part-item" data-part="neck">
                        <div class="body-part-icon">
                            <i class="fas fa-head-side-medical"></i>
                        </div>
                        <span class="body-part-name">رقبة</span>
                        <div class="body-part-indicator"></div>
                    </div>

                    <div class="body-part-item" data-part="chest_up">
                        <div class="body-part-icon">
                            <i class="fas fa-lungs"></i>
                        </div>
                        <span class="body-part-name">صدر علوي</span>
                        <div class="body-part-indicator"></div>
                    </div>

                    <div class="body-part-item" data-part="sternum">
                        <div class="body-part-icon">
                            <i class="fas fa-bone"></i>
                        </div>
                        <span class="body-part-name">عظمة القص</span>
                        <div class="body-part-indicator"></div>
                    </div>

                    <div class="body-part-item" data-part="breasts">
                        <div class="body-part-icon">
                            <i class="fas fa-heartbeat"></i>
                        </div>
                        <span class="body-part-name">الصدر</span>
                        <div class="body-part-indicator"></div>
                    </div>
                </div>
            </div>
            
            <div class="selection-history">
                <h3><i class="fas fa-history"></i> التحديدات السابقة</h3>
                <div class="history-list" id="history-list">
                    <p class="empty-history">لا توجد تحديدات سابقة</p>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('script-chest-details.js') }}"></script>
    <script>
        function backToModel() {
            window.location.href = 'model-selector.html';
        }
        
        function logout() {
            localStorage.removeItem('dds_auth');
            localStorage.removeItem('mediscan_user');
            localStorage.removeItem('selected_body_part');
            window.location.href = 'index.html';
        }
        
        // دالة handlePartSelection المعرفة عالمياً
        window.handlePartSelection = function(partName) {
            console.log("تم تحديث الواجهة للجزء:", partName);
            
            const list = typeof partsByIndex !== 'undefined' ? partsByIndex :
                         (typeof armPartsByIndex !== 'undefined' ? armPartsByIndex :
                         (typeof headPartsByIndex !== 'undefined' ? headPartsByIndex :
                         (typeof chestPartsByIndex !== 'undefined' ? chestPartsByIndex :
                         (typeof bellyPartsByIndex !== 'undefined' ? bellyPartsByIndex :
                         (typeof partMapByName !== 'undefined' ? Object.values(partMapByName) : [])))));
            const info = list.find(p => p.name === partName);
            const part = info ? { ar: info.ar, en: info.en, icon: info.icon, color: info.color || "#2563eb" } : 
                         { ar: partName, en: partName, icon: "fas fa-user-md", color: "#9ca3af" };
            
            // document.querySelector('.part-ar').textContent = part.ar;
            document.querySelector('.part-en').textContent = part.en;
            document.getElementById('selected-part').style.display = 'block';
            
            // تحديث منطقة الإجراءات
            document.getElementById('selected-ar').textContent = part.ar;
            document.getElementById('selected-en').textContent = part.en;
            
            const iconElement = document.getElementById('selected-part-icon');
            if (iconElement) {
                iconElement.className = part.icon;
                iconElement.style.color = part.color;
            }
            
            document.getElementById('actions-section').style.display = 'flex';
            
            // حفظ في localStorage
            localStorage.setItem('selected_body_part', JSON.stringify({
                en: part.en,
                ar: part.ar,
                bodyPart: partName,
                icon: part.icon,
                color: part.color,
                timestamp: new Date().toISOString()
            }));
            
            // حفظ في السجل التاريخي
            saveToHistory(part);
            
            // تمييز العنصر في الدليل
            highlightBodyPartInGuide(partName);
        };
        
        function saveToHistory(part) {
            const history = JSON.parse(localStorage.getItem('mediscan_selection_history')) || [];
            
            history.unshift({
                ar: part.ar,
                en: part.en,
                icon: part.icon,
                time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toLocaleDateString('ar-SA')
            });
            
            if (history.length > 10) {
                history.pop();
            }
            
            localStorage.setItem('mediscan_selection_history', JSON.stringify(history));
            loadHistory();
            
            // تحديث الأيقونات في الدليل الجانبي تلقائياً لتطابق الموديل
            document.querySelectorAll('.body-part-item').forEach(item => {
                const part = item.getAttribute('data-part');
                const list = typeof partsByIndex !== 'undefined' ? partsByIndex :
                             (typeof armPartsByIndex !== 'undefined' ? armPartsByIndex :
                             (typeof headPartsByIndex !== 'undefined' ? headPartsByIndex :
                             (typeof chestPartsByIndex !== 'undefined' ? chestPartsByIndex :
                             (typeof bellyPartsByIndex !== 'undefined' ? bellyPartsByIndex :
                             (typeof partMapByName !== 'undefined' ? Object.values(partMapByName) : [])))));
                const info = list.find(p => p.name === part);
                if (info) {
                    const iconEl = item.querySelector('.body-part-icon i') || item.querySelector('.body-part-icon .custom-icon');
                    if (iconEl) {
                        iconEl.className = info.icon;
                        if (info.icon.includes('custom-icon')) {
                            iconEl.style.color = info.color || '';
                        }
                    }
                }
            });
        }
        
        function loadHistory() {
            const history = JSON.parse(localStorage.getItem('mediscan_selection_history')) || [];
            const historyList = document.getElementById('history-list');
            
            if (history.length === 0) {
                historyList.innerHTML = '<p class="empty-history">لا توجد تحديدات سابقة</p>';
                return;
            }
            
            historyList.innerHTML = '';
            history.slice(0, 5).forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-part">${item.ar}</div>
                    <div class="history-meta">
                        <span class="history-time">${item.time}</span>
                        <span class="history-date">${item.date}</span>
                    </div>
                `;
                historyList.appendChild(historyItem);
            });
        }
        
        function highlightBodyPartInGuide(partName) {
            document.querySelectorAll('.body-part-item').forEach(item => {
                item.classList.remove('selected');
                item.querySelector('.body-part-indicator').style.backgroundColor = '';
            });
            
            const selectedItem = document.querySelector(`.body-part-item[data-part="${partName}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
                selectedItem.querySelector('.body-part-indicator').style.backgroundColor = '#ef4444';
            }
        }
        
        // تهيئة الصفحة
        window.addEventListener('DOMContentLoaded', () => {
            const user = JSON.parse(localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user'));
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            loadHistory();
            
            // تحديث الأيقونات في الدليل الجانبي تلقائياً لتطابق الموديل
            document.querySelectorAll('.body-part-item').forEach(item => {
                const part = item.getAttribute('data-part');
                const list = typeof partsByIndex !== 'undefined' ? partsByIndex :
                             (typeof armPartsByIndex !== 'undefined' ? armPartsByIndex :
                             (typeof headPartsByIndex !== 'undefined' ? headPartsByIndex :
                             (typeof chestPartsByIndex !== 'undefined' ? chestPartsByIndex :
                             (typeof bellyPartsByIndex !== 'undefined' ? bellyPartsByIndex :
                             (typeof partMapByName !== 'undefined' ? Object.values(partMapByName) : [])))));
                const info = list.find(p => p.name === part);
                if (info) {
                    const iconEl = item.querySelector('.body-part-icon i') || item.querySelector('.body-part-icon .custom-icon');
                    if (iconEl) {
                        iconEl.className = info.icon;
                        if (info.icon.includes('custom-icon')) {
                            iconEl.style.color = info.color || '';
                        }
                    }
                }
            });
            
            // ربط الأيقونات بالنقر
            document.querySelectorAll('.body-part-item').forEach(item => {
                item.addEventListener('click', () => {
                    const part = item.getAttribute('data-part');
                    window.handlePartSelection(part);
                    if (window.selectChestPart) { window.selectChestPart(part); }
                    
                    // إظهار إشعار
                    showNotification(`تم تحديد ${item.querySelector('.body-part-name').textContent}`, 'success');
                });
            });
        });
        
        function showNotification(message, type) {
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
            }, 2000);
        }
    </script>
    
    <style>
        .history-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.25rem;
        }
        
        .history-date {
            font-size: 0.7rem;
            color: var(--gray-400);
        }
        
        .selected-icon i,
        .selected-icon .custom-icon {
            font-size: 2.8rem !important;
            color: white !important;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    </style>
</body>
</html>