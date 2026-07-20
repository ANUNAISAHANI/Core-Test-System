// admin.js - Fully Synced SQL Database Back-End Controller with Segmented A-Z Directories

document.addEventListener('DOMContentLoaded', () => {
    const currentAdmin = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentAdmin || currentAdmin.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('adminName').textContent = `👑 ${currentAdmin.fullName}`;

    document.getElementById('adminLogoutBtn').onclick = () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    };

    // Global Sync Fetch Arrays Parameters
    let localExamsCache = [];
    let currentDirectorySegment = 'students'; // Default viewer state track

    // ==================== TAB SWITCH ENGINE ====================
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = document.getElementById(`${btn.dataset.tab}Tab`);
            if (targetTab) targetTab.classList.add('active');

            if (btn.dataset.tab === 'questions') { loadQuestions(); updateSubjectDropdown(); }
            if (btn.dataset.tab === 'results') loadAllResults();
            if (btn.dataset.tab === 'users') loadDirectoryHub();
            if (btn.dataset.tab === 'exams') loadAllExams();
        });
    });

    // ==================== QUESTIONS CORE MODULE (WITH BULK SELECTION & FILTER) ====================
    let allQuestionsGlobalCache = []; // Subject filtering ke liye helper cache

    function loadQuestions() {
        fetch('/api/questions')
        .then(res => res.json())
        .then(questions => {
            allQuestionsGlobalCache = questions;
            populateFilterDropdown(questions);
            renderQuestionsList(questions);
        });
    }

    // Filter Dropdown elements create karne ke liye
    function populateFilterDropdown(questions) {
        const filterSelect = document.getElementById('filterSubjectSelector');
        if (!filterSelect) return;
        
        // Unique subjects nikalne ke liye
        const subjects = [...new Set(questions.map(q => q.subject))];
        const currentValue = filterSelect.value;
        
        filterSelect.innerHTML = '<option value="ALL">Show All Subjects</option>' + 
            subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
            
        if (subjects.includes(currentValue) || currentValue === 'ALL') {
            filterSelect.value = currentValue;
        }
    }

    // UI list display handler
    function renderQuestionsList(questions) {
        const container = document.getElementById('questionsList');
        if (!container) return;
        
        // Reset checkall box on refresh
        const mainCheck = document.getElementById('selectAllQuestionsCheckbox');
        if (mainCheck) mainCheck.checked = false;

        container.innerHTML = questions.map((q) => `
            <div class="question-item" data-subject="${q.subject}" style="position: relative; padding-left: 45px;">
                <div style="position: absolute; left: 15px; top: 20px;">
                    <input type="checkbox" class="question-select-checkbox" data-id="${q.id}" onchange="checkBulkBarState()" style="transform: scale(1.3); cursor: pointer;">
                </div>
                <div class="question-header">
                    <strong>📚 Subject Module: ${q.subject}</strong>
                    <button onclick="deleteQuestionItem(${q.id})" class="delete-btn">🗑️ Delete</button>
                </div>
                <div class="question-text-preview">${escapeHtml(q.text)}</div>
                <div class="question-options">
                    A: ${escapeHtml(q.options[0])} | B: ${escapeHtml(q.options[1])} | C: ${escapeHtml(q.options[2])} | D: ${escapeHtml(q.options[3])}
                </div>
                <div style="color:#27ae60; font-size:0.9rem; font-weight:600; margin-top:5px;">
                    ✅ Validated Correct Option: ${['A','B','C','D'][q.correct]}
                </div>
            </div>
        `).join('') || '<p class="empty-state">No individual questions matched inside database storage.</p>';
    }

    // Dropdown change trigger handler
    window.filterQuestionsBySubject = function() {
        const targetSubject = document.getElementById('filterSubjectSelector').value;
        if (targetSubject === 'ALL') {
            renderQuestionsList(allQuestionsGlobalCache);
        } else {
            const filtered = allQuestionsGlobalCache.filter(q => q.subject === targetSubject);
            renderQuestionsList(filtered);
        }
    };

    // Toggle Select All display state
    window.toggleSelectAllQuestions = function(masterCanvas) {
        const checkboxes = document.querySelectorAll('.question-select-checkbox');
        checkboxes.forEach(cb => {
            if (cb.offsetParent !== null) { // Sirf visible filter questions select honge
                cb.checked = masterCanvas.checked;
            }
        });
    };

    window.checkBulkBarState = function() {
        const visibleCheckboxes = Array.from(document.querySelectorAll('.question-select-checkbox')).filter(cb => cb.offsetParent !== null);
        const checkedBoxes = visibleCheckboxes.filter(cb => cb.checked);
        const mainCheck = document.getElementById('selectAllQuestionsCheckbox');
        
        if (mainCheck && visibleCheckboxes.length > 0) {
            mainCheck.checked = (visibleCheckboxes.length === checkedBoxes.length);
        }
    };

    // 🎯 NEW: EXECUTE BULK DATA WIPE ROW INDEX
    window.executeBulkDeleteQuestions = function() {
        const checkedBoxes = Array.from(document.querySelectorAll('.question-select-checkbox')).filter(cb => cb.checked);
        const targetIds = checkedBoxes.map(cb => parseInt(cb.dataset.id));

        if (targetIds.length === 0) {
            alert("⚠️ Please select at least one question card to delete!");
            return;
        }

        if (confirm(`🚨 Are you sure you want to delete all ${targetIds.length} selected questions permanently from SQL database?`)) {
            // Har selected ID ko loop chalakar async hit delete marenge backend par
            const deletePromises = targetIds.map(id => 
                fetch(`/api/questions/delete/${id}`, { method: 'DELETE' })
            );

            Promise.all(deletePromises)
            .then(() => {
                alert("🗑️ Selected question dataset wiped out successfully!");
                loadQuestions(); // List refresh
            })
            .catch(err => {
                console.error("Bulk cleanup fail:", err);
                alert("Error executing database row cleanup action.");
            });
        }
    };

    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.onsubmit = (e) => {
            e.preventDefault();
            const qPayload = {
                subject: document.getElementById('questionSubject').value,
                text: document.getElementById('questionText').value,
                options: [
                    document.getElementById('optionA').value,
                    document.getElementById('optionB').value,
                    document.getElementById('optionC').value,
                    document.getElementById('optionD').value
                ],
                correct: parseInt(document.getElementById('correctAnswer').value)
            };

            fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(qPayload)
            })
            .then(res => res.json())
            .then(() => {
                document.getElementById('questionModal').style.display = 'none';
                loadQuestions();
                questionForm.reset();
                // 🎯 FIXED: Page refresh on manual submit explicitly blocked to retain transaction continuity
            });
        };
    }

    // ==================== INTERACTIVE WINDOW MODAL CONTROLLERS ====================
    document.querySelectorAll('.close, .close-modal').forEach(btn => {
        btn.onclick = function() {
            document.getElementById('questionModal').style.display = 'none';
            document.getElementById('examModal').style.display = 'none';
            document.getElementById('teacherModal').style.display = 'none';
            document.getElementById('editTeacherModal').style.display = 'none';
        };
    });

    document.getElementById('addQuestionBtn').onclick = () => {
        updateSubjectDropdown();
        document.getElementById('questionModal').style.display = 'block';
    };

    window.deleteQuestionItem = (qId) => {
        if (confirm("Permanently delete this question string from SQL?")) {
            fetch(`/api/questions/delete/${qId}`, { method: 'DELETE' })
            .then(() => loadQuestions());
        }
    };


    // ==================== EXAMS CARDS GENERATOR ====================
    function loadAllExams() {
        fetch('/api/exams')
        .then(res => res.json())
        .then(exams => {
            const container = document.getElementById('examsList');
            if (!container) return;

            container.style.display = "grid";
            container.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
            container.style.gap = "20px";

            container.innerHTML = exams.map((exam) => `
                <div class="exam-item-admin" style="border-left: 5px solid #4f46e5; background: white; padding: 1.2rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size: 1.8rem; margin-bottom:5px;">${exam.icon || '📝'}</div>
                    <h3 style="margin:0; color:#333;">${exam.subject}</h3>
                    <p style="color:gray; font-size:0.85rem; margin:4px 0;">${exam.topic || 'General Module'}</p>
                    <div class="exam-stats" style="margin-top:10px; display: flex; gap: 15px; font-size:0.85rem; color:#666;">
                        <span>⏱️ ${exam.duration / 60} Mins</span>
                        <span>🎯 Limit: ${exam.totalQuestions} Qs</span>
                    </div>
                    <div style="margin-top: 15px;">
                        <button onclick="deleteExamCard(${exam.id})" class="btn btn-small btn-outline" style="color:red; border-color:#fee2e2; width:100%; cursor:pointer;">Delete Configuration</button>
                    </div>
                </div>
            `).join('') || '<p class="empty-state">No exam configuration cards deployed.</p>';
        });
    }

    const examForm = document.getElementById('examForm');
    if (examForm) {
       examForm.onsubmit = (e) => {
        e.preventDefault();
        const exPayload = {
            subject: document.getElementById('examSubject').value.trim(),
            topic: document.getElementById('examTopic').value.trim(),
            icon: document.getElementById('examIcon').value.trim(),
            duration: parseInt(document.getElementById('examDuration').value) * 60,
            totalQuestions: parseInt(document.getElementById('examTotalQ').value),
            // 🎯 FIXED: Semester and Target Branch fields mapped safely inside original payload
            semester: document.getElementById('examSemester').value,
            course_branch: document.getElementById('examCourseBranch').value
        };

        fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exPayload)
        })
        .then(res => res.json())
        .then(() => {
            document.getElementById('examModal').style.display = 'none';
            loadAllExams();
            examForm.reset();
            // 🎯 FIXED: Reset dropdown selects back to original indexes
            document.getElementById('examCourseBranch').value = "ALL";
            document.getElementById('examSemester').value = "";
        });
    };
    }

    document.getElementById('addExamBtn').onclick = () => { document.getElementById('examModal').style.display = 'block'; };

    window.deleteExamCard = (examId) => {
        if (confirm("Are you sure you want to drop this exam node configurations?")) {
            fetch(`/api/exams/delete/${examId}`, { method: 'DELETE' })
            .then(() => loadAllExams());
        }
    };

   // ==================== RESULTS TRACKING REPORT ====================
    function loadAllResults() {
        fetch('/api/results')
        .then(res => res.json())
        .then(results => {
            const container = document.getElementById('allResultsList');
            
            const studentAttemptTracker = {};
            
            results.forEach(r => {
                const trackerKey = `${r.userId}_${r.examSubject}`;
                if (!studentAttemptTracker[trackerKey]) {
                    studentAttemptTracker[trackerKey] = 0;
                }
                studentAttemptTracker[trackerKey]++;
                r.calculatedAttempt = r.attemptNumber || studentAttemptTracker[trackerKey];
            });

            container.innerHTML = results.slice().reverse().map(r => `
                <div class="result-item" style="background: white; padding: 1.2rem; border-radius: 8px; margin-bottom: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border-left: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex-grow: 1;">
                        <div class="result-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                            <strong>👤 Student: ${r.userName} ${r.roll_number ? `(${r.roll_number})` : ''}</strong>
                            <span class="feedback-badge feedback-good" style="font-size:0.75rem; padding: 2px 8px; border-radius: 10px; background: #e0f2fe; color: #0369a1; font-weight: bold;">Score: ${parseFloat(r.percentage).toFixed(2)}%</span>
                        </div>
                        <div style="font-size:0.85rem; color:#666; margin-top:5px;">
                            Branch: <b>${r.course_branch || 'N/A'}</b> | Section: <b>${r.section || 'N/A'}</b> | Subject: <b>${r.examSubject}</b> (Attempt #${r.calculatedAttempt})
                        </div>
                        <div style="font-size:0.75rem; color:#888; margin-top:4px; display:flex; justify-content:space-between; padding-right: 20px;">
                            <span>Reason Node: ${r.reason || 'Normal Termination'}</span>
                            <span>Date: ${r.submittedAt || r.timestamp || '14/06/2026'}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; margin-left: 15px;">
                        <button onclick="viewDetailedExamSheetAdmin(${r.id || r.resultId})" class="view-btn" style="background:#4f46e5; color:white; border:none; padding:8px 14px; border-radius:5px; font-size:0.8rem; cursor:pointer; font-weight:500; transition:all 0.2s; white-space: nowrap;">
                            👁️ View Exam
                        </button>
                    </div>
                </div>
            `).join('') || '<p class="empty-state">No active candidate submissions recorded.</p>';
        });
    }

    document.getElementById('exportResultsBtn').onclick = () => {
        fetch('/api/results')
        .then(res => res.json())
        .then(results => {
            if (results.length === 0) return alert("Logs empty!");
            let csv = "RollNumber,Candidate,Branch,Section,Subject,PercentageScore,AttemptNo,Timestamp\n";
            results.forEach(r => csv += `"${r.roll_number || ''}","${r.userName}","${r.course_branch || ''}","${r.section || ''}","${r.examSubject}","${r.percentage}%","${r.attemptNumber}","${r.submittedAt}"\n`);
            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'CoreTest_Comprehensive_Report.csv';
            link.click();
        });
    };

    // ==================== UPGRADED ALPHABETICAL HUB ACTIONS ====================
    document.getElementById('showStudentsBtn').onclick = function() {
        currentDirectorySegment = 'students';
        this.classList.add('active');
        document.getElementById('showTeachersBtn').classList.remove('active');
        loadDirectoryHub();
    };

    document.getElementById('showTeachersBtn').onclick = function() {
        currentDirectorySegment = 'teachers';
        this.classList.add('active');
        document.getElementById('showStudentsBtn').classList.remove('active');
        loadDirectoryHub();
    };

    document.getElementById('addTeacherBtn').onclick = () => {
        document.getElementById('teacherModal').style.display = 'block';
    };

    function loadDirectoryHub() {
    fetch('/api/users')
        .then(res => res.json())
        .then(users => {
            const container = document.getElementById('usersList');
            if (!container) return;

            if (currentDirectorySegment === 'students') {
                const studentsList = users.filter(u => u.role === 'student');
                container.innerHTML = studentsList.map(u => `
                    <div class="user-item" style="border-left: 4px solid #3498db; background:white; padding:1rem; border-radius:8px; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display: flex; align-items: center;">
                            <img src="${u.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 1px solid #e2e8f0;">
                            <div>
                                <div style="font-weight:600; color:#333; font-size:1.05rem;">Name: ${u.fullName}</div>
                                <div style="font-size:0.85rem; color:#666; margin-top:4px;">
                                    Roll No: <b style="color:#333;">${u.roll_number || 'Not Configured'}</b> | Course: <b>${u.course_branch || 'N/A'}</b> | Section: <b>${u.section || 'N/A'}</b> | Semester: <b>${u.semester || 'Semester-1'}</b>
                                </div>
                                <div style="font-size:0.8rem; color:#888; margin-top:2px;">Email: ${u.email} | Tel: ${u.phone || 'None'}</div>
                            </div>
                        </div>
                        <button onclick="dropUserNode(${u.id})" class="delete-btn" style="padding: 6px 12px; font-size:0.8rem;">Remove Student</button>
                    </div>
                `).join('') || '<p class="empty-state">No students found inside database rows.</p>';
            } else {
                const teachersList = users.filter(u => u.role === 'teacher');
                container.innerHTML = teachersList.map(u => `
                    <div class="user-item" style="border-left: 4px solid #2e7d32; background:white; padding:1rem; border-radius:8px; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display: flex; align-items: center;">
                            <img src="${u.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 1px solid #e2e8f0;">
                            <div>
                                <div style="font-weight:600; color:#2e7d32; font-size:1.05rem;">Faculty Name: ${u.fullName}</div>
                                <div style="font-size:0.85rem; color:#666; margin-top:4px;">
                                    Teacher ID: <b style="color:#333;">${u.teacher_id || 'N/A'}</b> | Department: <b>${u.course_branch}</b> | Charge Section: <b>${u.section}</b>
                                </div>
                                <div style="font-size:0.8rem; color:#888; margin-top:2px;">Official Mail: ${u.email} | Contact Link: ${u.phone || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button onclick="openEditTeacherPopup(${JSON.stringify(u).replace(/"/g, '&quot;')})" class="btn btn-small" style="background:#667eea; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️ Edit Profile</button>
                            <button onclick="dropUserNode(${u.id})" class="delete-btn" style="padding: 5px 10px; font-size:0.8rem;">Terminate</button>
                        </div>
                    </div>
                `).join('') || '<p class="empty-state">No faculty accounts registered yet. Use "+ Add New Faculty" button above.</p>';
            }
        });
}

    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
        teacherForm.onsubmit = (e) => {
            e.preventDefault();
            const teacherPayload = {
                teacherId: document.getElementById('teacherId').value.trim(),
                fullName: document.getElementById('teacherName').value.trim(),
                email: document.getElementById('teacherEmail').value.trim(),
                phone: document.getElementById('teacherPhone').value.trim(),
                courseBranch: document.getElementById('teacherCourse').value,
                section: document.getElementById('teacherSection').value,
                password: document.getElementById('teacherPassword').value
            };

            fetch('/api/admin/create-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teacherPayload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("🎉 Faculty Token Locked Successfully!");
                    document.getElementById('teacherModal').style.display = 'none';
                    teacherForm.reset();
                    loadDirectoryHub();
                } else {
                    alert("❌ Deployment Error: " + data.message);
                }
            });
        };
    }

    window.openEditTeacherPopup = (teacherObj) => {
        document.getElementById('editTeacherDbId').value = teacherObj.id;
        document.getElementById('editTeacherId').value = teacherObj.teacher_id || '';
        document.getElementById('editTeacherName').value = teacherObj.fullName;
        document.getElementById('editTeacherPhone').value = teacherObj.phone || '';
        document.getElementById('editTeacherCourse').value = teacherObj.course_branch || 'B.Tech (CS)';
        document.getElementById('editTeacherSection').value = teacherObj.section || 'None'; 
        document.getElementById('editTeacherModal').style.display = 'block';
    };

    const editTeacherForm = document.getElementById('editTeacherForm');
    if (editTeacherForm) {
        editTeacherForm.onsubmit = (e) => {
            e.preventDefault();
            const updatedPayload = {
                id: parseInt(document.getElementById('editTeacherDbId').value),
                teacherId: document.getElementById('editTeacherId').value.trim(),
                fullName: document.getElementById('editTeacherName').value.trim(),
                phone: document.getElementById('editTeacherPhone').value.trim(),
                courseBranch: document.getElementById('editTeacherCourse').value,
                section: document.getElementById('editTeacherSection').value
            };

            fetch('/api/admin/edit-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("✏️ Faculty Records Patched Successfully!");
                    document.getElementById('editTeacherModal').style.display = 'none';
                    loadDirectoryHub();
                } else {
                    alert("❌ Edit Failed: " + data.message);
                }
            });
        };
    }

    window.dropUserNode = (userId) => {
        if (confirm("🚨 Wipe credential record nodes permanently from tables row index?")) {
            fetch(`/api/users/delete/${userId}`, { method: 'DELETE' })
            .then(() => loadDirectoryHub());
        }
    };

    // ==================== ADVANCED DATA HISTORY SEARCH ====================
    document.getElementById('searchStudentBtn').onclick = () => {
        const query = document.getElementById('studentSearchInput').value.toLowerCase().trim();
        if (!query) return alert("Provide string or unique roll number query payload!");

        Promise.all([
            fetch('/api/users').then(res => res.json()),
            fetch('/api/results').then(res => res.json())
        ])
        .then(([users, results]) => {
            const student = users.find(u => 
                u.email.toLowerCase().includes(query) || 
                u.fullName.toLowerCase().includes(query) || 
                (u.roll_number && u.roll_number.toLowerCase().includes(query))
            );
            const resultDiv = document.getElementById('studentSearchResult');
            
            if (!student) {
                resultDiv.innerHTML = '<p style="color:red; text-align:center; padding:15px;">No structural data entry found for this tracking string context.</p>';
                return;
            }

            const personalAttempts = results.filter(r => r.userId == student.id);
            
            const subjectCounters = {};
            personalAttempts.forEach(r => {
                const sub = r.examSubject || 'General';
                if (!subjectCounters[sub]) {
                    subjectCounters[sub] = 0;
                }
                subjectCounters[sub]++;
                r.calculatedSubjectAttempt = r.attemptNumber || subjectCounters[sub];
            });

            resultDiv.innerHTML = `
                <div style="background:#f1f5f9; padding:15px; border-radius:10px; margin-bottom:15px;">
                    <h4>Verified Candidate File: 👤 ${student.fullName}</h4>
                    <p style="font-size:0.85rem; color:#555; margin-top: 4px;">
                        Roll Number: <b>${student.roll_number || 'N/A'}</b> | Course Branch: <b>${student.course_branch || 'N/A'}</b> | Section: <b>${student.section || 'N/A'}</b>
                    </p>
                    <p style="font-size:0.8rem; color:#777; margin-top:2px;">Email Identifier: ${student.email} | Telephone: ${student.phone || 'None'}</p>
                </div>
                ${personalAttempts.length > 0 ? personalAttempts.slice().reverse().map((r) => {
                    return `
                        <div style="padding:12px; border:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:white; margin-bottom:5px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <span>📝 Paper subject: <b>${r.examSubject}</b> - Grade: <b>${r.percentage}%</b> (Attempt Tracker: # ${r.calculatedSubjectAttempt})</span>
                            <div style="display:flex; gap:8px;">
                                <button onclick="viewDetailedExamSheetAdmin(${r.id || r.resultId})" class="view-btn" style="background:#4f46e5; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">👁️ View</button>
                                <button onclick="wipeSpecificResult(${r.id})" class="delete-btn" style="padding:4px 10px; font-size:11px; border-radius:4px;">Drop Logs</button>
                            </div>
                        </div>
                    `;
                }).join('') : '<p style="text-align:center; padding:10px; color:#666;">No historical examination sheets logged under this student profile.</p>'}
            `;
        });
    };

    document.getElementById('clearSearchBtn').onclick = () => {
        document.getElementById('studentSearchInput').value = '';
        document.getElementById('studentSearchResult').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Enter details to search history</p>';
    };

    window.wipeSpecificResult = (resId) => {
        if (confirm("Drop this single examination sheet index? This restores 1 attempt to the student account.")) {
            fetch(`/api/results/delete/${resId}`, { method: 'DELETE' })
            .then(() => document.getElementById('searchStudentBtn').click());
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadQuestions();
    updateSubjectDropdown();

    // ==================== ADMINISTRATIVE NUCLEAR SEMESTER BULK CLEANUP ====================
    const wipeBtn = document.getElementById('executeNuclearWipeBtn');
    if (wipeBtn) {
        wipeBtn.onclick = function() {
            const chosenSem = document.getElementById('cleanupSemesterSelector').value;
            
            if (!chosenSem) {
                alert("⚠️ Request Denied: Please choose a valid target semester from the dropdown first!");
                return;
            }
            
            const firstCheck = confirm(`⚠️ EXTREME WARNING!!!\n\nIs semester ka saara data delete karne jaa rahe hain.\nIsse is semester ke saare Exams aur bacchon ke purane marks hamesha ke liye mit jayenge.`);

            if (!firstCheck) {
                console.log("Cleanup cancelled at first layer.");
                return;
            }

            const secondCheck = prompt(`🚨 ULTIMATE SECURITY VALIDATION LAYER:\n\nSAB KUCH MITANE KE LIYE, niche diye gaye box mein exact capital letters mein "DELETE" likhein:`);

            if (secondCheck === "DELETE") {
                fetch('/api/admin/bulk-cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ semester: chosenSem })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        window.location.reload();
                    } else {
                        alert(`❌ Operational Failure: ${data.message}`);
                    }
                })
                .catch(err => {
                    console.error("Critical cleanup network crash:", err);
                    alert("🚨 Network error! Backend cluster connection dropped.");
                });
            } else {
                alert("❌ Validation Failed: Aapne sahi keyphrase nahi likha. Cleanup action aborted!");
            }
        };
    }
});

