// ===== GLOBAL VARIABLES =====
let currentQuestion = 0;
let userAnswers = [];
let activePart = null;
let chatActive = false;
let diagnosisComplete = false;

// ===== INITIALIZATION =====
function init() {
    console.log("🏥 3D Diagnosis System Diagnosis Page Starting...");
    
    // Check if user is logged in
    checkUserLogin();
    
    // Load selected body part
    loadSelectedPart();
    
    // Initialize chat
    initializeChat();
    
    // Update progress
    updateProgress(0, 'جاري بدء التشخيص...');
    
    console.log("✅ Diagnosis page initialized!");
}

function checkUserLogin() {
    // Support new auth key + legacy migration
    let savedAuth = localStorage.getItem('dds_auth');
    const legacy = localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user');

    if (!savedAuth && legacy) {
        try {
            const old = JSON.parse(legacy);
            savedAuth = JSON.stringify({
                username: old.username || 'مستخدم',
                role: 'user',
                isGuest: !!old.isGuest,
                loginTime: old.loginTime || new Date().toISOString()
            });
            localStorage.setItem('dds_auth', savedAuth);
        } catch (e) {}
    }

    if (!savedAuth) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(savedAuth);
    updatePatientInfo(user);

    // Optional: expose role for other scripts
    window.DDS_AUTH = user;
}

