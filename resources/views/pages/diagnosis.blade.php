<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Diagnosis System</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
                <span class="logo-sub">التشخيص الطبي الذكي</span>
            </div>
            
            <div class="nav-controls">
                <div class="diagnosis-info">
                    <i class="fas fa-user-md"></i>
                    <span id="diagnosing-part">الرأس</span>
                </div>
                <button class="nav-btn" onclick="toggleHelp()">
                    <i class="fas fa-question-circle"></i>
                    <span>مساعدة</span>
                </button>
                <button class="nav-btn" onclick="backToSelection()">
                    <i class="fas fa-arrow-right"></i>
                    <span>عودة للاختيار</span>
                </button>
            </div>
        </div>
    </nav>

    <div class="main-container diagnosis-page">
        <div class="left-panel">
            <div class="panel-header">
                <h2><i class="fas fa-user-circle"></i> معلومات المريض</h2>
            </div>
            
            <div class="patient-info">
                <div class="patient-avatar">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="patient-details">
                    <h3 id="patient-name">زائر</h3>
                    <div class="patient-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span id="patient-age">30 سنة</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-venus-mars"></i>
                            <span id="patient-gender">ذكر</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="selected-part-info">
                <div class="part-header">
                    <h3><i class="fas fa-crosshairs"></i> المنطقة المشخصة</h3>
                </div>
                <div class="part-display">
                    <div class="part-icon-large" id="diagnosis-part-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="part-names">
                        <span class="part-ar-large" id="diagnosis-part-ar">الرأس</span>
                        <span class="part-en-large" id="diagnosis-part-en">Head</span>
                    </div>
                </div>
            </div>
            
            <div class="progress-container">
                <h3><i class="fas fa-chart-line"></i> تقدم التشخيص</h3>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-text">
                    <span id="progress-percent">0%</span>
                    <span id="progress-status">جاري بدء التشخيص...</span>
                </div>
            </div>
            
            <div class="symptoms-summary">
                <h3><i class="fas fa-exclamation-circle"></i> الأعراض المبلغ عنها</h3>
                <div class="symptoms-list" id="symptoms-list">
                    <div class="symptom-item">
                        <i class="fas fa-check-circle"></i>
                        <span>الصداع</span>
                    </div>
                    </div>
            </div>
            
            <div class="quick-actions">
                <button class="action-btn" onclick="pauseDiagnosis()">
                    <i class="fas fa-pause"></i>
                    <span>إيقاف مؤقت</span>
                </button>
                <button class="action-btn" onclick="restartDiagnosis()">
                    <i class="fas fa-redo"></i>
                    <span>إعادة التشخيص</span>
                </button>
            </div>
        </div>

        <div class="center-panel">
            <div class="panel-header">
                <h2><i class="fas fa-robot"></i> المساعد الطبي الذكي</h2>
                <div class="chat-status">
                    <div class="status-indicator online"></div>
                    <span>متصل</span>
                </div>
            </div>
            
            <div class="chat-container">
                <div class="chat-welcome" id="chat-welcome">
                    <div class="welcome-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>مرحباً! أنا مساعدك الطبي الذكي</h3>
                    <p>سأقوم بطرح بعض الأسئلة لفهم حالتك بشكل أفضل.</p>
                    <p class="welcome-sub">أجب بصراحة على جميع الأسئلة للحصول على تشخيص دقيق.</p>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    </div>
                
                <div class="quick-questions" id="quick-questions">
                    <button class="quick-question" onclick="answerQuick('مستمر')">
                        <i class="fas fa-clock"></i>
                        <span>مستمر</span>
                    </button>
                    <button class="quick-question" onclick="answerQuick('متقطع')">
                        <i class="fas fa-history"></i>
                        <span>متقطع</span>
                    </button>
                    <button class="quick-question" onclick="answerQuick('حاد')">
                        <i class="fas fa-bolt"></i>
                        <span>حاد</span>
                    </button>
                    <button class="quick-question" onclick="answerQuick('خفيف')">
                        <i class="fas fa-feather"></i>
                        <span>خفيف</span>
                    </button>
                    <button class="quick-question" onclick="answerQuick('متوسط')">
                        <i class="fas fa-balance-scale"></i>
                        <span>متوسط</span>
                    </button>
                </div>
                
                <div class="chat-input-container">
                    <div class="input-group">
                        <input type="text" id="user-input" 
                               placeholder="اكتب إجابتك هنا..." 
                               onkeypress="if(event.key === 'Enter') sendChatMessage()">
                        <button class="send-btn" onclick="sendChatMessage()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="voice-btn" onclick="startVoiceInput()">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <div class="input-hint">
                        <i class="fas fa-info-circle"></i>
                        <span>اضغط Enter للإرسال أو انقر على أحد الخيارات السريعة</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="right-panel">
            <div class="panel-header">
                <h2><i class="fas fa-file-medical-alt"></i> نتيجة التشخيص</h2>
                <div class="result-status">
                    <span id="result-status">في الانتظار...</span>
                </div>
            </div>
            
            <div class="results-container">
                <div class="diagnosis-summary" id="diagnosis-summary">
                    <div class="summary-placeholder">
                        <i class="fas fa-stethoscope"></i>
                        <h3>جاري التشخيص...</h3>
                        <p>سيظهر التشخيص هنا بعد إتمام الأسئلة</p>
                    </div>
                </div>
                
                <div class="diagnosis-details" id="diagnosis-details" style="display: none;">
                    <div class="diagnosis-result">
                        <h3>التشخيص:</h3>
                        <p id="diagnosis-text-ar">""</p>
                        <h3>التوصيات:</h3>
                        <p id="diagnosis-text-en">""</p>
                    </div>
                    
                    <div class="severity-indicator">
                        <h3>شدة الحالة:</h3>
                        <div class="severity-levels">
                            <div class="severity-level low" data-level="low">
                                <i class="fas fa-smile"></i>
                                <div class="level-info">
                                    <span class="level-name">خفيفة</span>
                                    <span class="level-desc">لا تتطلب رعاية طبية فورية</span>
                                </div>
                            </div>
                            <div class="severity-level medium" data-level="medium">
                                <i class="fas fa-meh"></i>
                                <div class="level-info">
                                    <span class="level-name">متوسطة</span>
                                    <span class="level-desc">تستدعي زيارة الطبيب</span>
                                </div>
                            </div>
                            <div class="severity-level high" data-level="high">
                                <i class="fas fa-frown"></i>
                                <div class="level-info">
                                    <span class="level-name">خطيرة</span>
                                    <span class="level-desc">تتطلب رعاية طبية فورية</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recommendations">
                        <h3><i class="fas fa-clipboard-list"></i> خطوات العناية:</h3>
                        <ul id="recommendations-list">
                            <li>استرح في مكان هادئ</li>
                            <li>اشرب كمية كافية من الماء</li>
                            <li>تجنب الضوضاء والأضواء الساطعة</li>
                        </ul>
                    </div>
                    
                    <div class="emergency-alert" id="emergency-alert" style="display: none;">
                        <div class="alert-header">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>تحذير: حالة طارئة</h3>
                        </div>
                        <p>يجب التوجه إلى أقرب مركز طبي فوراً!</p>
                        <button class="emergency-btn" onclick="callEmergency()">
                            <i class="fas fa-phone"></i>
                            <span>الاتصال بالطوارئ</span>
                        </button>
                    </div>
                </div>
                
                <div class="diagnosis-actions">
                    <button class="action-btn print-btn" onclick="printDiagnosis()">
                        <i class="fas fa-print"></i>
                        <span>طباعة</span>
                    </button>
                    <button class="action-btn save-btn" onclick="saveDiagnosis()">
                        <i class="fas fa-save"></i>
                        <span>حفظ</span>
                    </button>
                    <button class="action-btn share-btn" onclick="shareDiagnosis()">
                        <i class="fas fa-share-alt"></i>
                        <span>مشاركة</span>
                    </button>
                    <button class="action-btn new-btn" onclick="newDiagnosis()">
                        <i class="fas fa-plus-circle"></i>
                        <span>تشخيص جديد</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="help-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-question-circle"></i> دليل التشخيص</h2>
                <span class="close" onclick="toggleHelp()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="help-section">
                    <h3><i class="fas fa-comment-medical"></i> كيفية الإجابة:</h3>
                    <ol>
                        <li>أجب بصراحة ودقة على جميع الأسئلة</li>
                        <li>استخدم الخيارات السريعة لتسريع العملية</li>
                        <li>يمكنك الكتابة يدوياً للإجابات التفصيلية</li>
                        <li>استخدم ميزة الإدخال الصوتي إذا أردت</li>
                    </ol>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-file-medical-alt"></i> فهم النتائج:</h3>
                    <ul>
                        <li>التشخيص الأولي يعتمد على المعلومات المقدمة</li>
                        <li>شدة الحالة تساعد في تحديد أولوية العلاج</li>
                        <li>التوصيات هي إرشادات عامة للعناية</li>
                        <li>احفظ أو اطبع النتيجة للمراجعة الطبية</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-exclamation-triangle"></i> ملاحظات هامة:</h3>
                    <ul>
                        <li>هذا التشخيص هو أولي وليس نهائياً</li>
                        <li>في حالة الأعراض الخطيرة، راجع الطبيب فوراً</li>
                        <li>لا تتجاهل الأعراض المستمرة أو المتزايدة</li>
                        <li>احتفظ بسجل التشخيصات للمراجعة المستقبلية</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>3D Diagnosis System</h4>
                <p>نظام التشخيص الطبي ثلاثي الأبعاد الذكي</p>
                <p class="footer-version">الإصدار 2.1 | تحديث: يناير 2024</p>
            </div>
            
            <div class="footer-section">
                <h4>إخلاء مسؤولية</h4>
                <p>هذا النظام هو أداة مساعدة للتشخيص الأولي ولا يغني عن استشارة الطبيب المختص.</p>
            </div>
            
            <div class="footer-section">
                <h4>اتصل بنا</h4>
                <div class="footer-contacts">
                    <a href="#"><i class="fas fa-envelope"></i> support@mediscan.com</a>
                    <a href="#"><i class="fas fa-phone"></i> +966 123 456 789</a>
                </div>
            </div>
        </div>
        
        <div class="footer-bottom">
            <p>© 2024 3D Diagnosis System. جميع الحقوق محفوظة.</p>
            <div class="footer-links">
                <a href="#">الشروط والأحكام</a>
                <a href="#">سياسة الخصوصية</a>
            </div>
        </div>
    </footer>

    <script src="diagnosis.js"></script>
</body>
</html>