// ==================== 🎯 GLOBAL RESPONSE SHEET MODAL FOR ADMIN PANEL (FIXED ESCAPE) ====================
window.viewDetailedExamSheetAdmin = function(resultId) {
    if (!resultId) {
        alert("Exam sheet identifier missing.");
        return;
    }

    fetch(`/api/get_result_detail/${resultId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert("⚠️ Error: " + data.message);
                return;
            }

            const oldModal = document.getElementById('adminExamModal');
            if (oldModal) oldModal.remove();

            const fullQuestions = data.questions || [];

            const modalHtml = `
                <div id="adminExamModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:99999;">
                    <div style="background:white; padding:25px; border-radius:12px; width:90%; max-width:680px; max-height:85vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family: sans-serif;">
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:12px; margin-bottom:15px;">
                            <h3 style="margin:0; color:#0f172a; font-size:1.3rem;">📄 Candidate Response Sheet (Admin View)</h3>
                            <button onclick="document.getElementById('adminExamModal').remove()" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#94a3b8;">&times;</button>
                        </div>
                        
                        <div style="margin-bottom:20px; font-size:0.9rem; background:#f1f5f9; padding:12px; border-radius:8px; color:#334155; display:flex; gap:15px; flex-wrap:wrap;">
                            <div><b>Subject:</b> <span style="color:#4f46e5;">${data.subject}</span></div>
                            <div>| <b>Candidate:</b> <span>${data.studentName}</span></div>
                            <div>| <b>Score:</b> <span style="color:#16a34a; font-weight:bold;">${parseFloat(data.percentage).toFixed(2)}%</span></div>
                        </div>

                        <div id="adminQuestionsContainer">
                            ${fullQuestions.map((q, index) => {
                                const opts = q.options || {};
                                const bachaAns = String(q.selectedOption || '').trim().toUpperCase();
                                const sahiAns = String(q.correctOption || '').trim().toUpperCase();
                                const isCorrect = (bachaAns === sahiAns);

                                return `
                                    <div style="padding:15px; border:2px solid ${isCorrect ? '#16a34a' : '#dc2626'}; border-radius:10px; margin-bottom:15px; background:${isCorrect ? '#f0fdf4' : '#fdf2f2'}; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                        <p style="margin:0 0 12px 0; font-weight:600; color:#1e293b; font-size:0.95rem;">Q${index + 1}. ${escapeHtml(q.questionText)}</p>
                                        
                                        <div style="display:grid; grid-template-columns: 1fr; gap:8px; margin-bottom:12px; font-size:0.88rem;">
                                            ${['A', 'B', 'C', 'D'].map(key => {
                                                const isCurrentSahi = (key === sahiAns);
                                                const isCurrentBachaSelection = (key === bachaAns);

                                                let optBg = '#ffffff';
                                                let optBorder = '#cbd5e1';
                                                let optBadge = '';

                                                if (isCurrentSahi) {
                                                    optBg = '#dcfce7';
                                                    optBorder = '#16a34a';
                                                    optBadge += ' <span style="background:#16a34a; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-left:10px;">Sahi Answer ✔</span>';
                                                }
                                                
                                                if (isCurrentBachaSelection) {
                                                    optBg = isCurrentSahi ? '#dcfce7' : '#fee2e2';
                                                    optBorder = isCurrentSahi ? '#16a34a' : '#dc2626';
                                                    optBadge += ` <span style="background:${isCurrentSahi ? '#15803d' : '#dc2626'}; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-left:10px;">Bache ka Selection 🟢</span>`;
                                                }

                                                return `
                                                    <div style="padding:10px 12px; border:2px solid ${optBorder}; background:${optBg}; border-radius:6px; color:#334155; display:flex; justify-content:space-between; align-items:center;">
                                                        <div><b>(${key})</b> ${escapeHtml(opts[key] || '')}</div>
                                                        <div>${optBadge}</div>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                        
                                        <div style="font-size:0.82rem; font-weight:bold; color:${isCorrect ? '#16a34a' : '#dc2626'}; margin-top:5px;">
                                            ${isCorrect ? '✔ Response Sheet Checked: Verified (Correct Attempt)' : '✖ Response Sheet Checked: Marks Deducted (Incorrect Attempt)'}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        })
        .catch(err => {
            console.error("Error fetching detail logs:", err);
            alert("System error fetching response sheet logs.");
        });
};

// 🎯 FIXED: Missing html sanitizer parser function helper for admin panel modal text tags
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


function uploadBulkQuestions() {
    const fileInput = document.getElementById('csvFile'); // HTML mein id="csvFile" hai
    const subjectSelect = document.getElementById('questionSubject'); // HTML mein id="questionSubject" hai
    
    if (!fileInput || fileInput.files.length === 0) {
        alert("Admin saheb, pehle CSV file toh select karo!");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    if (subjectSelect) {
        formData.append("subject", subjectSelect.value);
    } else {
        // Agar id alag ho toh fallback ke liye "Web Tech New" bhej dete hain
        formData.append("subject", "Web Tech New");
    }

    // Backend upload API call
    fetch('/api/admin/bulk-upload-questions', {  
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Saare questions ek jhatke mein upload ho gaye hain! 🔥");
            window.location.reload();
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => {
        console.error("Upload error:", error);
        alert("Kuch dikkat aayi sheet upload karne mein.");
    });
}




// ==========================================================================
// 🎯 FIXED: FULL ENGINE RECOVERY WITH EDIT PROFILE BUTTON RESTORED
// ==========================================================================

let globalCachedUsers = [];
let globalCachedResults = [];

// 1. Directory Filters Logic (Strict String Contains & State Mapping)
function applyDirectoryFilters() {
    const branch = document.getElementById('dirFilterBranch').value;
    const sem = document.getElementById('dirFilterSemester').value;
    const sec = document.getElementById('dirFilterSection').value;
    const container = document.getElementById('usersList');
    
    if (!container || !globalCachedUsers.length) return;

    const activeTab = typeof currentDirectorySegment !== 'undefined' ? currentDirectorySegment : 'students';

    if (activeTab === 'teachers') {
        document.getElementById('dirFilterSemester').style.display = 'none';
        document.getElementById('dirFilterSection').style.display = 'none';
    } else {
        document.getElementById('dirFilterSemester').style.display = 'inline-block';
        document.getElementById('dirFilterSection').style.display = 'inline-block';
    }

    let filtered = globalCachedUsers.filter(u => u.role === (activeTab === 'students' ? 'student' : 'teacher'));

    if (branch !== 'ALL') {
        filtered = filtered.filter(u => {
            const userBranch = (u.course_branch || '').toUpperCase();
            const targetBranch = branch.toUpperCase();
            return userBranch.includes(targetBranch) || targetBranch.includes(userBranch);
        });
    }
    
    if (activeTab === 'students') {
        if (sem !== 'ALL') filtered = filtered.filter(u => u.semester === sem);
        if (sec !== 'ALL') {
            if (sec === 'NO_SECTION') {
                filtered = filtered.filter(u => !u.section || u.section === 'N/A' || u.section === '' || u.section === 'None');
            } else {
                filtered = filtered.filter(u => u.section === sec);
            }
        }
    }

    filtered.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

    if (activeTab === 'students') {
        container.innerHTML = filtered.map(u => `
            <div class="user-item" style="border-left: 4px solid #2e7d32; background:white; padding:1.2rem; border-radius:8px; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${u.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-weight:600; color:#334155; font-size:1.05rem;">Name: ${u.fullName}</div>
                        <div style="font-size:0.88rem; color:#64748b; margin-top:4px;">
                            Roll No: <b style="color:#1e293b;">${u.roll_number || 'N/A'}</b> | Course: <b>${u.course_branch || 'N/A'}</b> | Section: <b>${u.section || 'N/A'}</b> | Semester: <b>${u.semester || 'Semester-1'}</b>
                        </div>
                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Email: ${u.email} | Tel: ${u.phone || 'N/A'}</div>
                    </div>
                </div>
                <button onclick="dropUserNode(${u.id})" class="delete-btn" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">Remove Student</button>
            </div>
        `).join('') || '<p style="text-align:center; color:#64748b; padding:20px;">No matching students found inside parameters.</p>';
    } else {
        container.innerHTML = filtered.map(u => {
            // Safe escape query for JSON formatting strings compatibility
            const stringifiedUser = JSON.stringify(u).replace(/"/g, '&quot;');
            return `
                <div class="user-item" style="border-left: 4px solid #4f46e5; background:white; padding:1.2rem; border-radius:8px; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${u.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight:600; color:#4f46e5; font-size:1.05rem;">Faculty Name: ${u.fullName}</div>
                            <div style="font-size:0.88rem; color:#64748b; margin-top:4px;">
                                Teacher ID: <b style="color:#1e293b;">${u.teacher_id || 'N/A'}</b> | Department: <b>${u.course_branch}</b> | Charge Section: <b>${u.section || 'N/A'}</b>
                            </div>
                            <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Official Mail: ${u.email} | Contact Link: ${u.phone || 'N/A'}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <!-- 🎯 RESTORED: Edit Profile Trigger Button UI Node Layer -->
                        <button onclick="openEditTeacherPopup(${stringifiedUser})" class="btn btn-small" style="background:#667eea; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">✏️ Edit Profile</button>
                        <button onclick="dropUserNode(${u.id})" class="delete-btn" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">Terminate</button>
                    </div>
                </div>
            `;
        }).join('') || '<p style="text-align:center; color:#64748b; padding:20px;">No matching faculty members found.</p>';
    }
}

// 2. Track Results Multi-Filter Logic (Loose String Contains Check)
function applyResultFilters() {
    const branch = document.getElementById('resFilterBranch').value;
    const sem = document.getElementById('resFilterSemester').value;
    const sec = document.getElementById('resFilterSection').value;
    const sub = document.getElementById('resFilterSubject') ? document.getElementById('resFilterSubject').value : 'ALL';
    const container = document.getElementById('allResultsList');

    if (!container || !globalCachedResults.length) return;

    let filtered = [...globalCachedResults];

    if (branch !== 'ALL') {
        filtered = filtered.filter(r => {
            const bData = (r.course_branch || r.user_branch || '').toUpperCase();
            return bData.includes(branch.toUpperCase()) || branch.toUpperCase().includes(bData);
        });
    }
    if (sem !== 'ALL') filtered = filtered.filter(r => r.semester === sem || r.user_semester === sem);
    if (sec !== 'ALL') {
        if (sec === 'NO_SECTION') {
            filtered = filtered.filter(r => !r.section || r.section === 'N/A' || r.section === '' || r.section === 'None');
        } else {
            filtered = filtered.filter(r => r.section === sec || r.user_section === sec);
        }
    }
    if (sub !== 'ALL') {
        filtered = filtered.filter(r => (r.examSubject || r.subject) === sub);
    }

    filtered.sort((a, b) => (a.userName || a.studentName || '').localeCompare(b.userName || a.studentName || ''));

    // Attempt tracker calculation
    const studentAttemptTracker = {};
    filtered.forEach(r => {
        const trackerKey = `${r.userId || r.studentId}_${r.examSubject || r.subject}`;
        if (!studentAttemptTracker[trackerKey]) {
            studentAttemptTracker[trackerKey] = 0;
        }
        studentAttemptTracker[trackerKey]++;
        r.calculatedAttempt = r.attemptNumber || studentAttemptTracker[trackerKey];
    });

    container.innerHTML = filtered.slice().reverse().map(r => {
        const examSubName = r.examSubject || r.subject || 'General Paper';
        const studentNameVal = r.userName || r.studentName || 'Unknown Student';
        const scorePercentage = parseFloat(r.percentage || 0).toFixed(2);
        
        // Cheating / Normal Status Logic
        const reasonText = r.reason || r.status || 'Normal Submission';
        const isCheating = reasonText.toLowerCase().includes('cheat') || reasonText.toLowerCase().includes('tab') || reasonText.toLowerCase().includes('switch') || reasonText.toLowerCase().includes('warning');
        
        const statusBadge = isCheating 
            ? `<span style="font-size:0.75rem; padding: 2px 8px; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: bold; margin-left: 8px;">⚠️ Cheating Detected</span>`
            : `<span style="font-size:0.75rem; padding: 2px 8px; border-radius: 10px; background: #dcfce7; color: #166534; font-weight: bold; margin-left: 8px;">✅ Normal Submission</span>`;

        // Timing formatting
        let formattedTime = 'N/A';
        const rawTime = r.submittedAt || r.timestamp;
        if (rawTime) {
            const dateObj = new Date(rawTime);
            if (!isNaN(dateObj.getTime())) {
                formattedTime = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            } else {
                formattedTime = rawTime;
            }
        }

        return `
            <div class="result-item" style="background: white; padding: 1.2rem; border-radius: 8px; margin-bottom: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border-left: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex-grow: 1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <strong>👤 Student: ${studentNameVal} ${r.roll_number ? `(${r.roll_number})` : ''}</strong>
                        <div>
                            <span style="font-size:0.75rem; padding: 2px 8px; border-radius: 10px; background: #e0f2fe; color: #0369a1; font-weight: bold;">Score: ${scorePercentage}%</span>
                            ${statusBadge}
                        </div>
                    </div>
                    <div style="font-size:0.85rem; color:#666; margin-top:5px;">
                        Branch: <b>${r.course_branch || r.user_branch || 'N/A'}</b> | Section: <b>${r.section || r.user_section || 'N/A'}</b> | Subject: <b style="color:#2e7d32;">${examSubName}</b> (Attempt #${r.calculatedAttempt || 1})
                    </div>
                    <div style="font-size:0.75rem; color:#888; margin-top:4px; display:flex; justify-content:space-between; padding-right: 20px;">
                        <span>Reason Node: ${reasonText}</span>
                        <span>Submitted At: ${formattedTime}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; margin-left: 15px;">
                    <button onclick="viewDetailedExamSheetAdmin(${r.id || r.resultId})" class="view-btn" style="background:#4f46e5; color:white; border:none; padding:8px 14px; border-radius:5px; font-size:0.8rem; cursor:pointer; font-weight:500; transition:all 0.2s; white-space: nowrap;">
                        👁️ View Exam
                    </button>
                </div>
            </div>
        `;
    }).join('') || '<p style="text-align:center; color:#64748b; padding:20px;">No active candidate submissions match current parameters.</p>';
}

// 3. Network Interceptor Setup Injection
const originalFetchHook = window.fetch;
window.fetch = function(...args) {
    return originalFetchHook.apply(this, args).then(res => {
        if (res.ok) {
            const url = args[0];
            if (url === '/api/users') {
                res.clone().json().then(data => {
                    globalCachedUsers = data;
                    setTimeout(applyDirectoryFilters, 100);
                });
            } else if (url.includes('/api/results') && !url.includes('userId=')) {
                res.clone().json().then(data => {
                    globalCachedResults = data;
                    setTimeout(applyResultFilters, 100);
                });
            }
        }
        return res;
    });
};

// Tab Switching Listener Overwrite
document.addEventListener('DOMContentLoaded', () => {
    const studentTabBtn = document.getElementById('showStudentsBtn');
    const teacherTabBtn = document.getElementById('showTeachersBtn');
    
    if(studentTabBtn) {
        studentTabBtn.addEventListener('click', () => {
            currentDirectorySegment = 'students';
            setTimeout(applyDirectoryFilters, 50);
        });
    }
    if(teacherTabBtn) {
        teacherTabBtn.addEventListener('click', () => {
            currentDirectorySegment = 'teachers';
            setTimeout(applyDirectoryFilters, 50);
        });
    }
});


// 🎯 Smart Results-Driven Subject Filter & Question Modal Sync Logic
window.updateSubjectDropdown = function() {
    // 1. Question Modal wala dropdown fix karne ke liye (black line wali problem solve)
    const qSubjectSelect = document.getElementById('questionSubject');
    if (qSubjectSelect) {
        fetch('/api/exams')
        .then(res => res.json())
        .then(exams => {
            const subjects = [...new Set(exams.map(ex => ex.subject))].filter(Boolean);
            const currentQVal = qSubjectSelect.value;
            
            qSubjectSelect.innerHTML = '<option value="" disabled selected>-- Select Target Subject Paper --</option>' + 
                subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
                
            if (subjects.includes(currentQVal)) {
                qSubjectSelect.value = currentQVal;
            }
        })
        .catch(err => console.error("Question subject sync error:", err));
    }

    // 2. Tumhara original track results cascading filter logic
    const branchSelect = document.getElementById('resFilterBranch');
    const subjectSelect = document.getElementById('resFilterSubject');
    
    if (!subjectSelect) return;

    const selectedBranch = branchSelect ? branchSelect.value.trim().toUpperCase() : 'ALL';

    // Hum live exams ki jagah seedhe saved results se data fetch kar rahe hain
    fetch('/api/results')
    .then(res => res.json())
    .then(results => {
        let filteredResults = results;
        
        // Agar koi specific branch select ki hai
        if (selectedBranch && selectedBranch !== 'ALL') {
            filteredResults = results.filter(r => {
                const b = (r.course_branch || r.user_branch || '').trim().toUpperCase();
                return b === '' || b === 'ALL' || b.includes(selectedBranch) || selectedBranch.includes(b);
            });
        }

        // Sirf unhi subjects ko nikalenge jinka result database mein actually exist karta hai
        const subjects = [...new Set(filteredResults.map(r => r.examSubject || r.subject).filter(Boolean))];
        const currentSubVal = subjectSelect.value;

        // Dropdown dynamically populate hoga bas un subjects ke sath jinke results available hain
        subjectSelect.innerHTML = '<option value="ALL">All Subjects</option>' + 
            subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');

        if (subjects.includes(currentSubVal) || currentSubVal === 'ALL') {
            subjectSelect.value = currentSubVal;
        } else {
            subjectSelect.value = 'ALL';
        }

        if (typeof applyResultFilters === 'function') {
            applyResultFilters();
        }
    })
    .catch(err => console.error("Results-driven cascading error:", err));
};



// 🎯 AUTO-TRIGGER & SYNC HOOK FOR BRANCH-SUBJECT CASCADING DROPDOWN
document.addEventListener('DOMContentLoaded', () => {
    // 1. Jaise hi page load ho, ek baar dropdown populate karwa do
    if (typeof updateSubjectDropdown === 'function') {
        updateSubjectDropdown();
    }

    // 2. Jab bhi track results wala branch filter change ho, subject dropdown update ho jaye
    const resFilterBranchElement = document.getElementById('resFilterBranch');
    if (resFilterBranchElement) {
        resFilterBranchElement.addEventListener('change', () => {
            if (typeof updateSubjectDropdown === 'function') {
                updateSubjectDropdown();
            }
        });
    }
});