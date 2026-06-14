<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Diagnosis System - تسجيل الدخول</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('style-login.css') }}">
</head>
<body>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script>
        window.DDS_BOOTSTRAP = @json($ddsBootstrap ?? []);
    </script>
    <script src="{{ asset('js/dds-state.js') }}"></script>
    <div class="login-container">
        <div class="login-header">
            <div class="logo">
                <i class="fas fa-stethoscope"></i>
                <h1>3D Diagnosis <span class="logo-highlight">System</span></h1>
                <span class="logo-sub">نظام التشخيص الطبي التفاعلي ثلاثي الأبعاد</span>
            </div>
        </div>

        <div class="login-form-container">
            <div class="welcome-section">
                <div class="welcome-icon">
                    <i class="fas fa-heartbeat"></i>
                </div>
                <h2>مرحباً بك في 3D Diagnosis System</h2>
                <p class="welcome-text">اختر نوع الحساب (مستخدم / أدمن) ثم سجل أو أنشئ حساباً جديداً للبدء.</p>
            </div>

            <form id="auth-form" class="login-form" autocomplete="off">
                <div id="message" class="alert hidden"><i class="fas fa-circle-exclamation"></i><span id="message-text"></span></div>
                <div class="auth-switches in-form" style="justify-content: center;">
                    <div class="pill-toggle" id="mode-toggle" aria-label="اختيار الوضع" style="width: 100%; max-width: 400px;">
                        <button type="button" data-mode="login" class="active"><i class="fas fa-sign-in-alt"></i>تسجيل دخول</button>
                        <button type="button" data-mode="register"><i class="fas fa-user-plus"></i>تسجيل جديد</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="username">
                        <i class="fas fa-user"></i>
                        اسم المستخدم
                    </label>
                    <input type="text" id="username" placeholder="أدخل اسم المستخدم" required>
                </div>

                <div class="form-group">
                    <label for="password">
                        <i class="fas fa-lock"></i>
                        كلمة المرور
                    </label>
                    <input type="password" id="password" placeholder="أدخل كلمة المرور" required>
                </div>

                <div class="form-group hidden" id="confirm-wrap">
                    <label for="confirmPassword">
                        <i class="fas fa-lock"></i>
                        تأكيد كلمة المرور
                    </label>
                    <input type="password" id="confirmPassword" placeholder="أعد إدخال كلمة المرور">
                </div>

                <div class="form-group hidden" id="admin-key-wrap">
                    <label for="adminKey">
                        <i class="fas fa-key"></i>
                        كود الأدمن (اختياري)
                    </label>
                    <input type="password" id="adminKey" placeholder="أدخل كود الأدمن للتسجيل كأدمن">
                    <p class="small-note">اترك حقل كود الأدمن فارغاً للتسجيل كمستخدم عادي.</p>
                </div>

                <div class="form-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="remember">
                        <span>تذكرني</span>
                    </label>
                    <a href="#" class="forgot-link" onclick="return false;">نسيت كلمة المرور؟</a>
                </div>

                <button type="submit" class="login-btn" id="primary-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    تسجيل الدخول
                </button>

                <div class="divider">
                    <span>أو</span>
                </div>

                <button type="button" class="guest-btn" id="guest-btn">
                    <i class="fas fa-user-clock"></i>
                    الدخول كزائر
                </button>
            </form>

            <div class="login-features">
                <div class="feature">
                    <i class="fas fa-cube"></i>
                    <h4>نموذج ثلاثي الأبعاد تفاعلي</h4>
                    <p>اختر منطقة الألم بدقة على النموذج التشريحي</p>
                </div>
                <div class="feature">
                    <i class="fas fa-robot"></i>
                    <h4>مساعد طبي ذكي</h4>
                    <p>محادثة تفاعلية مع مساعد طبي مدعوم بالذكاء الاصطناعي</p>
                </div>
                <div class="feature">
                    <i class="fas fa-file-medical-alt"></i>
                    <h4>تشخيص أولي</h4>
                    <p>احصل على تقرير طبي أولي مع توصيات مبدئية</p>
                </div>
            </div>
        </div>

        <div class="login-footer">
            <p id="footer-hint">ليس لديك حساب؟ <a href="#" onclick="switchToRegister();return false;">سجل الآن</a></p>
            <p class="disclaimer">
                <i class="fas fa-exclamation-triangle"></i>
                هذا النظام هو أداة مساعدة للتشخيص الأولي ولا يغني عن استشارة الطبيب المختص.
            </p>
        </div>
    </div>

    <script src="{{ asset('js/dds-login.js') }}"></script>
</body>
</html>