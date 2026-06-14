<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3D Diagnosis System - لوحة الأدمن</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('style.css') }}">
</head>
<body class="admin-page">
  <script>
    (function(){
      // الحل هنا: نأخذ بيانات الـ Auth القادمة من السيرفر مباشرة لضمان عدم حدوث تضارب
      const serverAuth = @json($ddsBootstrap['auth'] ?? null);
      
      if (!serverAuth){ 
        window.location.href = "{{ route('login') }}"; 
        return; 
      }
      
      if (serverAuth.role !== "admin"){ 
        window.location.href = "{{ route('model') }}"; 
        return; 
      }
      
      // تحديث الـ localStorage تلقائياً ليتزامن مع السيرفر دون طرد المستخدم
      localStorage.setItem("dds_auth", JSON.stringify(serverAuth));
      window.DDS_AUTH = serverAuth;
    })();
  </script>

  <nav class="top-nav">
    <div class="nav-container">
      <div class="logo">
        <i class="fas fa-stethoscope"></i>
        <h1>3D Diagnosis <span class="logo-highlight">System</span></h1>
        <span class="logo-sub" id="admin-greeting"></span>
      </div>
      <div class="nav-controls">
        <button class="nav-btn" type="button" onclick="window.location.href='{{ route('model') }}'">
          <i class="fas fa-arrow-right"></i><span>الرجوع</span>
        </button>
        <button class="nav-btn" type="button" onclick="logout()">
          <i class="fas fa-sign-out-alt"></i><span>تسجيل خروج</span>
        </button>
      </div>
    </div>
  </nav>

  <main class="page-container" style="max-width:1100px;margin:0 auto;padding:1.25rem;">
    <section class="content-card" style="padding:1.35rem;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div>
          <h2 style="margin-bottom:0.35rem;">لوحة الأدمن</h2>
          <p style="margin:0;">إدارة بيانات المشروع (Front-End). يمكنك تحديث عرض المستخدمين/الأدمنز أو تصفير بيانات التخزين.</p>
        </div>

        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <button class="primary-btn" type="button" onclick="resetAll()">
            <i class="fas fa-trash"></i> تصفير كل البيانات
          </button>
          <button class="secondary-btn" type="button" onclick="exportData()">
            <i class="fas fa-file-export"></i> تصدير البيانات (JSON)
          </button>
        </div>
      </div>

      <div class="stat-row">
        <div class="content-card stat">
          <div>
            <span>عدد المستخدمين</span><br>
            <strong id="users-count">0</strong>
          </div>
          <i class="fas fa-users"></i>
        </div>
        <div class="content-card stat">
          <div>
            <span>عدد الأدمنز</span><br>
            <strong id="admins-count">0</strong>
          </div>
          <i class="fas fa-user-shield"></i>
        </div>
        <div class="content-card stat">
          <div>
            <span>حالة التخزين</span><br>
            <strong id="storage-state">جاهز</strong>
          </div>
          <i class="fas fa-database"></i>
        </div>
      </div>

      <div class="content-card" style="margin-top: 1rem; padding: 1.25rem;">
        <h3 style="margin-bottom: 0.65rem;"><i class="fas fa-robot"></i> إعدادات الذكاء الاصطناعي (Gemini API)</h3>
        <p style="font-size: 0.9rem; margin-top: 0; margin-bottom: 1rem;">
          أدخل مفتاح Gemini API الخاص بك لتفعيل التشخيص الذكي المباشر. إذا لم يكن المفتاح متوفراً، سيتراجع النظام تلقائياً للتشخيص المحلي الافتراضي.
        </p>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <div style="position: relative; flex-grow: 1; min-width: 250px;">
            <input type="password" id="gemini-key-input" placeholder="أدخل مفتاح Gemini API (مثال: AIzaSy...)" 
                   style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--gray-300); font-family: monospace; font-size: 0.9rem; outline: none; transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='var(--primary-blue)'" onblur="this.style.borderColor='var(--gray-300)'">
            <button type="button" onclick="toggleKeyVisibility()" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--gray-500);">
              <i class="fas fa-eye" id="toggle-eye-icon"></i>
            </button>
          </div>
          <button class="primary-btn" type="button" onclick="saveGeminiKey()" style="background: var(--primary-blue); padding: 0.65rem 1.25rem;">
            <i class="fas fa-save"></i> حفظ المفتاح
          </button>
          <button class="secondary-btn" type="button" onclick="deleteGeminiKey()" style="padding: 0.65rem 1.25rem;">
            <i class="fas fa-trash-alt"></i> حذف
          </button>
          <button class="secondary-btn" type="button" id="test-key-btn" onclick="testGeminiConnection()" style="padding: 0.65rem 1.25rem; background: var(--gray-100); color: var(--gray-800);">
            <i class="fas fa-plug"></i> اختبار الاتصال
          </button>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>حالة الذكاء الاصطناعي:</span>
          <strong id="gemini-status" style="color: var(--gray-600);">جاري التحقق...</strong>
        </div>
      </div>

      <div class="two-columns" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
        <div class="content-card" style="padding:1rem;">
          <h3 style="margin-bottom:0.65rem;"><i class="fas fa-users"></i> المستخدمين</h3>
          <div id="users-list" style="line-height:1.95;"></div>
        </div>

        <div class="content-card" style="padding:1rem;">
          <h3 style="margin-bottom:0.65rem;"><i class="fas fa-user-shield"></i> الأدمنز</h3>
          <div id="admins-list" style="line-height:1.95;"></div>
        </div>
      </div>

      <p style="margin-top:1rem;font-size:0.95rem;">
        <i class="fas fa-triangle-exclamation" style="color:var(--accent-gold);"></i>
        ملاحظة: هذا النظام تجريبي (Front-End) والتخزين يتم داخل المتصفح (LocalStorage).
      </p>
    </section>
  </main>

  <script>
    function safeParse(key, fallback){
      try{ return JSON.parse(localStorage.getItem(key) || fallback); }catch(e){ return JSON.parse(fallback); }
    }

    function render(){
      const auth = window.DDS_AUTH;
      if(auth) {
        document.getElementById("admin-greeting").textContent = `مرحباً بك ${auth.username} (أدمن)`;
      }

      const users = safeParse("dds_users","[]");
      const admins = safeParse("dds_admins","[]");

      document.getElementById("users-count").textContent = users.length;
      document.getElementById("admins-count").textContent = admins.length;
      document.getElementById("storage-state").textContent = "ممتاز";

      document.getElementById("users-list").innerHTML =
        users.length ? users.map((u,i)=>`<div>👤 ${u.username} <span style="color:var(--gray-500)">(${new Date(u.createdAt).toLocaleString('ar-EG')})</span></div>`).join("") :
        "<div style='color:var(--gray-500)'>لا يوجد مستخدمين مسجلين بعد.</div>";

      document.getElementById("admins-list").innerHTML =
        admins.length ? admins.map((u,i)=>`<div>👤 ${u.username} <span style="color:var(--gray-500)">(${new Date(u.createdAt).toLocaleString('ar-EG')})</span></div>`).join("") :
        "<div style='color:var(--gray-500)'>لا يوجد أدمنز مسجلين بعد.</div>";
    }

    function logout(){
      localStorage.removeItem("dds_auth");
      // التوجيه لـ Route الـ logout الفعلي في لارافيل بدلاً من ملف فلات
      window.location.href = "{{ route('logout') }}";
    }

    function resetAll(){
      if (!confirm("هل أنت متأكد؟ سيتم حذف جميع بيانات التخزين المحلية.")) return;
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith("dds_") || k.startsWith("mediscan_")) localStorage.removeItem(k);
      });
      alert("تم تصفير البيانات.");
      window.location.href = "{{ route('login') }}";
    }

    function exportData(){
      const payload = {
        exportedAt: new Date().toISOString(),
        dds_users: safeParse("dds_users","[]"),
        dds_admins: safeParse("dds_admins","[]"),
        dds_auth: safeParse("dds_auth","null")
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "3d-diagnosis-system-data.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    function toggleKeyVisibility() {
      const input = document.getElementById("gemini-key-input");
      const icon = document.getElementById("toggle-eye-icon");
      if (input.type === "password") {
        input.type = "text";
        icon.className = "fas fa-eye-slash";
      } else {
        input.type = "password";
        icon.className = "fas fa-eye";
      }
    }

    function saveGeminiKey() {
      const key = document.getElementById("gemini-key-input").value.trim();
      if (!key) {
        alert("من فضلك أدخل مفتاح صالح.");
        return;
      }
      localStorage.setItem("dds_gemini_api_key", key);
      alert("تم حفظ مفتاح Gemini API بنجاح.");
      updateGeminiUI();
    }

    function deleteGeminiKey() {
      if (confirm("هل أنت متأكد من حذف مفتاح Gemini API؟ سيعود النظام إلى التشخيص المحلي.")) {
        localStorage.removeItem("dds_gemini_api_key");
        document.getElementById("gemini-key-input").value = "";
        alert("تم حذف المفتاح.");
        updateGeminiUI();
      }
    }

    function getProviderInfo(key) {
      if (!key) return null;
      const cleanKey = key.trim();
      if (cleanKey.startsWith("sk-or-v1-")) {
        return {
          name: "OpenRouter",
          url: "https://openrouter.ai/api/v1/chat/completions",
          model: "google/gemini-2.5-flash:free",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "3D Diagnosis System"
          },
          isOpenAIStyle: true
        };
      } else if (cleanKey.startsWith("sk-")) {
        return {
          name: "OpenAI",
          url: "https://api.openai.com/v1/chat/completions",
          model: "gpt-4o-mini",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`
          },
          isOpenAIStyle: true
        };
      } else {
        return {
          name: "Google Gemini",
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
          model: "gemini-2.5-flash",
          headers: {
            "Content-Type": "application/json"
          },
          isOpenAIStyle: false
        };
      }
    }

    async function testGeminiConnection() {
      const key = localStorage.getItem("dds_gemini_api_key");
      if (!key) {
        alert("لا يوجد مفتاح محفوظ لاختباره.");
        return;
      }
      
      const btn = document.getElementById("test-key-btn");
      const statusText = document.getElementById("gemini-status");
      
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاختبار...';
      statusText.textContent = "جاري الاتصال بالخادم...";
      statusText.style.color = "var(--gray-600)";
      
      const provider = getProviderInfo(key);
      let response;
      let retries = 0;
      const maxRetries = 3;
      let baseDelay = 1500;
      
      try {
        while (retries < maxRetries) {
          try {
            let requestBody;
            if (provider.isOpenAIStyle) {
              requestBody = JSON.stringify({
                model: provider.model,
                messages: [{ role: "user", content: "Hello, reply with one word." }]
              });
            } else {
              requestBody = JSON.stringify({
                contents: [{ parts: [{ text: "Hello, reply with one word." }] }]
              });
            }

            response = await fetch(provider.url, {
              method: "POST",
              headers: provider.headers,
              body: requestBody
            });
            
            if (response.status === 429) {
              retries++;
              if (retries >= maxRetries) {
                throw new Error(`${provider.name} API returned status 429 (Too Many Requests) after retries.`);
              }
              const delay = baseDelay * Math.pow(2, retries - 1);
              statusText.textContent = `الخادم مشغول، جاري إعادة المحاولة خلال ${delay / 1000} ثانية... (محاولة ${retries}/${maxRetries})`;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            break;
          } catch (fetchErr) {
            retries++;
            if (retries >= maxRetries) {
              throw fetchErr;
            }
            const delay = baseDelay * Math.pow(2, retries - 1);
            statusText.textContent = `خطأ في الاتصال، جاري إعادة المحاولة خلال ${delay / 1000} ثانية... (محاولة ${retries}/${maxRetries})`;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        if (response.ok) {
          alert(`نجح الاتصال! مفتاح الـ API يعمل بشكل صحيح مع موفر الخدمة: ${provider.name}.`);
          statusText.textContent = `نشط ومتصل بالـ API بنجاح (${provider.name} - ${provider.model})`;
          statusText.style.color = "#10b981";
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error(`${provider.name} test error:`, errData);
          alert(`فشل الاتصال! رمز الخطأ: ${response.status}. تأكد من صحة المفتاح وصلاحيته لموقع ${provider.name}.`);
          statusText.textContent = `فشل الاتصال (تحقق من مفتاح الـ ${provider.name})`;
          statusText.style.color = "#ef4444";
        }
      } catch (error) {
        console.error(error);
        alert(`فشل الاتصال بـ ${provider.name}! حدث خطأ في الاتصال أو تم تجاوز معدل الطلبات.`);
        statusText.textContent = `فشل الاتصال (خطأ اتصال/معدل الطلبات مع ${provider.name})`;
        statusText.style.color = "#ef4444";
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plug"></i> اختبار الاتصال';
      }
    }

    function updateGeminiUI() {
      const key = localStorage.getItem("dds_gemini_api_key");
      const input = document.getElementById("gemini-key-input");
      const statusText = document.getElementById("gemini-status");
      
      if (key) {
        input.value = key;
        const provider = getProviderInfo(key);
        statusText.textContent = `نشط (مفتاح الـ API محفوظ لـ ${provider.name})`;
        statusText.style.color = "#10b981";
      } else {
        input.value = "";
        statusText.textContent = "غير نشط (يتم استخدام المحاكي المحلي الافتراضي)";
        statusText.style.color = "var(--gray-500)";
      }
    }

    render();
    updateGeminiUI();
  </script>
</body>
</html>