function updatePatientInfo(user) {
    document.getElementById('patient-name').textContent = user.username || 'زائر';
    
    if (user.gender) {
        document.getElementById('patient-gender').textContent = 
            user.gender === 'male' ? 'ذكر' : 'أنثى';
    }
    
    if (user.birthdate) {
        const birthYear = new Date(user.birthdate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        document.getElementById('patient-age').textContent = `${age} سنة`;
    }
}

function loadSelectedPart() {
    const savedPart = localStorage.getItem('selected_body_part');
    if (!savedPart) {
        showNotification('لم يتم اختيار منطقة التشخيص', 'error');
        setTimeout(() => window.location.href = 'selection.html', 2000);
        return;
    }
    
    const partData = JSON.parse(savedPart);
    activePart = partData.part;
    
    updatePartDisplay(activePart);
}

function updatePartDisplay(partName) {
    const arabicNames = {
        "Head": "الرأس",
        "Chest": "الصدر",
        "Belly": "البطن",
        "Right Arm": "الذراع الأيمن",
        "Left Arm": "الذراع الأيسر",
        "Right Leg": "القدم اليمنى",
        "Left Leg": "القدم اليسرى",
        "Back": "الظهر"
    };
    
    // Update all displays
    document.getElementById('diagnosing-part').textContent = arabicNames[partName];
    document.getElementById('diagnosis-part-ar').textContent = arabicNames[partName];
    document.getElementById('diagnosis-part-en').textContent = partName;
    
    // Update icon
    const iconElement = document.getElementById('diagnosis-part-icon');
    const iconClass = getIconClass(partName);
    iconElement.innerHTML = `<i class="${iconClass}"></i>`;
    setIconColor(iconElement, partName);
}

function getIconClass(partName) {
    const icons = {
        "Head": "fas fa-brain",
        "Chest": "fas fa-heart",
        "Belly": "fas fa-stomach",
        "Right Arm": "fas fa-hand-paper",
        "Left Arm": "fas fa-hand-paper",
        "Right Leg": "fas fa-walking",
        "Left Leg": "fas fa-walking",
        "Back": "fas fa-user-injured"
    };
    return icons[partName] || "fas fa-question-circle";
}

function setIconColor(iconElement, partName) {
    const colors = {
        "Head": "linear-gradient(135deg, #f59e0b, #fbbf24)",
        "Chest": "linear-gradient(135deg, #ef4444, #f87171)",
        "Belly": "linear-gradient(135deg, #10b981, #34d399)",
        "Right Arm": "linear-gradient(135deg, #3b82f6, #60a5fa)",
        "Left Arm": "linear-gradient(135deg, #8b5cf6, #a78bfa)",
        "Right Leg": "linear-gradient(135deg, #f97316, #fb923c)",
        "Left Leg": "linear-gradient(135deg, #ec4899, #f472b6)",
        "Back": "linear-gradient(135deg, #6b7280, #9ca3af)"
    };
    
    iconElement.style.background = colors[partName] || colors["Head"];
}

// ===== CHAT SYSTEM =====
function initializeChat() {
    // Hide welcome message after 2 seconds
    setTimeout(() => {
        document.getElementById('chat-welcome').style.display = 'none';
        startChat();
    }, 2000);
}

function startChat() {
    chatActive = true;
    
    // Add welcome message
    const arabicNames = {
        "Head": "الرأس",
        "Chest": "الصدر",
        "Belly": "البطن",
        "Right Arm": "الذراع الأيمن",
        "Left Arm": "الذراع الأيسر",
        "Right Leg": "القدم اليمنى",
        "Left Leg": "القدم اليسرى",
        "Back": "الظهر"
    };
    
    addMessage(`بدأ التشخيص لمنطقة ${arabicNames[activePart]}. سأقوم بطرح بعض الأسئلة لفهم حالتك بشكل أفضل.`, 'ai');
    
    // Start asking questions after delay
    setTimeout(() => askNextQuestion(), 1500);
}

function askNextQuestion() {
    if (!chatActive || diagnosisComplete) return;
    
    const questions = getQuestionsForPart(activePart);
    
    if (currentQuestion < questions.length) {
        const question = questions[currentQuestion];
        addMessage(question, 'ai');
        
        // Update progress
        const progress = ((currentQuestion + 1) / (questions.length + 1)) * 100;
        updateProgress(progress, `سؤال ${currentQuestion + 1} من ${questions.length}`);
        
        currentQuestion++;
    } else {
        // All questions answered
        setTimeout(() => analyzeAnswers(), 1000);
    }
}

function getQuestionsForPart(partName) {
    const questions = {
        "Head": [
            "هل الألم مستمر أم يأتي على فترات؟",
            "هل يصاحب الألم دوخة أو غثيان؟",
            "هل يزداد الألم مع الضوء أو الأصوات العالية؟",
            "منذ متى وأنت تعاني من هذا الألم؟",
            "هل هناك تاريخ عائلي للصداع النصفي؟"
        ],
        "Chest": [
            "هل الألم حاد أم ضاغط؟",
            "هل ينتشر الألم إلى الذراع أو الفك؟",
            "هل يصاحبه ضيق في التنفس أو تعرق؟",
            "هل يزداد مع الحركة أو الراحة؟",
            "هل لديك تاريخ مع أمراض القلب؟"
        ],
        "Belly": [
            "هل الألم مستمر أم متقطع؟",
            "هل يصاحبه غثيان أو قيء؟",
            "هل هناك تغير في عادات الإخراج؟",
            "هل يزداد الألم بعد الأكل؟",
            "هل تناولت أطعمة غير معتادة مؤخراً؟"
        ],
        "Right Arm": [
            "هل الألم في المفصل أم العضلة؟",
            "هل هناك تورم أو احمرار في المنطقة؟",
            "هل حدثت إصابة مؤخراً؟",
            "هل يزداد الألم مع الحركة؟",
            "هل هناك تنميل أو وخز في الأصابع؟"
        ],
        "Left Arm": [
            "هل الألم في المفصل أم العضلة؟",
            "هل هناك تورم أو احمرار في المنطقة؟",
            "هل حدثت إصابة مؤخراً؟",
            "هل يزداد الألم مع الحركة؟",
            "هل هناك تنميل أو وخز في الأصابع؟"
        ],
        "Right Leg": [
            "هل الألم في الركبة أم القدم أم الفخذ؟",
            "هل هناك صعوبة في المشي أو الوقوف؟",
            "هل حدث سقوط أو إصابة مؤخراً؟",
            "هل هناك تورم في المنطقة؟",
            "هل يزداد الألم مع الحركة؟"
                ],
        "Left Leg": [
            "هل الألم في الركبة أم القدم أم الفخذ؟",
            "هل هناك صعوبة في المشي أو الوقوف؟",
            "هل حدث سقوط أو إصابة مؤخراً؟",
            "هل هناك تورم في المنطقة؟",
            "هل يزداد الألم مع الحركة؟"
        ],
        "Back": [
            "هل الألم في أعلى الظهر أم أسفله؟",
            "هل يمتد الألم إلى الساق؟",
            "هل هناك تنميل أو خدر؟",
            "هل زاد الألم بعد حمل شيء ثقيل؟",
            "هل يخف مع الراحة أم يزداد؟"
        ]
    };
    
    return questions[partName] || [
        "أخبرني أكثر عن الألم...",
        "هل الألم حاد أم خفيف؟",
        "منذ متى وأنت تشعر بهذا الألم؟",
        "هل هناك أعراض أخرى مصاحبة؟",
        "هل هناك شيء يخفف الألم؟"
    ];
}

function sendChatMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    
    if (text === '' || !chatActive || diagnosisComplete) return;
    
    // Add user message
    addMessage(text, 'user');
    userAnswers.push(text);
    
    // Add to symptoms list
    addSymptom(text);
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Ask next question after delay
    setTimeout(() => {
        removeTypingIndicator();
        askNextQuestion();
    }, 1000);
}

