<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Diagnosis System</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('style.css') }}">
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
                <span class="logo-sub" id="current-part"></span>
            </div>
            
            <div class="nav-controls">
                <button class="nav-btn" onclick="goBackToModel()">
                    <i class="fas fa-arrow-right"></i>
                    <span>العودة للنموذج</span>
                </button>
                <button class="nav-btn" id="admin-btn" type="button" style="display:none;" onclick="window.location.href='admin-dashboard'">
                    <i class="fas fa-user-shield"></i>
                    <span>لوحة الأدمن</span>
                </button>

                <button class="nav-btn" id="logout-btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    </nav>

    <div class="main-container diagnosis-chat-page">
        <div class="right-panel full-width centered">
            <div class="panel-header">
                <h2><i class="fas fa-comment-medical"></i> التشخيص التفاعلي</h2>
                <div class="diagnosis-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <span class="progress-text" id="progress-text">0% مكتمل</span>
                </div>
            </div>
            
            <div class="selected-part-banner">
                <div class="banner-icon">
                    <i id="part-icon"></i>
                </div>
                <div class="banner-content">
                    <h3 id="selected-part-name">""</h3>
                    <p>جاري التشخيص لهذه المنطقة. سيتم طرح بعض الأسئلة لفهم حالتك بشكل أفضل.</p>
                </div>
            </div>
            
            <div class="chat-container" id="chat-box">
                <div class="chat-welcome" id="chat-welcome">
                    <div class="welcome-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>مرحباً! أنا مساعدك الطبي الذكي</h3>
                    <p>سأسألك بعض الأسئلة حول حالتك لتقديم التشخيص المناسب.</p>
                    <div class="welcome-tips">
                        <div class="tip">
                            <i class="fas fa-lightbulb"></i>
                            <span>أجب على الأسئلة بأكبر قدر من الدقة</span>
                        </div>
                        <div class="tip">
                            <i class="fas fa-clock"></i>
                            <span>التشخيص يستغرق حوالي دقيقتين</span>
                        </div>
                    </div>
                </div>
                
                <div class="chat-messages" id="chat-messages"></div>
                
                <div class="chat-input-container">
                    <div class="quick-questions" id="quick-questions"></div>
                    
                    <div class="input-group">
                        <input type="text" id="user-input" placeholder="اكتب إجابتك هنا..." 
                               onkeypress="if(event.key === 'Enter') sendChatMessage()">
                        <button class="send-btn" onclick="sendChatMessage()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="diagnosis-container" id="diagnosis-container" style="display: none;">
                <div class="diagnosis-header">
                    <h3><i class="fas fa-file-medical-alt"></i> نتيجة التشخيص</h3>
                    <div class="diagnosis-meta">
                        <span class="diagnosis-date" id="diagnosis-date"></span>
                        <span class="diagnosis-time" id="diagnosis-time"></span>
                    </div>
                </div>
                
                <div class="diagnosis-content">
                    <div class="diagnosed-part">
                        <span class="diagnosed-label">المنطقة المشخصة:</span>
                        <span class="diagnosed-value" id="diagnosed-part">""</span>
                    </div>
                    
                    <div class="diagnosis-result">
                        <h4>التشخيص:</h4>
                        <p id="diagnosis-text-ar">""</p>
                        <div id="recommendations-section">
                            <h4>التوصيات:</h4>
                            <p id="diagnosis-text-en">""</p>
                        </div>
                    </div>
                    
                    <div class="severity-indicator">
                        <span class="severity-label">شدة الحالة:</span>
                        <div class="severity-levels">
                            <div class="severity-level low" data-level="low">
                                <i class="fas fa-smile"></i>
                                <span>خفيفة</span>
                            </div>
                            <div class="severity-level medium" data-level="medium">
                                <i class="fas fa-meh"></i>
                                <span>متوسطة</span>
                            </div>
                            <div class="severity-level high" data-level="high">
                                <i class="fas fa-frown"></i>
                                <span>خطيرة</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="diagnosis-actions-container">
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-print"></i>
                        </div>
                        <div class="action-info">
                            <h4>طباعة</h4>
                            <p>طباعة التقرير الطبي</p>
                        </div>
                        <button class="action-btn print-btn" onclick="printDiagnosis()">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-save"></i>
                        </div>
                        <div class="action-info">
                            <h4>حفظ</h4>
                            <p>حفظ في السجل الطبي</p>
                        </div>
                        <button class="action-btn save-btn" onclick="saveDiagnosis()">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-file-medical-alt"></i>
                        </div>
                        <div class="action-info">
                            <h4>تشخيص جديد</h4>
                            <p>بدء تشخيص جديد</p>
                        </div>
                        <button class="action-btn new-btn" onclick="startNewDiagnosis()">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                </div>
                <div class="decorative-line">
                    <div class="line-dot"></div>
                    <div class="line-dot"></div>
                    <div class="line-dot"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('script-chat.js') }}"></script>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const user = JSON.parse(localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user'));
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            const selectedPart = JSON.parse(localStorage.getItem('selected_body_part'));
            if (!selectedPart) {
                window.location.href = 'model-selector.html';
                return;
            }
            
            document.getElementById('current-part').textContent = `جاري تشخيص: ${selectedPart.ar}`;
            document.getElementById('selected-part-name').textContent = selectedPart.ar;
            document.getElementById('diagnosed-part').textContent = selectedPart.en;
            
            const iconMap = {
                "Head": "fas fa-brain",
                "Chest": "fas fa-heart",
                "Belly": "fas fa-stomach",
                "Right Arm": "fas fa-hand-paper",
                "Left Arm": "fas fa-hand-paper",
                "Right Leg": "fas fa-walking",
                "Left Leg": "fas fa-walking",
                "Back": "fas fa-user-injured"
            };
            
            const icon = iconMap[selectedPart.en] || "fas fa-user-md";
            document.getElementById('part-icon').className = icon;
            
            setTimeout(() => {
                startChatForPart(selectedPart.en);
            }, 1000);
        });
        
        function goBackToModel() {
            window.location.href = 'model-selector.html';
        }
        
        function logout() {
            localStorage.removeItem('dds_auth');
            localStorage.removeItem('mediscan_user');
            localStorage.removeItem('selected_body_part');
            window.location.href = 'index.html';
        }
    </script>
    
    <style>
        /* ===== MODERN MEDICAL UI & HIGH-CONTRAST REDESIGN ===== */
        
        .diagnosis-chat-page .right-panel.full-width {
            width: 90% !important;
            max-width: 1000px !important;
            margin: 2.5rem auto !important;
            background: #ffffff !important;
            border-radius: 24px !important;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #e2e8f0 !important;
            padding: 2.5rem 3rem !important;
            text-align: right !important;
        }

        .diagnosis-chat-page .panel-header h2 {
            font-size: 1.9rem !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 0.85rem !important;
            margin-bottom: 0.5rem !important;
        }
        
        .diagnosis-chat-page .panel-header h2 i {
            color: #2563eb !important;
        }

        .diagnosis-progress {
            margin-top: 1.25rem !important;
            background: #f8fafc !important;
            border-radius: 16px !important;
            border: 1px solid #e2e8f0 !important;
            padding: 1rem 1.25rem !important;
        }

        .progress-bar {
            height: 10px !important;
            background: #e2e8f0 !important;
            border-radius: var(--radius-full) !important;
            overflow: hidden !important;
            margin-bottom: 0.5rem !important;
        }

        .progress-fill {
            height: 100% !important;
            background: linear-gradient(90deg, #10b981, #2563eb) !important;
            border-radius: var(--radius-full) !important;
        }

        .progress-text {
            color: #1e293b !important;
            font-size: 0.9rem !important;
            font-weight: 700 !important;
        }

        .selected-part-banner {
            background: linear-gradient(135deg, #f0f7ff, #e0f2fe) !important;
            border: 1px solid #bae6fd !important;
            border-radius: 20px !important;
            padding: 1.5rem !important;
            box-shadow: 0 10px 30px rgba(37, 99, 235, 0.03) !important;
            display: flex !important;
            align-items: center !important;
            gap: 1.5rem !important;
            margin: 2rem 0 !important;
        }

        .banner-icon {
            width: 65px !important;
            height: 65px !important;
            background: #ffffff !important;
            border: 1px solid #bae6fd !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08) !important;
            flex-shrink: 0 !important;
        }

        .banner-icon i {
            font-size: 2rem !important;
            color: #2563eb !important;
        }

        .banner-content {
            text-align: right !important;
        }

        .banner-content h3 {
            color: #0f172a !important;
            font-weight: 800 !important;
            font-size: 1.45rem !important;
            margin-bottom: 0.35rem !important;
        }

        .banner-content p {
            color: #334155 !important;
            font-size: 0.95rem !important;
            margin: 0 !important;
            line-height: 1.6 !important;
        }

        .chat-container {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 24px !important;
            padding: 1.75rem !important;
            margin-bottom: 1.5rem !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.25rem !important;
        }

        .chat-welcome {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 20px !important;
            padding: 2.25rem 1.5rem !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02) !important;
        }

        .welcome-icon {
            background: #f0f7ff !important;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.05) !important;
            width: 80px !important;
            height: 80px !important;
            border-radius: 50% !important;
            margin: 0 auto 1rem !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .welcome-icon i {
            color: #2563eb !important;
            font-size: 2.5rem !important;
        }

        .chat-welcome h3 {
            color: #0f172a !important;
            font-weight: 800 !important;
            font-size: 1.6rem !important;
            margin-bottom: 0.5rem !important;
        }

        .chat-welcome p {
            color: #475569 !important;
            font-size: 1rem !important;
            margin-bottom: 1.5rem !important;
        }

        .welcome-tips {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            max-width: 400px !important;
            margin: 0 auto !important;
        }

        .tip {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: #1e293b !important;
            font-weight: 600 !important;
            padding: 0.85rem 1.25rem !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            text-align: right !important;
        }

        .tip i {
            color: #f59e0b !important;
            font-size: 1.15rem !important;
        }

        .chat-messages {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 20px !important;
            padding: 1.75rem !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.25rem !important;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.03) !important;
            min-height: 350px !important;
            max-height: 500px !important;
            overflow-y: auto !important;
        }

        .chat-message {
            padding: 1.1rem 1.4rem !important;
            font-size: 1.05rem !important;
            line-height: 1.65 !important;
            max-width: 80% !important;
            border-radius: 18px !important;
            font-weight: 500 !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02) !important;
        }

        .chat-message.ai {
            background: #f0f7ff !important;
            border: 1px solid #d0e3ff !important;
            border-right: 5px solid #2563eb !important;
            color: #0f172a !important;
            border-top-right-radius: 4px !important;
            align-self: flex-start !important;
            text-align: right !important;
        }

        .chat-message.user {
            background: linear-gradient(135deg, #1d4ed8, #1e40af) !important;
            color: #ffffff !important;
            border-top-left-radius: 4px !important;
            box-shadow: 0 4px 15px rgba(29, 78, 216, 0.15) !important;
            align-self: flex-end !important;
            text-align: right !important;
        }
        
        .chat-message.ai.typing {
            border-right: 5px solid #0d9488 !important;
            background: #f2fbf9 !important;
            border-color: #c6ebd9 !important;
        }

        .chat-input-container {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 20px !important;
            padding: 1.25rem !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
        }

        .quick-questions {
            display: flex !important;
            gap: 0.65rem !important;
            margin-bottom: 1rem !important;
            flex-wrap: wrap !important;
        }

        .quick-question {
            background: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
            color: #334155 !important;
            font-weight: 700 !important;
            font-size: 0.9rem !important;
            border-radius: 30px !important;
            padding: 0.6rem 1.2rem !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .quick-question:hover {
            background: #e2e8f0 !important;
            border-color: #94a3b8 !important;
            color: #0f172a !important;
            transform: translateY(-2px) !important;
        }

        .input-group {
            display: flex !important;
            gap: 0.75rem !important;
            align-items: center !important;
            width: 100% !important;
        }

        .input-group input {
            flex: 1 !important;
            background: #f8fafc !important;
            border: 2px solid #cbd5e1 !important;
            color: #0f172a !important;
            font-weight: 600 !important;
            border-radius: 14px !important;
            font-size: 1.05rem !important;
            padding: 0 !important;
            padding-right: 1.25rem !important;
            padding-left: 1.25rem !important;
            height: 54px !important;
            line-height: 54px !important;
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        }

        .input-group input:focus {
            border-color: #2563eb !important;
            background: #ffffff !important;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
            outline: none !important;
        }

        .send-btn {
            background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
            border: none !important;
            border-radius: 14px !important;
            width: 54px !important;
            height: 54px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #ffffff !important;
            font-size: 1.2rem !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
            flex-shrink: 0 !important;
            box-sizing: border-box !important;
            padding: 0 !important;
        }

        .send-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 18px rgba(37, 99, 235, 0.3) !important;
            background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
        }
        
        .send-btn:active {
            transform: translateY(0) !important;
        }

        .diagnosis-container {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 24px !important;
            padding: 2.5rem !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.04) !important;
            display: flex !important;
            flex-direction: column !important;
            text-align: right !important;
            margin-top: 1.5rem !important;
        }

        .diagnosis-header {
            border-bottom: 2px solid #f1f5f9 !important;
            padding-bottom: 1.5rem !important;
            margin-bottom: 1.75rem !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 1rem !important;
        }

        .diagnosis-header h3 {
            font-weight: 800 !important;
            color: #0f172a !important;
            font-size: 1.6rem !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
        }

        .diagnosis-header h3 i {
            color: #ef4444 !important;
            animation: pulse 2s infinite !important;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }

        .diagnosis-meta {
            background: #f8fafc !important;
            color: #475569 !important;
            border: 1px solid #e2e8f0 !important;
            font-weight: 700 !important;
            padding: 0.5rem 1rem !important;
            border-radius: 30px !important;
            font-size: 0.85rem !important;
        }

        .diagnosis-content {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 20px !important;
            padding: 2rem !important;
            text-align: right !important;
        }

        .diagnosed-part {
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 1.25rem !important;
            margin-bottom: 1.5rem !important;
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
        }

        .diagnosed-label {
            color: #475569 !important;
            font-weight: 800 !important;
            font-size: 1.1rem !important;
        }

        .diagnosed-value {
            background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            border-radius: 30px !important;
            padding: 0.4rem 1.2rem !important;
            font-size: 0.95rem !important;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15) !important;
        }

        .diagnosis-result h4 {
            color: #0f172a !important;
            font-weight: 800 !important;
            margin-top: 1.5rem !important;
            font-size: 1.3rem !important;
            margin-bottom: 0.75rem !important;
        }

        .diagnosis-result p {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-right: 5px solid #2563eb !important;
            color: #0f172a !important;
            font-size: 1.15rem !important;
            font-weight: 600 !important;
            line-height: 1.8 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02) !important;
            border-radius: 12px !important;
            padding: 1.25rem 1.5rem !important;
            margin-bottom: 1.5rem !important;
        }
        
        .diagnosis-result #diagnosis-text-en {
            border-right-color: #0d9488 !important;
            font-family: 'Cairo', 'Segoe UI', sans-serif !important;
            direction: ltr !important;
            text-align: left !important;
        }

        .severity-indicator {
            margin-top: 2rem !important;
            border-top: 1px solid #e2e8f0 !important;
            padding-top: 1.5rem !important;
        }
        
        .severity-label {
            color: #0f172a !important;
            font-weight: 800 !important;
            font-size: 1.15rem !important;
            margin-bottom: 1rem !important;
            display: block !important;
        }

        .severity-levels {
            display: flex !important;
            gap: 1.25rem !important;
            width: 100% !important;
        }

        .severity-level {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 16px !important;
            padding: 1rem !important;
            transition: all 0.25s ease !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
            cursor: default !important;
            opacity: 0.4; 
        }

        .severity-level i {
            font-size: 1.5rem !important;
        }

        .severity-level span {
            color: #475569 !important;
            font-weight: 800 !important;
            font-size: 1rem !important;
        }

        .severity-level.low.active {
            opacity: 1 !important;
            background: #f0fdf4 !important;
            border-color: #10b981 !important;
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15) !important;
        }
        .severity-level.low.active i, .severity-level.low.active span {
            color: #15803d !important;
        }

        .severity-level.medium.active {
            opacity: 1 !important;
            background: #fffbeb !important;
            border-color: #f59e0b !important;
            box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15) !important;
        }
        .severity-level.medium.active i, .severity-level.medium.active span {
            color: #b45309 !important;
        }

        .severity-level.high.active {
            opacity: 1 !important;
            background: #fef2f2 !important;
            border-color: #ef4444 !important;
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.18) !important;
            animation: pulse-border 2s infinite !important;
        }
        .severity-level.high.active i, .severity-level.high.active span {
            color: #b91c1c !important;
        }
        
        @keyframes pulse-border {
            0%, 100% { border-color: #ef4444; }
            50% { border-color: #fca5a5; }
        }

        .diagnosis-actions-container {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: stretch !important;
            gap: 1.25rem !important;
            margin-top: 2.5rem !important;
            padding-top: 2rem !important;
            border-top: 2px solid #f1f5f9 !important;
            flex-wrap: wrap !important;
        }

        .action-card {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 18px !important;
            padding: 1.25rem !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 1rem !important;
            transition: all 0.25s ease !important;
            flex: 1 !important;
            min-width: 260px !important;
            box-shadow: none !important;
        }

        .action-card:hover {
            border-color: #2563eb !important;
            background: #ffffff !important;
            box-shadow: 0 10px 25px rgba(37, 99, 235, 0.05) !important;
            transform: translateY(-4px) !important;
        }

        .action-icon {
            width: 50px !important;
            height: 50px !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02) !important;
            flex-shrink: 0 !important;
        }
        
        .action-card:hover .action-icon {
            border-color: #d0e3ff !important;
            background: #f0f7ff !important;
        }

        .action-icon i {
            color: #2563eb !important;
            font-size: 1.35rem !important;
        }

        .action-info {
            text-align: right !important;
            flex: 1 !important;
        }

        .action-info h4 {
            color: #0f172a !important;
            font-weight: 800 !important;
            font-size: 1.1rem !important;
            margin: 0 0 0.15rem 0 !important;
        }

        .action-info p {
            color: #64748b !important;
            font-size: 0.85rem !important;
            margin: 0 !important;
        }

        .action-btn {
            width: 42px !important;
            height: 42px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            border: none !important;
            font-size: 1rem !important;
            transition: all 0.2s ease !important;
            flex-shrink: 0 !important;
        }

        .action-btn.print-btn { background: #e2e8f0 !important; color: #334155 !important; }
        .action-btn.save-btn { background: #10b981 !important; color: #ffffff !important; }
        .action-btn.new-btn { background: #7c3aed !important; color: #ffffff !important; }

        .action-btn:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1) !important;
        }

        @media (max-width: 992px) {
            .diagnosis-chat-page .right-panel.full-width {
                width: 95% !important;
                padding: 1.5rem !important;
            }
            .severity-levels {
                flex-direction: column !important;
            }
            .diagnosis-actions-container {
                flex-direction: column !important;
                align-items: center !important;
            }
            .action-card {
                width: 100% !important;
                max-width: 300px !important;
            }
        }
    </style>

    <script>
      (function(){
        try{
          const a = window.DDS_AUTH || JSON.parse(localStorage.getItem("dds_auth")||"null");
          if (a && a.role === "admin"){
            const b = document.getElementById("admin-btn");
            if (b) b.style.display = "inline-flex";
          }
        }catch(e){}
      })();
    </script>

</body>
</html>
