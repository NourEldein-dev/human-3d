(function () {
    const state = { mode: 'login' };
    const $ = (id) => document.getElementById(id);
    const modeToggle = $('mode-toggle');

    function csrf() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function showMessage(text) {
        $('message-text').textContent = text;
        $('message').classList.remove('hidden');
    }

    function hideMessage() {
        $('message').classList.add('hidden');
        $('message-text').textContent = '';
    }

    function normalizeUsername(value) {
        return (value || '').trim();
    }

    function setMode(mode) {
        state.mode = mode;
        [...modeToggle.querySelectorAll('button')].forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });

        $('confirm-wrap').classList.toggle('hidden', mode !== 'register');
        $('admin-key-wrap').classList.toggle('hidden', mode !== 'register');

        const primaryIcon = $('primary-btn').querySelector('i');
        if (mode === 'login') {
            primaryIcon.className = 'fas fa-sign-in-alt';
            $('primary-btn').childNodes[2].textContent = ' تسجيل الدخول';
            $('guest-btn').classList.remove('hidden');
            $('footer-hint').innerHTML = 'ليس لديك حساب؟ <a href="#" onclick="switchToRegister();return false;">سجل الآن</a>';
        } else {
            primaryIcon.className = 'fas fa-user-plus';
            $('primary-btn').childNodes[2].textContent = ' إنشاء حساب';
            $('guest-btn').classList.add('hidden');
            $('footer-hint').innerHTML = 'لديك حساب بالفعل؟ <a href="#" onclick="switchToLogin();return false;">سجل دخول</a>';
        }

        hideMessage();
    }

    async function submitJson(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errors = data.errors || {};
            const first = Object.values(errors).flat()[0] || data.message || 'حدث خطأ، حاول مرة أخرى.';
            throw new Error(first);
        }

        return data;
    }

    window.switchToRegister = function () {
        setMode('register');
    };

    window.switchToLogin = function () {
        setMode('login');
    };

    modeToggle.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button) setMode(button.dataset.mode);
    });

    $('auth-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessage();

        const username = normalizeUsername($('username').value);
        const password = $('password').value || '';
        const confirm = $('confirmPassword').value || '';

        if (!username) return showMessage('من فضلك أدخل اسم المستخدم.');
        if (!password) return showMessage('من فضلك أدخل كلمة المرور.');

        try {
            const route = state.mode === 'login' ? '/auth/login' : '/auth/register';
            const payload = state.mode === 'login'
                ? { username, password, remember: $('remember').checked }
                : {
                    username,
                    password,
                    password_confirmation: confirm,
                    admin_key: $('adminKey').value || '',
                };

            const result = await submitJson(route, payload);
            window.location.href = result.redirect || '/model';
        } catch (error) {
            showMessage(error.message);
        }
    });

    $('guest-btn').addEventListener('click', async () => {
        hideMessage();
        try {
            const result = await submitJson('/auth/guest', {});
            window.location.href = result.redirect || '/model';
        } catch (error) {
            showMessage(error.message);
        }
    });

    setMode('login');
})();