function answerQuick(answer) {
    if (!chatActive || diagnosisComplete) return;
    
    addMessage(answer, 'user');
    userAnswers.push(answer);
    
    // Add to symptoms list
    addSymptom(answer);
    
    showTypingIndicator();
    
    setTimeout(() => {
        removeTypingIndicator();
        askNextQuestion();
    }, 800);
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.textContent = text;
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

function addSymptom(symptom) {
    const symptomsList = document.getElementById('symptoms-list');
    
    // Limit to 5 symptoms
    if (symptomsList.children.length >= 5) {
        symptomsList.removeChild(symptomsList.firstChild);
    }
    
    const symptomItem = document.createElement('div');
    symptomItem.className = 'symptom-item';
    symptomItem.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${symptom}</span>
    `;
    
    symptomsList.appendChild(symptomItem);
}

// ===== DIAGNOSIS LOGIC =====
function analyzeAnswers() {
    addMessage("جاري تحليل إجاباتك وتقديم التشخيص المناسب...", 'ai');
    updateProgress(95, 'جاري تحليل الإجابات...');
    
    setTimeout(() => {
        const diagnosis = generateDiagnosis(activePart, userAnswers);
        showDiagnosis(diagnosis);
        updateProgress(100, 'اكتمل التشخيص');
        diagnosisComplete = true;
    }, 2000);
}

function generateDiagnosis(part, answers) {
    const joinedAnswers = answers.join(' ').toLowerCase();
    
    // Define diagnosis templates
    const diagnoses = {
        "Head": {
            mild: {
                ar: "الأعراض تشير إلى صداع التوتر. حاول تقليل الضغط النفسي، وتجنب الجلوس الطويل أمام الشاشات، واحصل على قسط كافٍ من النوم.",
                en: "Symptoms suggest tension headache. Try reducing stress, avoid prolonged screen time, and get adequate sleep.",
                severity: "low",
                recommendations: ["استرح في مكان هادئ", "اشرب كمية كافية من الماء", "تجنب الضوضاء والأضواء الساطعة", "خذ حماماً دافئاً", "مارس تمارين الاسترخاء"]
            },
            moderate: {
                ar: "قد يكون صداع نصفي. تجنب المثيرات مثل الأضواء الساطعة والضوضاء العالية. الراحة في غرفة مظلمة قد تساعد.",
                en: "Possible migraine. Avoid triggers like bright lights and loud noises. Resting in a dark room may help.",
                severity: "medium",
                recommendations: ["استرح في غرفة مظلمة", "تناول مسكنات الألم الخفيفة", "تجنب الكافيين", "ضع كمادات باردة على الجبين", "راجع الطبيب إذا استمر الألم"]
            },
            severe: {
                ar: "الصداع الشديد المفاجئ يحتاج تقييم طبي فوري. راجع الطبيب خاصة إذا صاحبه غثيان أو تشوش في الرؤية.",
                en: "Sudden severe headache requires immediate medical evaluation. See a doctor especially if accompanied by nausea or blurred vision.",
                severity: "high",
                recommendations: ["اذهب إلى أقرب مركز طوارئ", "لا تقم بالقيادة", "اطلب المساعدة فوراً", "تجنب تناول أي أدوية دون استشارة طبية", "ابق في وضعية مريحة"]
            }
        },
        "Chest": {
            mild: {
                ar: "قد يكون ألم عضلي أو التهاب في الغضروف الضلعي. الراحة والكمادات الدافئة قد تساعد.",
                en: "May be muscle pain or costochondritis. Rest and warm compresses may help.",
                severity: "low",
                recommendations: ["خذ قسطاً من الراحة", "استخدم كمادات دافئة", "تجنب الأنشطة الشاقة", "مارس تمارين التنفس العميق", "راقب الألم"]
            },
            moderate: {
                ar: "آلام الصدر المتوسطة تحتاج مراقبة. إذا زادت أو صاحبها ضيق تنفس، راجع الطبيب.",
                en: "Moderate chest pain needs monitoring. If it increases or is accompanied by shortness of breath, see a doctor.",
                severity: "medium",
                recommendations: ["راجع الطبيب في أقرب وقت", "تجنب المجهود البدني", "راقب ضغط الدم", "تناول الأدوية الموصوفة", "احصل على قسط كاف من الراحة"]
            },
            severe: {
                ar: "آلام الصدر الشديدة مع ضيق التنفس تتطلب رعاية طبية فورية. توجه إلى أقرب مركز طوارئ.",
                en: "Severe chest pain with shortness of breath requires immediate medical attention. Go to the nearest emergency center.",
                severity: "high",
                recommendations: ["اتصل بالإسعاف فوراً (123)", "امضغ قرص أسبرين إذا كان متاحاً", "ابق في وضعية الجلوس", "لا تقم بأي مجهود", "انتظر المساعدة الطبية"]
            }
        },
        // ... بقية التشخيصات بنفس النمط
    };
    
    // Determine severity based on answers
    let severity = "mild";
    if (joinedAnswers.includes("حاد") || joinedAnswers.includes("شديد") || joinedAnswers.includes("مستمر")) {
        severity = "severe";
    } else if (joinedAnswers.includes("متوسط") || joinedAnswers.includes("يزداد")) {
        severity = "moderate";
    }
    
    // Get diagnosis (استخدم قاعدة بيانات حقيقية هنا)
    const partDiagnoses = diagnoses[part] || diagnoses["Head"];
    const diagnosis = partDiagnoses[severity] || partDiagnoses["mild"];
    
    return {
        part: part,
        diagnosisAr: diagnosis.ar,
        diagnosisEn: diagnosis.en,
        severity: diagnosis.severity,
        recommendations: diagnosis.recommendations,
        date: new Date().toLocaleDateString('ar-SA'),
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
    };
}

function showDiagnosis(diagnosis) {
    // Update diagnosis display
    document.getElementById('diagnosis-text-ar').textContent = diagnosis.diagnosisAr;
    document.getElementById('diagnosis-text-en').textContent = diagnosis.diagnosisEn;
    
    // Update recommendations
    const recommendationsList = document.getElementById('recommendations-list');
    recommendationsList.innerHTML = diagnosis.recommendations.map(rec => `<li>${rec}</li>`).join('');
    
    // Set severity indicator
    document.querySelectorAll('.severity-level').forEach(level => {
        level.classList.remove('active');
        if (level.getAttribute('data-level') === diagnosis.severity) {
            level.classList.add('active');
        }
    });
    
    // Show emergency alert if severe
    if (diagnosis.severity === 'high') {
        document.getElementById('emergency-alert').style.display = 'block';
    }
    
    // Hide placeholder and show results
    document.getElementById('diagnosis-summary').style.display = 'none';
    document.getElementById('diagnosis-details').style.display = 'block';
    
    // Update result status
    document.getElementById('result-status').textContent = 'مكتمل';
    document.getElementById('result-status').style.color = '#10b981';
    
    // Save diagnosis to history
    saveDiagnosisToHistory(diagnosis);
    
    // Show success notification
    showNotification('تم إكمال التشخيص بنجاح!', 'success');
}

// ===== PROGRESS FUNCTIONS =====
function updateProgress(percent, status) {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressStatus.textContent = status || '';
}

// ===== NAVIGATION FUNCTIONS =====
function backToSelection() {
    if (confirm('هل تريد العودة إلى صفحة اختيار المنطقة؟ سيتم فقد التقدم الحالي.')) {
        window.location.href = 'selection.html';
    }
}

function newDiagnosis() {
    if (confirm('هل تريد بدء تشخيص جديد؟')) {
        // Clear current session
        localStorage.removeItem('selected_body_part');
        window.location.href = 'selection.html';
    }
}

function pauseDiagnosis() {
    chatActive = !chatActive;
    const status = chatActive ? 'مستأنف' : 'متوقف';
    showNotification(`تم ${status} التشخيص`, 'info');
}

function restartDiagnosis() {
    if (confirm('هل تريد إعادة التشخيص من البداية؟')) {
        // Reset variables
        currentQuestion = 0;
        userAnswers = [];
        diagnosisComplete = false;
        
        // Clear chat
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        // Clear symptoms
        document.getElementById('symptoms-list').innerHTML = '';
        
        // Reset UI
        document.getElementById('diagnosis-summary').style.display = 'block';
        document.getElementById('diagnosis-details').style.display = 'none';
        document.getElementById('emergency-alert').style.display = 'none';
        
        // Reset progress
        updateProgress(0, 'جاري إعادة التشخيص...');
        
        // Start new chat
        setTimeout(() => {
            startChat();
        }, 1000);
    }
}

// ===== DIAGNOSIS ACTIONS =====
function printDiagnosis() {
    if (!diagnosisComplete) {
        showNotification('لم يكتمل التشخيص بعد', 'error');
        return;
    }
    
    window.print();
    showNotification('جاري الطباعة...', 'info');
}

function saveDiagnosis() {
    if (!diagnosisComplete) {
        showNotification('لم يكتمل التشخيص بعد', 'error');
        return;
    }
    
    // Save to localStorage
    const diagnosisData = {
        part: activePart,
        answers: userAnswers,
        timestamp: new Date().toISOString()
    };
    
    // Get existing history
    let history = JSON.parse(localStorage.getItem('diagnosis_history') || '[]');
    history.push(diagnosisData);
    
    // Keep only last 10 diagnoses
    if (history.length > 10) {
        history = history.slice(-10);
    }
    
    localStorage.setItem('diagnosis_history', JSON.stringify(history));
    showNotification('تم حفظ التشخيص بنجاح', 'success');
}

function saveDiagnosisToHistory(diagnosis) {
    // Get existing history
    let history = JSON.parse(localStorage.getItem('mediscan_history') || '[]');
    
    // Add new diagnosis
    history.push({
        ...diagnosis,
        id: Date.now(),
        user: JSON.parse(localStorage.getItem('dds_auth') || localStorage.getItem('dds_auth') || localStorage.getItem('mediscan_user')).username || 'زائر'
    });
    
    // Keep only last 20 diagnoses
    if (history.length > 20) {
        history = history.slice(-20);
    }
    
    localStorage.setItem('mediscan_history', JSON.stringify(history));
}

function shareDiagnosis() {
    if (!diagnosisComplete) {
        showNotification('لم يكتمل التشخيص بعد', 'error');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: `تشخيص 3D Diagnosis System - ${activePart}`,
            text: `تم تشخيص حالة ${activePart}. التشخيص: ${document.getElementById('diagnosis-text-ar').textContent.substring(0, 100)}...`,
            url: window.location.href
        })
        .then(() => showNotification('تم المشاركة بنجاح', 'success'))
        .catch(() => showNotification('تم إلغاء المشاركة', 'info'));
    } else {
        // Fallback: copy to clipboard
        const textToCopy = `تشخيص 3D Diagnosis System\nالمنطقة: ${activePart}\nالتشخيص: ${document.getElementById('diagnosis-text-ar').textContent}\nالتوصيات: ${document.getElementById('diagnosis-text-en').textContent}`;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => showNotification('تم نسخ التشخيص للحافظة', 'success'))
            .catch(() => showNotification('تعذر نسخ التشخيص', 'error'));
    }
}

function callEmergency() {
    if (confirm('هل تريد الاتصال بالطوارئ؟ رقم الطوارئ: 123')) {
        // In a real app, this would initiate a phone call
        showNotification('جاري الاتصال بالطوارئ...', 'info');
        
        // Simulate emergency call
        setTimeout(() => {
            showNotification('تم الاتصال بالطوارئ، يرجى البقاء في مكانك', 'success');
        }, 2000);
    }
}

function startVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;
        
        recognition.start();
        
        showNotification('جاري الاستماع... تحدث الآن', 'info');
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('user-input').value = transcript;
            showNotification(`تم التعرف على: ${transcript}`, 'success');
        };
        
        recognition.onerror = function(event) {
            showNotification('حدث خطأ في التعرف الصوتي', 'error');
        };
    } else {
        showNotification('المتصفح لا يدعم الإدخال الصوتي', 'error');
    }
}

function toggleHelp() {
    const modal = document.getElementById('help-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

// ===== UTILITY FUNCTIONS =====
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
    }, 3000);
}

// ===== INITIALIZE =====
window.addEventListener('DOMContentLoaded', () => {
    console.log("🏥 3D Diagnosis System Diagnosis Page Starting...");
    init();
    
    // Add notification styles
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
        
        .notification-success i { color: #10b981; }
        .notification-info i { color: #3b82f6; }
        .notification-error i { color: #ef4444; }
        
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        
        .typing-dots span {
            width: 8px;
            height: 8px;
            background: #6b7280;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }
        
        .severity-level.active {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-width: 3px;
        }
        
        .chat-message {
            max-width: 85%;
            padding: 0.875rem 1rem;
            border-radius: 0.75rem;
            animation: fadeIn 0.3s ease;
            margin-bottom: 0.5rem;
        }
        
        .chat-message.ai {
            background: white;
            border: 1px solid #e5e7eb;
            align-self: flex-start;
            border-top-right-radius: 4px;
        }
        
        .chat-message.user {
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            align-self: flex-end;
            border-top-left-radius: 4px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // Show welcome message
    setTimeout(() => {
        showNotification('مرحباً! سيبدأ التشخيص التفاعلي قريباً', 'info');
    }, 500);
});