```javascript
// نظام الإدارة
const AdminSystem = {
    // تهيئة لوحة الإدارة
    init: function() {
        this.checkAdminAccess();
        this.loadAdminData();
        this.setupEventListeners();
        this.loadStatistics();
        this.loadUserManagement();
        this.loadTransactionLogs();
        this.setupRealTimeMonitoring();
    },

    // التحقق من صلاحيات المدير
    checkAdminAccess: function() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser || currentUser.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        
        BankingSystem.currentUser = currentUser;
    },

    // تحميل بيانات الإدارة
    loadAdminData: function() {
        // إحصائيات النظام
        const totalUsers = BankingSystem.users.length;
        const totalBalance = BankingSystem.users.reduce((sum, user) => sum + user.balance, 0);
        const activeUsers = BankingSystem.users.filter(u => !u.isLocked).length;
        const todayTransactions = BankingSystem.transactions.filter(t => 
            new Date(t.timestamp).toDateString() === new Date().toDateString()
        ).length;
        
        // تحديث الإحصائيات
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalBalance').textContent = 
            this.formatCurrency(totalBalance);
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('todayTransactions').textContent = todayTransactions;
    },

    // تحميل إدارة المستخدمين
    loadUserManagement: function() {
        const users = BankingSystem.users;
        const container = document.getElementById('usersTable');
        
        if (!container) return;
        
        container.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName) + '&background=random'}" 
                             class="rounded-circle me-2" width="32" height="32">
                        <div>
                            <strong>${user.fullName}</strong>
                            <small class="d-block text-muted">${user.accountNumber}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'}">
                        ${user.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </span>
                </td>
                <td>${this.formatCurrency(user.balance)}</td>
                <td>
                    <span class="badge bg-${user.isLocked ? 'warning' : 'success'}">
                        ${user.isLocked ? 'مقفل' : 'نشط'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="AdminSystem.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-${user.isLocked ? 'success' : 'warning'}" 
                                onclick="AdminSystem.toggleUserLock(${user.id})">
                            <i class="fas fa-${user.isLocked ? 'unlock' : 'lock'}"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="AdminSystem.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // تحميل سجل المعاملات
    loadTransactionLogs: function() {
        const transactions = BankingSystem.transactions.slice(-20).reverse();
        const container = document.getElementById('transactionsTable');
        
        if (!container) return;
        
        container.innerHTML = transactions.map(t => {
            const fromUser = BankingSystem.users.find(u => u.accountNumber === t.fromAccount);
            const toUser = BankingSystem.users.find(u => u.accountNumber === t.toAccount);
            
            return `
                <tr>
                    <td>${t.id}</td>
                    <td>
                        ${fromUser ? fromUser.fullName : t.fromAccount}<br>
                        <small>${t.fromAccount}</small>
                    </td>
                    <td>
                        ${toUser ? toUser.fullName : t.toAccount}<br>
                        <small>${t.toAccount}</small>
                    </td>
                    <td>${this.formatCurrency(t.amount)}</td>
                    <td>${this.formatCurrency(t.fee || 0)}</td>
                    <td>
                        <span class="badge bg-${t.status === 'completed' ? 'success' : 'warning'}">
                            ${t.status === 'completed' ? 'مكتمل' : 'معلق'}
                        </span>
                    </td>
                    <td>${new Date(t.timestamp).toLocaleString('ar-SA')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="AdminSystem.viewTransaction(${t.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // تحميل الإحصائيات التفصيلية
    loadStatistics: function() {
        // إحصائيات المستخدمين
        const userStats = {
            total: BankingSystem.users.length,
            active: BankingSystem.users.filter(u => !u.isLocked).length,
            locked: BankingSystem.users.filter(u => u.isLocked).length,
            admins: BankingSystem.users.filter(u => u.role === 'admin').length,
            todayRegistered: BankingSystem.users.filter(u => 
                new Date(u.createdAt).toDateString() === new Date().toDateString()
            ).length
        };
        
        // إحصائيات المعاملات
        const today = new Date().toDateString();
        const transactionStats = {
            today: BankingSystem.transactions.filter(t => 
                new Date(t.timestamp).toDateString() === today
            ).length,
            totalAmount: BankingSystem.transactions
                .filter(t => new Date(t.timestamp).toDateString() === today)
                .reduce((sum, t) => sum + t.amount, 0),
            totalFees: BankingSystem.transactions
                .filter(t => new Date(t.timestamp).toDateString() === today)
                .reduce((sum, t) => sum + (t.fee || 0), 0)
        };
        
        // تحديث الإحصائيات
        document.getElementById('userStats').innerHTML = `
            <div class="row">
                <div class="col-6">
                    <p>المستخدمين النشطين: <strong>${userStats.active}</strong></p>
                    <p>المستخدمين المقفلين: <strong>${userStats.locked}</strong></p>
                </div>
                <div class="col-6">
                    <p>المسجلين اليوم: <strong>${userStats.todayRegistered}</strong></p>
                    <p>المدراء: <strong>${userStats.admins}</strong></p>
                </div>
            </div>
        `;
        
        document.getElementById('transactionStats').innerHTML = `
            <div class="row">
                <div class="col-6">
                    <p>المعاملات اليوم: <strong>${transactionStats.today}</strong></p>
                    <p>إجمالي المبالغ: <strong>${this.formatCurrency(transactionStats.totalAmount)}</strong></p>
                </div>
                <div class="col-6">
                    <p>إجمالي العمولات: <strong>${this.formatCurrency(transactionStats.totalFees)}</strong></p>
                </div>
            </div>
        `;
    },

    // إعداد مراقبة الوقت الحقيقي
    setupRealTimeMonitoring: function() {
        // تحديث الإحصائيات كل دقيقة
        setInterval(() => {
            this.loadStatistics();
        }, 60000);
        
        // التحقق من الأنشطة المشبوهة
        setInterval(() => {
            this.checkSuspiciousActivities();
        }, 300000); // كل 5 دقائق
    },

    // التحقق من الأنشطة المشبوهة
    checkSuspiciousActivities: function() {
        // التحقق من محاولات الدخول الفاشلة
        const recentFailed = BankingSystem.failedAttempts.filter(a => 
            Date.now() - new Date(a.timestamp).getTime() < 3600000 // آخر ساعة
        );
        
        if (recentFailed.length > 10) {
            this.showAlert('تحذير أمني', 
                `تم اكتشاف ${recentFailed.length} محاولة دخول فاشلة خلال الساعة الماضية`);
        }
        
        // التحقق من التحويلات الكبيرة
        const largeTransfers = BankingSystem.transactions.filter(t =>
            t.amount > 1000000 && // أكثر من مليون
            Date.now() - new Date(t.timestamp).getTime() < 3600000
        );
        
        if (largeTransfers.length > 0) {
            this.showAlert('تحويلات كبيرة', 
                `تم إجراء ${largeTransfers.length} تحويل كبير خلال الساعة الماضية`);
        }
    },

    // تعديل مستخدم
    editUser: function(userId) {
        const user = BankingSystem.users.find(u => u.id === userId);
        if (!user) return;
        
        // عرض نموذج التعديل
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">تعديل مستخدم: ${user.fullName}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <div class="mb-3">
                        <label class="form-label">الاسم الكامل</label>
                        <input type="text" class="form-control" value="${user.fullName}" id="editFullName" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">البريد الإلكتروني</label>
                        <input type="email" class="form-control" value="${user.email}" id="editEmail" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">رقم الهاتف</label>
                        <input type="tel" class="form-control" value="${user.phone}" id="editPhone" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">الدور</label>
                        <select class="form-select" id="editRole">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>مستخدم</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
                            <option value="support" ${user.role === 'support' ? 'selected' : ''}>دعم فني</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">الرصيد</label>
                        <input type="number" class="form-control" value="${user.balance}" id="editBalance" required>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="editIsLocked" ${user.isLocked ? 'checked' : ''}>
                        <label class="form-check-label">حساب مقفل</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                <button type="button" class="btn btn-primary" onclick="AdminSystem.saveUserChanges(${userId})">
                    حفظ التغييرات
                </button>
            </div>
        `;
        
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.querySelector('.modal-content').innerHTML = modalContent;
            new bootstrap.Modal(modal).show();
        }
    },

    // حفظ تغييرات المستخدم
    saveUserChanges: function(userId) {
        const user = BankingSystem.users.find(u => u.id === userId);
        if (!user) return;
        
        user.fullName = document.getElementById('editFullName').value;
        user.email = document.getElementById('editEmail').value;
        user.phone = document.getElementById('editPhone').value;
        user.role = document.getElementById('editRole').value;
        user.balance = parseFloat(document.getElementById('editBalance').value);
        user.isLocked = document.getElementById('editIsLocked').checked;
        
        BankingSystem.saveData();
        this.loadUserManagement();
        this.loadStatistics();
        
        BankingSystem.showToast('تم تحديث بيانات المستخدم', 'success');
        
        // إغلاق النموذج
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
    },

    // تبديل قفل المستخدم
    toggleUserLock: function(userId) {
        const user = BankingSystem.users.find(u => u.id === userId);
        if (!user) return;
        
        const action = user.isLocked ? 'فتح' : 'قفل';
        const confirmAction = confirm(`هل أنت متأكد من ${action} حساب ${user.fullName}؟`);
        
        if (confirmAction) {
            user.isLocked = !user.isLocked;
            user.lockUntil = user.isLocked ? Date.now() + BankingSystem.config.lockDuration : null;
            
            BankingSystem.saveData();
            this.loadUserManagement();
            
            BankingSystem.showToast(`تم ${action} حساب المستخدم`, 'success');
            
            // تسجيل النشاط
            BankingSystem.logUserActivity(
                BankingSystem.currentUser.id,
                user.isLocked ? 'lock_user' : 'unlock_user',
                `${action} حساب ${user.fullName} (${user.accountNumber})`
            );
        }
    },

    // حذف مستخدم
    deleteUser: function(userId) {
        const user = BankingSystem.users.find(u => u.id === userId);
        if (!user) return;
        
        if (user.role === 'admin' && BankingSystem.users.filter(u => u.role === 'admin').length <= 1) {
            BankingSystem.showToast('لا يمكن حذف المدير الوحيد', 'error');
            return;
        }
        
        const confirmDelete = confirm(`هل أنت متأكد من حذف حساب ${user.fullName}؟\nهذا الإجراء لا يمكن التراجع عنه.`);
        
        if (confirmDelete) {
            BankingSystem.users = BankingSystem.users.filter(u => u.id !== userId);
            BankingSystem.saveData();
            this.loadUserManagement();
            this.loadStatistics();
            
            BankingSystem.showToast('تم حذف حساب المستخدم', 'success');
            
            // تسجيل النشاط
            BankingSystem.logUserActivity(
                BankingSystem.currentUser.id,
                'delete_user',
                `حذف حساب ${user.fullName} (${user.accountNumber})`
            );
        }
    },
     // عرض تفاصيل المعاملة
    viewTransaction: function(transactionId) {
        const transaction = BankingSystem.transactions.find(t => t.id === transactionId);
        if (!transaction) return;
        
        const fromUser = BankingSystem.users.find(u => u.accountNumber === transaction.fromAccount);
        const toUser = BankingSystem.users.find(u => u.accountNumber === transaction.toAccount);
        
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">تفاصيل المعاملة #${transaction.id}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="transaction-details">
                    <div class="mb-3">
                        <strong>المرسل:</strong>
                        <p>${fromUser ? fromUser.fullName : transaction.fromAccount}</p>
                    </div>
                    <div class="mb-3">
                        <strong>المستلم:</strong>
                        <p>${toUser ? toUser.fullName : transaction.toAccount}</p>
                    </div>
                    <div class="mb-3">
                        <strong>المبلغ:</strong>
                        <p>${this.formatCurrency(transaction.amount)}</p>
                    </div>
                    <div class="mb-3">
                        <strong>العمولة:</strong>
                        <p>${this.formatCurrency(transaction.fee || 0)}</p>
                    </div>
                    <div class="mb-3">
                        <strong>الإجمالي:</strong>
                        <p>${this.formatCurrency(transaction.totalAmount)}</p>
                    </div>
                    <div class="mb-3">
                        <strong>الوصف:</strong>
                        <p>${transaction.description || 'لا يوجد وصف'}</p>
                    </div>
                    <div class="mb-3">
                        <strong>الحالة:</strong>
                        <span class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">
                            ${transaction.status === 'completed' ? 'مكتمل' : 'معلق'}
                        </span>
                    </div>
                    <div class="mb-3">
                        <strong>التاريخ والوقت:</strong>
                        <p>${new Date(transaction.timestamp).toLocaleString('ar-SA')}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                ${transaction.status !== 'completed' ? `
                    <button type="button" class="btn btn-success" onclick="AdminSystem.approveTransaction(${transaction.id})">
                        الموافقة
                    </button>
                    <button type="button" class="btn btn-danger" onclick="AdminSystem.rejectTransaction(${transaction.id})">
                        رفض
                    </button>
                ` : ''}
            </div>
        `;
        
        const modal = document.getElementById('viewTransactionModal');
        if (modal) {
            modal.querySelector('.modal-content').innerHTML = modalContent;
            new bootstrap.Modal(modal).show();
        }
    },

    // الموافقة على معاملة
    approveTransaction: function(transactionId) {
        const transaction = BankingSystem.transactions.find(t => t.id === transactionId);
        if (!transaction) return;
        
        transaction.status = 'completed';
        BankingSystem.saveData();
        
        BankingSystem.showToast('تمت الموافقة على المعاملة', 'success');
        this.loadTransactionLogs();
        
        // إغلاق النموذج
        bootstrap.Modal.getInstance(document.getElementById('viewTransactionModal')).hide();
    },

    // رفض معاملة
    rejectTransaction: function(transactionId) {
        const transaction = BankingSystem.transactions.find(t => t.id === transactionId);
        if (!transaction) return;
        
        transaction.status = 'rejected';
        BankingSystem.saveData();
        
        BankingSystem.showToast('تم رفض المعاملة', 'success');
        this.loadTransactionLogs();
        
        // إغلاق النموذج
        bootstrap.Modal.getInstance(document.getElementById('viewTransactionModal')).hide();
    },

    // عرض تنبيه
    showAlert: function(title, message) {
        const alertContent = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>${title}:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const alertsContainer = document.getElementById('alertsContainer');
        if (alertsContainer) {
            alertsContainer.innerHTML = alertContent + alertsContainer.innerHTML;
        }
    },

    // تنسيق العملة
    formatCurrency: function(amount) {
        return amount.toLocaleString('ar-SA') + ' ريال';
    },

    // إعداد مستمعي الأحداث
    setupEventListeners: function() {
        // تصدير البيانات
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });
        
        // نسخ احتياطي
        document.getElementById('backupData').addEventListener('click', () => {
            this.createBackup();
        });
        
        // استعادة النسخ الاحتياطي
        document.getElementById('restoreData').addEventListener('click', () => {
            this.restoreBackup();
        });
        
        // تصفية المستخدمين
        document.getElementById('filterUsers').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });
        
        // تصفية المعاملات
        document.getElementById('filterTransactions').addEventListener('input', (e) => {
            this.filterTransactions(e.target.value);
        });
    },

    // تصدير البيانات
    exportData: function() {
        const data = {
            users: BankingSystem.users,
            transactions: BankingSystem.transactions,
            failedAttempts: BankingSystem.failedAttempts,
            exportDate: new Date().toISOString(),
            exportedBy: BankingSystem.currentUser.fullName
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `bank_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        BankingSystem.showToast('تم تصدير البيانات بنجاح', 'success');
    },

    // إنشاء نسخ احتياطي
    createBackup: function() {
        const backup = {
            data: {
                users: BankingSystem.users,
                transactions: BankingSystem.transactions,
                failedAttempts: BankingSystem.failedAttempts
            },
            timestamp: Date.now(),
            createdBy: BankingSystem.currentUser.id
        };
        
        localStorage.setItem('systemBackup', JSON.stringify(backup));
        BankingSystem.showToast('تم إنشاء نسخة احتياطية', 'success');
    },

    // استعادة النسخ الاحتياطي
    restoreBackup: function() {
        const backup = JSON.parse(localStorage.getItem('systemBackup'));
        
        if (!backup) {
            BankingSystem.showToast('لا توجد نسخة احتياطية', 'error');
            return;
        }
        
        const confirmRestore = confirm('هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم فقدان جميع البيانات الحالية.');
        
        if (confirmRestore) {
            BankingSystem.users = backup.data.users;
            BankingSystem.transactions = backup.data.transactions;
            BankingSystem.failedAttempts = backup.data.failedAttempts;
            
            BankingSystem.saveData();
            
            BankingSystem.showToast('تم استعادة النسخة الاحتياطية', 'success');
            
            // إعادة تحميل البيانات
            this.loadUserManagement();
            this.loadTransactionLogs();
            this.loadStatistics();
        }
    },

    // تصفية المستخدمين
    filterUsers: function(searchTerm) {
        const users = BankingSystem.users;
        const filteredUsers = users.filter(user => 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.accountNumber.includes(searchTerm)
        );
        
        const container = document.getElementById('usersTable');
        if (!container) return;
        
        container.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName) + '&background=random'}" 
                             class="rounded-circle me-2" width="32" height="32">
                        <div>
                            <strong>${user.fullName}</strong>
                            <small class="d-block text-muted">${user.accountNumber}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'}">
                        ${user.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </span>
                </td>
                <td>${this.formatCurrency(user.balance)}</td>
                <td>
                    <span class="badge bg-${user.isLocked ? 'warning' : 'success'}">
                        ${user.isLocked ? 'مقفل' : 'نشط'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="AdminSystem.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-${user.isLocked ? 'success' : 'warning'}" 
                                onclick="AdminSystem.toggleUserLock(${user.id})">
                            <i class="fas fa-${user.isLocked ? 'unlock' : 'lock'}"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="AdminSystem.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // تصفية المعاملات
    filterTransactions: function(searchTerm) {
        const transactions = BankingSystem.transactions.filter(t =>
            t.fromAccount.includes(searchTerm) ||
            t.toAccount.includes(searchTerm) ||
            t.id.toString().includes(searchTerm)
        ).slice(-20).reverse();
        
        const container = document.getElementById('transactionsTable');
        if (!container) return;
        
        container.innerHTML = transactions.map(t => {
            const fromUser = BankingSystem.users.find(u => u.accountNumber === t.fromAccount);
            const toUser = BankingSystem.users.find(u => u.accountNumber === t.toAccount);
            
            return `
                <tr>
                    <td>${t.id}</td>
                    <td>
                        ${fromUser ? fromUser.fullName : t.fromAccount}<br>
                        <small>${t.fromAccount}</small>
                    </td>
                    <td>
                        ${toUser ? toUser.fullName : t.toAccount}<br>
                        <small>${t.toAccount}</small>
                    </td>
                    <td>${this.formatCurrency(t.amount)}</td>
                    <td>${this.formatCurrency(t.fee || 0)}</td>
                    <td>
                        <span class="badge bg-${t.status === 'completed' ? 'success' : 'warning'}">
                            ${t.status === 'completed' ? 'مكتمل' : 'معلق'}
                        </span>
                    </td>
                    <td>${new Date(t.timestamp).toLocaleString('ar-SA')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="AdminSystem.viewTransaction(${t.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// تهيئة لوحة الإدارة
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin.html')) {
        AdminSystem.init();
    }
});