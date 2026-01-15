``javascript
// بيانات التطبيق الرئيسية
const BankingSystem = {
    // الإعدادات
    config: {
        maxLoginAttempts: 5,
        lockDuration: 15 * 60 * 1000, // 15 دقيقة
        otpExpiry: 2 * 60 * 1000, // 2 دقيقة
        dailyTransferLimit: 5000000,
        transferFeePercentage: 0.5,
        languages: {
            ar: {
                title: "بنك عصمت الحميدي",
                login: "تسجيل الدخول",
                register: "إنشاء حساب",
                deposit: "أودع فلوسك الآن",
                contact: "للتواصل"
            },
            en: {
                title: "Ismat Al-Hamidi Bank",
                login: "Login",
                register: "Register",
                deposit: "Deposit Your Money Now",
                contact: "Contact"
            }
        }
    },

    // المستخدمون المخزّنون
    users: JSON.parse(localStorage.getItem('bankUsers')) || [
        {
            id: 1,
            username: "admin",
            password: "admin123",
            email: "admin@bank.com",
            phone: "770914162",
            fullName: "مدير النظام",
            accountNumber: "770914162",
            balance: 1000000,
            role: "admin",
            loginAttempts: 0,
            isLocked: false,
            lockUntil: null,
            lastLogin: null,
            createdAt: new Date().toISOString(),
            transactions: [],
            failedLogins: [],
            otpEnabled: true,
            twoFactorEnabled: true
        },
        {
            id: 2,
            username: "user1",
            password: "user123",
            email: "user1@email.com",
            phone: "771234567",
            fullName: "أحمد محمد",
            accountNumber: "100000001",
            balance: 50000,
            role: "user",
            loginAttempts: 0,
            isLocked: false,
            lockUntil: null,
            lastLogin: null,
            createdAt: new Date().toISOString(),
            transactions: [],
            failedLogins: [],
            otpEnabled: true,
            twoFactorEnabled: false
        }
    ],

    // المستخدم الحالي
    currentUser: null,

    // محاولات الدخول الفاشلة
    failedAttempts: JSON.parse(localStorage.getItem('failedLoginAttempts')) || [],

    // المعاملات
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],

    // التهيئة
    init: function() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateExchangeRates();
        this.checkForLockedAccounts();
        this.showWelcomeMessage();
    },

    // تحميل الإعدادات
    loadSettings: function() {
        const theme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', theme);
        document.getElementById('darkModeToggle').checked = theme === 'light';

        const language = localStorage.getItem('language') || 'ar';
        document.getElementById('languageSelect').value = language;
        this.updateLanguage(language);

        this.updateLoginStats();
    },

    // إعداد مستمعي الأحداث
    setupEventListeners: function() {
        // تبديل الوضع الليلي
        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            const theme = e.target.checked ? 'light' : 'dark';
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            this.showToast(`تم التبديل إلى الوضع ${theme === 'dark' ? 'الليلي' : 'النهاري'}`);
        });

        // تبديل اللغة
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.updateLanguage(e.target.value);
        });

        // إظهار/إخفاء كلمة المرور
        document.getElementById('togglePassword')?.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // نموذج تسجيل الدخول
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // نسيان كلمة المرور
        document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // التحقق من OTP
        document.getElementById('verifyOtpBtn')?.addEventListener('click', () => {
            this.verifyOTP();
        });

        // إعادة إرسال OTP
        document.getElementById('resendOtpBtn')?.addEventListener('click', () => {
            this.resendOTP();
        });

        // تحديث OTP في الحقول
        document.querySelectorAll('.otp-digit').forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                const index = parseInt(e.target.dataset.index);
                
                if (value.length === 1 && index < 6) {
                    document.querySelector(`.otp-digit[data-index="${index + 1}"]`).focus();
                }
                
                if (value.length === 0 && index > 1) {
                    document.querySelector(`.otp-digit[data-index="${index - 1}"]`).focus();
                }
            });
        });

        // تحديث إحصائيات الدخول كل 5 ثوان
        setInterval(() => {
            this.updateLoginStats();
        }, 5000);
    },

    // التعامل مع تسجيل الدخول
    handleLogin: function() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // التحقق من الحقول الفارغة
        if (!username || !password) {
            this.showToast('يرجى ملء جميع الحقول', 'error');
            return;
        }

        // البحث عن المستخدم
        const user = this.users.find(u => 
            u.username === username || u.accountNumber === username
        );

        // تسجيل محاولة الدخول
        this.logLoginAttempt(username, 'attempted');

        // التحقق من قفل الحساب
        if (user && user.isLocked && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            this.showToast(`الحساب مقفل. الرجاء المحاولة بعد ${remainingTime} دقيقة`, 'error');
            this.showSecurityAlert(`تم اكتشاف محاولة دخول إلى حساب مقفل: ${username}`);
            return;
        }

        // التحقق من صحة البيانات
        if (!user || user.password !== password) {
            this.handleFailedLogin(username);
            return;
        }

        // التحقق من OTP إذا كان مفعلاً
        if (user.otpEnabled) {
            this.generateOTP(user);
            return;
        }

        // تسجيل الدخول الناجح
        this.handleSuccessfulLogin(user, rememberMe);
    },

    // التعامل مع الدخول الفاشل
    handleFailedLogin: function(username) {
        const user = this.users.find(u => 
            u.username === username || u.accountNumber === username
        );

        if (user) {
            user.loginAttempts++;
            
            if (user.loginAttempts >= this.config.maxLoginAttempts) {
                user.isLocked = true;
                user.lockUntil = Date.now() + this.config.lockDuration;
                this.showToast('تم قفل الحساب بسبب محاولات دخول فاشلة متعددة', 'error');
                this.showSecurityAlert(`تم قفل الحساب ${username} بسبب محاولات دخول فاشلة`);
            }

            // تسجيل الدخول الفاشل
            this.logLoginAttempt(username, 'failed', user.loginAttempts);
            
            // تحديث الواجهة
            document.getElementById('attemptsCount').textContent = 
                this.config.maxLoginAttempts - user.loginAttempts;
            
            this.showToast(
                `بيانات الدخول غير صحيحة. لديك ${this.config.maxLoginAttempts - user.loginAttempts} محاولات متبقية`,
                'error'
            );
        } else {
            this.showToast('اسم المستخدم أو رقم الحساب غير صحيح', 'error');
        }

        // تحديث التخزين المحلي
        this.saveData();
        
        // اهتزاز النموذج
        document.getElementById('loginForm').classList.add('animate__shake');
        setTimeout(() => {
            document.getElementById('loginForm').classList.remove('animate__shake');
        }, 500);
    },

    // التعامل مع الدخول الناجح
    handleSuccessfulLogin: function(user, rememberMe) {
        // إعادة تعيين محاولات الدخول
        user.loginAttempts = 0;
        user.isLocked = false;
        user.lockUntil = null;
        user.lastLogin = new Date().toISOString();
        
        // تسجيل الدخول الناجح
        this.logLoginAttempt(user.username, 'success');
        
        // حفظ بيانات الدخول
        this.currentUser = user;
        
        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({
                username: user.username,
                timestamp: Date.now()
            }));
        }

        // عرض رسالة النجاح
        this.showToast('تم تسجيل الدخول بنجاح!', 'success');
        
        // تسجيل نشاط المستخدم
        this.logUserActivity(user.id, 'login', 'تسجيل دخول ناجح');
        
        // تحديث التخزين المحلي
        this.saveData();

        // الانتقال إلى لوحة التحكم بعد تأخير
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    },

    // توليد OTP
    generateOTP: function(user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + this.config.otpExpiry;
        
        // تخزين OTP مؤقتاً
        sessionStorage.setItem('pendingOTP', JSON.stringify({
            code: otp,
            expiry: otpExpiry,
            userId: user.id,
            username: user.username
        }));

        // عرض نموذج OTP
        const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));
        otpModal.show();

        // بدء العد التنازلي
        this.startOTPTimer();

        // في التطبيق الحقيقي، سيتم إرسال OTP عبر SMS
        console.log(`OTP for ${user.phone}: ${otp}`);
        this.showToast(`تم إرسال رمز التحقق إلى ${user.phone}`, 'info');
    },

    // التحقق من OTP
    verifyOTP: function() {
        const otpDigits = document.querySelectorAll('.otp-digit');
        const enteredOTP = Array.from(otpDigits).map(input => input.value).join('');
        
        const pendingOTP = JSON.parse(sessionStorage.getItem('pendingOTP'));
        
        if (!pendingOTP) {
            this.showToast('انتهت صلاحية رمز التحقق', 'error');
            return;
        }
        
        if (Date.now() > pendingOTP.expiry) {
            this.showToast('انتهت صلاحية رمز التحقق', 'error');
            return;
        }
        
        if (enteredOTP === pendingOTP.code) {
            const user = this.users.find(u => u.id === pendingOTP.userId);
            if (user) {
                sessionStorage.removeItem('pendingOTP');
                this.handleSuccessfulLogin(user, false);
                      // إغلاق النموذج
                bootstrap.Modal.getInstance(document.getElementById('otpModal')).hide();
            }
        } else {
            this.showToast('رمز التحقق غير صحيح', 'error');
        }
    },

    // إعادة إرسال OTP
    resendOTP: function() {
        const pendingOTP = JSON.parse(sessionStorage.getItem('pendingOTP'));
        
        if (pendingOTP) {
            const user = this.users.find(u => u.id === pendingOTP.userId);
            if (user) {
                this.generateOTP(user);
                this.showToast('تم إعادة إرسال رمز التحقق', 'info');
            }
        }
    },

    // بدء عد تنازلي لـ OTP
    startOTPTimer: function() {
        let timeLeft = 60;
        const timerElement = document.getElementById('otpCountdown');
        const resendBtn = document.getElementById('resendOtpBtn');
        
        resendBtn.disabled = true;
        
        const timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                resendBtn.disabled = false;
                timerElement.textContent = 'إرسال';
            }
        }, 1000);
    },

    // تسجيل محاولة الدخول
    logLoginAttempt: function(username, status, attempts = null) {
        const attempt = {
            username,
            status,
            attempts,
            ip: this.getUserIP(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            location: this.estimateLocation()
        };
        
        this.failedAttempts.push(attempt);
        
        // الحفاظ على آخر 100 محاولة فقط
        if (this.failedAttempts.length > 100) {
            this.failedAttempts = this.failedAttempts.slice(-100);
        }
        
        localStorage.setItem('failedLoginAttempts', JSON.stringify(this.failedAttempts));
        
        if (status === 'failed') {
            this.showSecurityAlert(`محاولة دخول فاشلة لحساب: ${username}`);
        }
    },

    // تسجيل نشاط المستخدم
    logUserActivity: function(userId, action, description) {
        const activity = {
            userId,
            action,
            description,
            timestamp: new Date().toISOString(),
            ip: this.getUserIP()
        };
        
        // حفظ في سجل الأنشطة
        let activities = JSON.parse(localStorage.getItem('userActivities')) || [];
        activities.push(activity);
        localStorage.setItem('userActivities', JSON.stringify(activities));
    },

    // نسيان كلمة المرور
    handleForgotPassword: function() {
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            this.showToast('يرجى إدخال اسم المستخدم أو رقم الحساب', 'error');
            return;
        }
        
        const user = this.users.find(u => 
            u.username === username || u.accountNumber === username
        );
        
        if (user) {
            // توليد رمز استعادة
            const resetCode = Math.floor(100000 + Math.random() * 900000);
            sessionStorage.setItem('resetCode', JSON.stringify({
                code: resetCode,
                userId: user.id,
                expiry: Date.now() + 15 * 60 * 1000 // 15 دقيقة
            }));
            
            // في التطبيق الحقيقي، سيتم إرسال الرمز عبر البريد الإلكتروني
            this.showToast(`تم إرسال رمز استعادة كلمة المرور إلى ${user.email}`, 'info');
            console.log(`Reset code for ${user.email}: ${resetCode}`);
        } else {
            this.showToast('لم يتم العثور على حساب بهذا الاسم', 'error');
        }
    },

    // تحديث إحصائيات الدخول
    updateLoginStats: function() {
        const today = new Date().toDateString();
        const todayAttempts = this.failedAttempts.filter(attempt => 
            new Date(attempt.timestamp).toDateString() === today
        );
        
        const failedToday = todayAttempts.filter(a => a.status === 'failed').length;
        const successToday = todayAttempts.filter(a => a.status === 'success').length;
        
        // عرض الإحصائيات إذا كان هناك عنصر مناسب
        const statsElement = document.getElementById('loginStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <small class="text-muted">
                    اليوم: ${successToday} نجاح, ${failedToday} فشل
                </small>
            `;
        }
    },

    // التحقق من الحسابات المقفلة
    checkForLockedAccounts: function() {
        const now = Date.now();
        this.users.forEach(user => {
            if (user.isLocked && user.lockUntil && user.lockUntil <= now) {
                user.isLocked = false;
                user.lockUntil = null;
                user.loginAttempts = 0;
            }
        });
        this.saveData();
    },

    // عرض تنبيه الأمان
    showSecurityAlert: function(message) {
        const alertElement = document.getElementById('securityAlert');
        if (alertElement) {
            alertElement.textContent = `🔒 ${message}`;
            alertElement.style.display = 'block';
            
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    },

    // عرض رسالة ترحيب
    showWelcomeMessage: function() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            const { username, timestamp } = JSON.parse(rememberedUser);
            const daysAgo = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
            
            if (daysAgo < 30) { // خلال 30 يوم
                const user = this.users.find(u => u.username === username);
                if (user) {
                    const welcomeMsg = `مرحباً بعودتك ${user.fullName}! آخر دخول لك كان قبل ${daysAgo} يوم`;
                    this.showToast(welcomeMsg, 'info');
                }
            }
        }
    },

    // تحديث أسعار الصرف
    updateExchangeRates: function() {
        // في التطبيق الحقيقي، سيتم جلب البيانات من API
        const rates = {
            USD: 1250.50,
            EUR: 1350.75,
            SAR: 333.25,
            KWD: 4125.00,
            AED: 340.50,
            GBP: 1550.00
        };
        
        // عرض التاريخ الحالي
        const dateElement = document.querySelector('.exchange-rates small');
        if (dateElement) {
            const today = new Date(2026, 0, 15); // 15 يناير 2026
            dateElement.textContent = `آخر تحديث: ${today.toLocaleDateString('ar-SA')}`;
        }
    },

    // تحديث اللغة
    updateLanguage: function(lang) {
        localStorage.setItem('language', lang);
        const texts = this.config.languages[lang];
        
        // تحديث النصوص الأساسية
        document.title = texts.title;
        document.querySelector('title').textContent = texts.title;
        
        // تحديث النصوص الديناميكية
        const elements = {
            '.navbar-brand span': texts.title,
            '.nav-link[href="index.html"]': texts.login,
            '.nav-link[href="register.html"]': texts.register,
            '.deposit-banner h4': texts.deposit,
            '.contact-info h5': texts.contact
        };
        
        Object.entries(elements).forEach(([selector, text]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = text;
        });
        
        // تغيير اتجاه الصفحة
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    },

    // عرض رسائل Toast
    showToast: function(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: colors[type] || colors.info,
            stopOnFocus: true,
            className: "animate__animated animate__fadeIn"
        }).showToast();
    },

    // حفظ البيانات
    saveData: function() {
        localStorage.setItem('bankUsers', JSON.stringify(this.users));
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    },

    // الحصول على IP المستخدم (محاكاة)
    getUserIP: function() {
        // في التطبيق الحقيقي، سيتم الحصول على IP من الخادم
        return '192.168.1.' + Math.floor(Math.random() * 255);
    },

    // تقدير الموقع (محاكاة)
    estimateLocation: function() {
        const locations = ['اليمن - لحج', 'اليمن - عدن', 'اليمن - صنعاء', 'السعودية - الرياض'];
        return locations[Math.floor(Math.random() * locations.length)];
    },

    // تحويل الأموال
    transferMoney: function(fromAccount, toAccount, amount, description) {
        return new Promise((resolve, reject) => {
            const fromUser = this.users.find(u => u.accountNumber === fromAccount);
            const toUser = this.users.find(u => u.accountNumber === toAccount);
            
            if (!fromUser || !toUser) {
                reject('رقم الحساب غير صحيح');
                return;
            }
            
            if (fromUser.balance < amount) {
                reject('الرصيد غير كافي');
                return;
            }
            
            // حساب عمولة التحويل
            const fee = amount * (this.config.transferFeePercentage / 100);
            const totalAmount = amount + fee;
            
            if (fromUser.balance < totalAmount) {
                reject('الرصيد غير كافي لتغطية العمولة');
                return;
            }
            
            // التحقق من الحد اليومي
            const today = new Date().toDateString();
            const todayTransfers = this.transactions.filter(t =>
                t.fromAccount === fromAccount &&
                new Date(t.timestamp).toDateString() === today &&
                t.type === 'transfer'
            );
            
            const todayTotal = todayTransfers.reduce((sum, t) => sum + t.amount, 0);
            
            if (todayTotal + amount > this.config.dailyTransferLimit) {
                reject('تجاوزت الحد اليومي للتحويلات');
                return;
            }
              // تنفيذ التحويل
            fromUser.balance -= totalAmount;
            toUser.balance += amount;
            
            // تسجيل المعاملة
            const transaction = {
                id: Date.now(),
                fromAccount,
                toAccount,
                amount,
                fee,
                totalAmount,
                description,
                type: 'transfer',
                status: 'completed',
                timestamp: new Date().toISOString(),
                initiatedBy: this.currentUser?.id
            };
            
            this.transactions.push(transaction);
            
            // تسجيل في سجل المستخدمين
            fromUser.transactions.push({
                ...transaction,
                balanceAfter: fromUser.balance
            });
            
            toUser.transactions.push({
                ...transaction,
                balanceAfter: toUser.balance,
                type: 'deposit'
            });
            
            // تسجيل النشاط
            this.logUserActivity(fromUser.id, 'transfer', 
                `تحويل ${amount} ريال إلى ${toAccount}`);
            
            this.saveData();
            resolve(transaction);
        });
    },

    // توليد كشف حساب
    generateStatement: function(userId, startDate, endDate) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return null;
        
        const transactions = user.transactions.filter(t => {
            const date = new Date(t.timestamp);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
        
        return {
            user: {
                name: user.fullName,
                accountNumber: user.accountNumber,
                email: user.email
            },
            period: { startDate, endDate },
            openingBalance: this.getOpeningBalance(userId, startDate),
            closingBalance: user.balance,
            transactions: transactions.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)),
            summary: {
                totalDeposits: transactions.filter(t => t.type === 'deposit')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalWithdrawals: transactions.filter(t => t.type === 'withdrawal')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalTransfers: transactions.filter(t => t.type === 'transfer')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalFees: transactions.reduce((sum, t) => sum + (t.fee || 0), 0)
            }
        };
    },

    // الحصول على رصيد الافتتاح
    getOpeningBalance: function(userId, startDate) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return 0;
        
        const transactionsBefore = user.transactions.filter(t => 
            new Date(t.timestamp) < new Date(startDate)
        );
        
        let balance = user.balance;
        transactionsBefore.forEach(t => {
            if (t.type === 'deposit') balance -= t.amount;
            else if (t.type === 'withdrawal') balance += t.amount;
            else if (t.type === 'transfer' && t.fromAccount === user.accountNumber) {
                balance += t.totalAmount;
            }
        });
        
        return balance;
    }
};

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    BankingSystem.init();
});

// تصدير النظام للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankingSystem;
}
```

4. ملف dashboard.js - لوحة التحكم:

```javascript
// نظام لوحة التحكم
const DashboardSystem = {
    // تهيئة لوحة التحكم
    init: function() {
        this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupCharts();
        this.setupRealTimeUpdates();
    },

    // التحقق من المصادقة
    checkAuthentication: function() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        BankingSystem.currentUser = currentUser;
    },

    // تحميل بيانات المستخدم
    loadUserData: function() {
        const user = BankingSystem.currentUser;
        
        // تحديث معلومات المستخدم في الواجهة
        document.getElementById('userName').textContent = user.fullName;
        document.getElementById('userAccount').textContent = user.accountNumber;
        document.getElementById('userBalance').textContent = 
            this.formatCurrency(user.balance);
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userPhone').textContent = user.phone;
        
        // عرض آخر تسجيل دخول
        if (user.lastLogin) {
            const lastLogin = new Date(user.lastLogin);
            document.getElementById('lastLogin').textContent = 
                lastLogin.toLocaleString('ar-SA');
        }
        
        // تحديث صورة المستخدم
        const userAvatar = document.getElementById('userAvatar');
        if (user.avatar) {
            userAvatar.src = user.avatar;
        } else {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`;
        }
    },

    // إعداد مخططات البيانات
    setupCharts: function() {
        // مخطط رصيد الحساب
        const balanceCtx = document.getElementById('balanceChart');
        if (balanceCtx) {
            const balanceChart = new Chart(balanceCtx, {
                type: 'line',
                data: {
                    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                    datasets: [{
                        label: 'الرصيد',
                        data: [5000, 8000, 12000, 9000, 15000, 18000],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            rtl: true,
                            labels: {
                                font: {
                                    family: 'Cairo'
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString() + ' ريال';
                                }
                            }
                        }
                    }
                }
            });
        }

        // مخطط توزيع المصروفات
        const expensesCtx = document.getElementById('expensesChart');
        if (expensesCtx) {
            const expensesChart = new Chart(expensesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['تحويلات', 'فواتير', 'تسوق', 'ترفيه', 'أخرى'],
                    datasets: [{
                        data: [40, 25, 15, 10, 10],
                        backgroundColor: [
                            '#4361ee',
                            '#3a0ca3',
                            '#4cc9f0',
                            '#f72585',
                            '#7209b7'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            rtl: true,
                            labels: {
                                font: {
                                    family: 'Cairo'
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    // تحميل بيانات لوحة التحكم
    loadDashboardData: function() {
        const user = BankingSystem.currentUser;
        
        // تحميل آخر المعاملات
        this.loadRecentTransactions();
        
        // تحميل الإحصائيات
        this.loadStatistics();
        
        // تحميل التحويلات السريعة
        this.loadQuickTransfers();
        
        // تحديث أسعار الصرف
        this.updateExchangeRates();
    },

    // تحميل آخر المعاملات
    loadRecentTransactions: function() {
        const transactions = BankingSystem.currentUser.transactions
            .slice(-5)
            .reverse();
        
        const container = document.getElementById('recentTransactions');
        if (!container) return;
        
        container.innerHTML = transactions.map(t => `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="fas fa-${this.getTransactionIcon(t.type)}"></i>
                </div>
                <div class="transaction-details">
                    <div class="d-flex justify-content-between">
                        <strong>${this.getTransactionType(t.type)}</strong>
                        <span class="${t.type === 'deposit' ? 'text-success' : 'text-danger'}">
                            ${t.type === 'deposit' ? '+' : '-'}${this.formatCurrency(t.amount)}
                        </span>
                    </div>
                    <small class="text-muted">
                        ${t.description || 'بدون وصف'} - ${new Date(t.timestamp).toLocaleDateString('ar-SA')}
                    </small>
                </div>
            </div>
        `).join('');
    },

    // تحميل الإحصائيات
    loadStatistics: function() {
        const user = BankingSystem.currentUser;
        const today = new Date().toDateString();
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        
        // معاملات اليوم
        const todayTransactions = user.transactions.filter(t =>
            new Date(t.timestamp).toDateString() === today
        );
        
        // معاملات الشهر
        const monthTransactions = user.transactions.filter(t => {
            const date = new Date(t.timestamp);
            return date.getMonth() === month && date.getFullYear() === year;
        });
        
        // تحديث الإحصائيات
        document.getElementById('todayTransactions').textContent = todayTransactions.length;
        document.getElementById('monthlyTransactions').textContent = monthTransactions.length;
        
        // إجمالي الإيداعات والسحوبات
        const totalDeposits = monthTransactions
            .filter(t => t.type === 'deposit')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalWithdrawals = monthTransactions
            .filter(t => t.type === 'withdrawal' || t.type === 'transfer')
            .reduce((sum, t) => sum + t.amount, 0);
        
        document.getElementById('totalDeposits').textContent = this.formatCurrency(totalDeposits);
        document.getElementById('totalWithdrawals').textContent = this.formatCurrency(totalWithdrawals);
    },

    // تحميل التحويلات السريعة
    loadQuickTransfers: function() {
        // تحميل قائمة المستلمين المفضلين
        const favorites = JSON.parse(localStorage.getItem('favoriteRecipients')) || [];
        
        const container = document.getElementById('quickTransfers');
        if (!container) return;
        
        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-users fa-2x text-muted mb-2"></i>
                    <p class="text-muted">لا يوجد مستلمين مفضلين</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = favorites.slice(0, 4).map(fav => `
            <div class="quick-transfer-item" data-account="${fav.accountNumber}">
                <div class="d-flex align-items-center">
                    <img src="${fav.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fav.name) + '&background=random'}" 
                         class="rounded-circle me-2" width="40" height="40">
                    <div>
                        <strong>${fav.name}</strong>
                        <small class="d-block text-muted">${fav.accountNumber}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="DashboardSystem.initiateQuickTransfer('${fav.accountNumber}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `).join('');
    },

    // بدء تحويل سريع
    initiateQuickTransfer: function(accountNumber) {
        const recipient = JSON.parse(localStorage.getItem('favoriteRecipients'))
            .find(f => f.accountNumber === accountNumber);
        
        if (recipient) {
            document.getElementById('transferTo').value = recipient.name;
            document.getElementById('transferAccount').value = accountNumber;
            
            // عرض نموذج التحويل
            const transferModal = new bootstrap.Modal(document.getElementById('transferModal'));
            transferModal.show();
        }
    },

    // تحديث أسعار الصرف
    updateExchangeRates: function() {
        // استخدام البيانات من BankingSystem
        const rates = {
            USD: 1250.50,
            EUR: 1350.75,
            SAR: 333.25
        };
        
        const container = document.getElementById('exchangeRates');
        if (container) {
            container.innerHTML = Object.entries(rates).map(([currency, rate]) => `
                <div class="exchange-rate-item">
                    <span>${currency}</span>
                    <span>${this.formatCurrency(rate)}</span>
                </div>
            `).join('');
        }
    },

    // إعداد التحديثات في الوقت الفعلي
    setupRealTimeUpdates: function() {
        // تحديث الرصيد كل 30 ثانية
        setInterval(() => {
            this.updateLiveBalance();
        }, 30000);
        
        // التحقق من المعاملات الجديدة
        setInterval(() => {
            this.checkNewTransactions();
        }, 60000);
    },

    // تحديث الرصيد الحي
    updateLiveBalance: function() {
        // في التطبيق الحقيقي، سيتم جلب البيانات من الخادم
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            const currentBalance = BankingSystem.currentUser.balance;
            balanceElement.textContent = this.formatCurrency(currentBalance);
        }
    },

    // التحقق من المعاملات الجديدة
    checkNewTransactions: function() {
        // في التطبيق الحقيقي، سيتم التحقق من الخادم
        BankingSystem.showToast('جارٍ تحديث البيانات...', 'info');
        this.loadRecentTransactions();
        this.loadStatistics();
    },

    // تنسيق العملة
    formatCurrency: function(amount) {
        return amount.toLocaleString('ar-SA') + ' ريال';
    },

    // الحصول على أيقونة المعاملة
    getTransactionIcon: function(type) {
        const icons = {
            deposit: 'arrow-down',
            withdrawal: 'arrow-up',
            transfer: 'exchange-alt',
            bill: 'file-invoice',
            salary: 'money-check'
        };
        return icons[type] || 'dollar-sign';
    },

    // الحصول على نوع المعاملة
    getTransactionType: function(type) {
        const types = {
            deposit: 'إيداع',
            withdrawal: 'سحب',
            transfer: 'تحويل',
            bill: 'فاتورة',
            salary: 'مرتب'
        };
        return types[type] || 'معاملة';
    },

    // إعداد مستمعي الأحداث
    setupEventListeners: function() {
        // تسجيل الخروج
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // تحويل الأموال
        document.getElementById('transferForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransfer();
        });
        
        // إضافة مستلم مفضل
        document.getElementById('addFavoriteBtn').addEventListener('click', () => {
            this.addFavoriteRecipient();
        });
        
        // عرض كشف الحساب
        document.getElementById('generateStatement').addEventListener('click', () => {
            this.generateAccountStatement();
        });
        
        // تحديث البيانات
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadDashboardData();
            BankingSystem.showToast('تم تحديث البيانات', 'success');
        });
    },

    // التعامل مع تسجيل الخروج
    handleLogout: function() {
        BankingSystem.logUserActivity(
            BankingSystem.currentUser.id, 
            'logout', 
            'تسجيل خروج'
        );
        
        localStorage.removeItem('currentUser');
        BankingSystem.currentUser = null;
        
        BankingSystem.showToast('تم تسجيل الخروج بنجاح', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    },
    // التعامل مع التحويل
    handleTransfer: function() {
        const toAccount = document.getElementById('transferAccount').value.trim();
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const description = document.getElementById('transferDescription').value.trim();
        
        if (!toAccount || !amount || amount <= 0) {
            BankingSystem.showToast('يرجى إدخال بيانات صحيحة', 'error');
            return;
        }
        
        const fromAccount = BankingSystem.currentUser.accountNumber;
        
        BankingSystem.transferMoney(fromAccount, toAccount, amount, description)
            .then(transaction => {
                BankingSystem.showToast('تم التحويل بنجاح', 'success');
                
                // تحديث البيانات
                this.loadUserData();
                this.loadRecentTransactions();
                this.loadStatistics();
                
                // إغلاق النموذج
                bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
                
                // إعادة تعيين النموذج
                document.getElementById('transferForm').reset();
                
                // إرسال إشعار
                this.sendTransferNotification(transaction);
            })
            .catch(error => {
                BankingSystem.showToast(error, 'error');
            });
    },

    // إضافة مستلم مفضل
    addFavoriteRecipient: function() {
        const name = prompt('أدخل اسم المستلم:');
        const account = prompt('أدخل رقم الحساب:');
        
        if (name && account) {
            let favorites = JSON.parse(localStorage.getItem('favoriteRecipients')) || [];
            
            // التحقق من عدم وجود الحساب مسبقاً
            if (!favorites.find(f => f.accountNumber === account)) {
                favorites.push({
                    name,
                    accountNumber: account,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                    addedAt: new Date().toISOString()
                });
                
                localStorage.setItem('favoriteRecipients', JSON.stringify(favorites));
                BankingSystem.showToast('تم إضافة المستلم إلى المفضلة', 'success');
                this.loadQuickTransfers();
            } else {
                BankingSystem.showToast('المستلم موجود بالفعل في المفضلة', 'warning');
            }
        }
    },

    // توليد كشف حساب
    generateAccountStatement: function() {
        const startDate = prompt('تاريخ البداية (YYYY-MM-DD):', 
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        
        const endDate = prompt('تاريخ النهاية (YYYY-MM-DD):', 
            new Date().toISOString().split('T')[0]);
        
        if (startDate && endDate) {
            const statement = BankingSystem.generateStatement(
                BankingSystem.currentUser.id,
                startDate,
                endDate
            );
            
            if (statement) {
                this.displayStatement(statement);
            }
        }
    },

    // عرض كشف الحساب
    displayStatement: function(statement) {
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">كشف حساب</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="statement-header mb-4">
                    <h6>${statement.user.name}</h6>
                    <p>رقم الحساب: ${statement.user.accountNumber}</p>
                    <p>الفترة: ${new Date(statement.period.startDate).toLocaleDateString('ar-SA')} 
                       إلى ${new Date(statement.period.endDate).toLocaleDateString('ar-SA')}</p>
                </div>
                
                <div class="statement-summary mb-4">
                    <div class="row">
                        <div class="col-md-6">
                            <p>رصيد الافتتاح: <strong>${this.formatCurrency(statement.openingBalance)}</strong></p>
                            <p>رصيد الإغلاق: <strong>${this.formatCurrency(statement.closingBalance)}</strong></p>
                        </div>
                        <div class="col-md-6">
                            <p>إجمالي الإيداعات: <strong>${this.formatCurrency(statement.summary.totalDeposits)}</strong></p>
                            <p>إجمالي السحوبات: <strong>${this.formatCurrency(statement.summary.totalWithdrawals)}</strong></p>
                        </div>
                    </div>
                </div>
                
                <div class="statement-transactions">
                    <h6>المعاملات</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>النوع</th>
                                    <th>المبلغ</th>
                                    <th>الوصف</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${statement.transactions.map(t => `
                                    <tr>
                                        <td>${new Date(t.timestamp).toLocaleDateString('ar-SA')}</td>
                                        <td>${this.getTransactionType(t.type)}</td>
                                        <td class="${t.type === 'deposit' ? 'text-success' : 'text-danger'}">
                                            ${t.type === 'deposit' ? '+' : '-'}${this.formatCurrency(t.amount)}
                                        </td>
                                        <td>${t.description || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                <button type="button" class="btn btn-primary" onclick="DashboardSystem.downloadStatement()">
                    <i class="fas fa-download"></i> تحميل PDF
                </button>
            </div>
        `;
        
        const modal = document.getElementById('statementModal');
        if (modal) {
            modal.querySelector('.modal-content').innerHTML = modalContent;
            new bootstrap.Modal(modal).show();
        }
    },

    // تحميل كشف الحساب
    downloadStatement: function() {
        BankingSystem.showToast('جارٍ تحميل كشف الحساب...', 'info');
        // في التطبيق الحقيقي، سيتم إنشاء وتنزيل ملف PDF
        setTimeout(() => {
            BankingSystem.showToast('تم تحميل كشف الحساب بنجاح', 'success');
        }, 2000);
    },

    // إرسال إشعار التحويل
    sendTransferNotification: function(transaction) {
        // في التطبيق الحقيقي، سيتم إرسال بريد إلكتروني أو SMS
        console.log('إشعار تحويل:', transaction);
        
        // إشعار في الواجهة
        BankingSystem.showToast(
            `تم تحويل ${transaction.amount} ريال بنجاح. الرصيد الجديد: ${BankingSystem.currentUser.balance} ريال`,
            'success'
        );
    }
};

// تهيئة لوحة التحكم
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        DashboardSystem.init();
    }
});
// وظيفة تسجيل الدخول المبسطة
function login() {
    console.log("دالة login تم استدعاؤها");
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const msgElement = document.getElementById('msg');
    
    console.log("بيانات الإدخال:", { username, password });
    
    // التحقق من الحقول الفارغة
    if (!username || !password) {
        console.log("حقول فارغة");
        msgElement.textContent = "يرجى ملء جميع الحقول";
        return;
    }
    
    // تحميل المستخدمين من localStorage
    let users = JSON.parse(localStorage.getItem('bankUsers')) || [];
    console.log("المستخدمون المحفوظون:", users);
    
    // البحث عن المستخدم
    const user = users.find(u => 
        u.username === username && u.password === password
    );
    
    console.log("المستخدم الذي تم العثور عليه:", user);
    
    if (user) {
        console.log("تسجيل الدخول ناجح!");
        msgElement.textContent = "جاري التوجيه...";
        msgElement.style.color = "green";
        
        // حفظ المستخدم الحالي
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // تحديث آخر تسجيل دخول
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('bankUsers', JSON.stringify(users));
        
        // الانتقال فوراً بدون تأخير
        window.location.href = "dashboard.html";
    } else {
        console.log("بيانات الدخول غير صحيحة");
        msgElement.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
        msgElement.style.color = "red";
        
        // اهتزاز النموذج
        document.getElementById('loginForm').classList.add('animate__shake');
        setTimeout(() => {
            document.getElementById('loginForm').classList.remove('animate__shake');
        }, 500);
    }
}