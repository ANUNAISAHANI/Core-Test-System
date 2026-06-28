// profile.js - Complete User Profile Management with Database Integration (Fully Synced with MySQL)

document.addEventListener('DOMContentLoaded', function() {
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Display primary input user data fields from session
    document.getElementById('profileName').value = currentUser.fullName || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileBranch').value = currentUser.course_branch || 'N/A';
    
    // 🎯 FIXED: Session dropdown loader lock setup
    if (document.getElementById('profileSemester') && currentUser.semester) {
        document.getElementById('profileSemester').value = currentUser.semester || 'Semester-1';
    }
    
    // Smart view layout formatting for different roles
    let roleText = 'Student';
    if (currentUser.role === 'admin') roleText = 'Administrator';
    if (currentUser.role === 'teacher') roleText = 'Faculty Member';
    document.getElementById('profileRole').value = roleText;
    
    document.getElementById('profileJoined').value = currentUser.registeredAt ? new Date(currentUser.registeredAt).toLocaleDateString() : new Date().toLocaleDateString();
    
    // Initialize current avatar view elements
    function refreshAvatarElements(avatarSource) {
        if (!avatarSource) return;
        const mainAvatar = document.getElementById('profileAvatar');
        const navAvatar = document.getElementById('userAvatar');
        if (mainAvatar) mainAvatar.src = avatarSource;
        if (navAvatar) navAvatar.src = avatarSource;
    }
    refreshAvatarElements(currentUser.avatar);
    
    // ==================== FETCH CALCULATED USER STATISTICS FROM DB ====================
    fetch(`/api/results?userId=${currentUser.id}`)
    .then(res => res.json())
    .then(userResults => {
        const totalExams = userResults.length;
        const avgScore = totalExams > 0 
            ? (userResults.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / totalExams).toFixed(1)
            : 0;
        const bestScore = totalExams > 0 
            ? Math.max(...userResults.map(r => parseFloat(r.percentage))).toFixed(1)
            : 0;
        const totalCorrect = userResults.reduce((sum, r) => sum + r.correctAnswers, 0);
        const totalQuestions = userResults.reduce((sum, r) => sum + r.totalQuestions, 0);
        
        function getFeedbackMessage(percent) {
            if (percent < 40) return 'Keep practicing! You can do better! 💪';
            if (percent < 60) return 'Good effort! Keep improving! 👍';
            if (percent < 80) return 'Very good! Almost there! 🌟';
            if (percent < 95) return 'Excellent work! 🏆';
            return 'Outstanding performance! 👑';
        }
        
        document.getElementById('profileStats').innerHTML = `
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-item" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-bottom: 3px solid #667eea;">
                    <div class="stat-value" style="font-size: 1.8rem; font-weight: bold; color: #667eea;">${totalExams}</div>
                    <div class="stat-label" style="color: #666; font-size: 0.85rem;">Exams Taken</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-bottom: 3px solid #667eea;">
                    <div class="stat-value" style="font-size: 1.8rem; font-weight: bold; color: #667eea;">${avgScore}%</div>
                    <div class="stat-label" style="color: #666; font-size: 0.85rem;">Average Score</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-bottom: 3px solid #667eea;">
                    <div class="stat-value" style="font-size: 1.8rem; font-weight: bold; color: #667eea;">${bestScore}%</div>
                    <div class="stat-label" style="color: #666; font-size: 0.85rem;">Best Score</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-bottom: 3px solid #667eea;">
                    <div class="stat-value" style="font-size: 1.5rem; font-weight: bold; color: #667eea; padding-top:4px;">${totalCorrect}/${totalQuestions}</div>
                    <div class="stat-label" style="color: #666; font-size: 0.85rem;">Total Correct</div>
                </div>
            </div>
            ${userResults.length > 0 ? `
                <div style="margin-top: 1rem; padding: 0.75rem; background: #e0e7ff; color: #4338ca; border-radius: 8px; text-align: center; font-weight: 500;">
                    🏆 Overall Feedback: ${getFeedbackMessage(avgScore)}
                </div>
            ` : '<div style="text-align: center; padding: 1rem; color: #888; background:#f8f9fa; border-radius:8px;">No history records found inside database repository.</div>'}
        `;
    })
    .catch(err => console.error("Error loading stats data streams:", err));
    
    // ==================== IMAGE / AVATAR PROCESS ENGINE ====================
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
        
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) { 
                    alert('Image size threshold high! Choose lower dimension below 1MB.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    const avatarUrl = event.target.result;
                    
                    const updatePayload = {
                        id: currentUser.id,
                        fullName: currentUser.fullName,
                        phone: currentUser.phone,
                        avatar: avatarUrl,
                        semester: currentUser.semester || 'Semester-1'
                    };
                    fetch('/api/users/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload)
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            currentUser = data.user;
                            localStorage.setItem('currentUser', JSON.stringify(currentUser));
                            refreshAvatarElements(avatarUrl);
                            alert("📷 Profile image mapped inside system database!");
                        }
                    })
                    .catch(err => console.error("Avatar streaming connection failed:", err));
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // ==================== UPDATE DATA FIELDS TO DYNAMIC SQL ====================
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newName = document.getElementById('profileName').value.trim();
            const newPhone = document.getElementById('profilePhone').value.trim();
            const newPassword = document.getElementById('profileNewPassword').value;
            const confirmPassword = document.getElementById('profileConfirmPassword').value;
            
            // 🎯 FIXED: Extracted chosen dynamic text stream value from select field
            const chosenSemester = document.getElementById('profileSemester') ? document.getElementById('profileSemester').value : (currentUser.semester || 'Semester-1');
            
            if (newPassword && newPassword !== confirmPassword) {
                alert('🚨 Passwords do not match!');
                return;
            }
            
            const updatePayload = {
                id: currentUser.id,
                fullName: newName,
                phone: newPhone,
                avatar: currentUser.avatar || null,
                semester: chosenSemester // 🎯 FIXED: Linked safely to payload object
            };
            if (newPassword) updatePayload.password = newPassword;
            
            fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    alert('🎉 Profile credentials rewritten successfully inside MySQL Database!');
                    
                    document.getElementById('profileNewPassword').value = '';
                    document.getElementById('profileConfirmPassword').value = '';
                    
                    redirectToDashboard(currentUser.role);
                }
            })
            .catch(err => alert("🚨 Update sequence broken via database server connection!"));
        });
    }
    
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            redirectToDashboard(currentUser.role);
        };
    }

    function redirectToDashboard(role) {
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'teacher') {
            window.location.href = 'teacher.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
});