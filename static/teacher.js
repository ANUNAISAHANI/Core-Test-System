// teacher.js - Client Side Read-Only Interactive Directory Evaluation Flow

document.addEventListener('DOMContentLoaded', () => {
    const currentTeacher = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentTeacher || currentTeacher.role !== 'teacher') {
        window.location.href = 'login.html';
        return;
    }

    const hasAvatar = currentTeacher.avatar && currentTeacher.avatar.trim() !== "";

    document.getElementById('facultyTitle').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div id="avatarContainer" style="width: 42px; height: 42px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; cursor: pointer;" title="Click to change profile picture">
                ${hasAvatar ? 
                    `<img src="${currentTeacher.avatar}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">` : 
                    `<svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #4f46e5;">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>`
                }
            </div>
            <span>Welcome, Prof. ${currentTeacher.fullName}</span>
        </div>
    `;

    document.getElementById('facultyScope').textContent = `Official Department: ${currentTeacher.course_branch || 'General Evaluation'} | Assigned Mentor Duty: ${currentTeacher.section || 'None'}`;

    document.getElementById('facultyLogoutBtn').onclick = () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    };

    if (!document.getElementById('avatarUploader')) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'avatarUploader';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        setupAvatarUploadLogic();
    }

    let globalResultsCache = [];

    function loadFacultyLedger() {
        fetch('/api/results')
        .then(res => res.json())
        .then(results => {
            globalResultsCache = results;
           // Yahan paste karo (Line 50-51 ke beech)
            const subSelect = document.getElementById('filterSubject');
            const subjects = [...new Set(results.map(r => r.examSubject || 'General'))];
            subSelect.innerHTML = '<option value="ALL">-- All Subjects --</option>'; // Pehle clear karo taki double na aaye
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                subSelect.appendChild(opt);
            });  
            renderFilteredLedger(); 
        })
        .catch(err => {
            console.error("🚨 Ledger Engine Error:", err);
            document.getElementById('facultyLedgerBody').innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Failed to establish stream link with Sqlite node logs.</td></tr>`;
        });
    }

    function renderFilteredLedger() {
        const tbody = document.getElementById('facultyLedgerBody');
        if (!tbody) return;

        const searchQuery = document.getElementById('tableSearchInput').value.toLowerCase().trim();
        const sectionFilter = document.getElementById('filterSection').value;
        const semFilter = document.getElementById('filterSemester').value;
        const subFilter = document.getElementById('filterSubject').value;

        const matchingRecords = globalResultsCache.filter(r => {
            const studentName = (r.userName || '').toLowerCase();
            const studentRoll = (r.roll_number || '').toLowerCase();
            const studentBranch = (r.course_branch || '').toLowerCase();
            const teacherBranch = (currentTeacher && currentTeacher.course_branch || '').toLowerCase();

            const matchesSearch = studentName.includes(searchQuery) || studentRoll.includes(searchQuery);
            const matchesSection = (sectionFilter === 'ALL') || (r.section === sectionFilter);
            const matchesSemester = (semFilter === 'ALL') || (r.semester === semFilter);
            const matchesSubject = (subFilter === 'ALL') || (r.examSubject === subFilter);
            const matchesBranchScope = !teacherBranch || studentBranch.includes(teacherBranch) || teacherBranch.includes(studentBranch);

            return matchesSearch && matchesSection && matchesBranchScope && matchesSemester && matchesSubject;
        });

        document.getElementById('totalRecordsCount').textContent = `Department Records: ${matchingRecords.length}`;

        if (matchingRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #999; padding: 2rem;">No candidates recorded under your assigned department scope.</td></tr>`;
            return;
        }

        const subjectCounters = {};

        const processedRecords = [...matchingRecords].reverse().map(r => {
            const sub = r.examSubject || 'General';
            if (!subjectCounters[sub]) {
                subjectCounters[sub] = 0;
            }
            subjectCounters[sub]++;
            return { ...r, subjectAttemptNum: subjectCounters[sub] };
        });

        const finalRecordsToRender = processedRecords.reverse();

        tbody.innerHTML = finalRecordsToRender.map(r => {
            const dynamicAttempt = r.attemptNumber || r.attempt || r.subjectAttemptNum;
            const totalQ = r.totalQuestions || 10; 
            const correctQ = r.correctAnswers || Math.round((parseFloat(r.percentage) / 100) * totalQ);
            const wrongQ = totalQ - correctQ;

            let formattedDate = '15/06/2026';
            if (r.submittedAt || r.timestamp) {
                const rawDate = new Date(r.submittedAt || r.timestamp);
                if (!isNaN(rawDate.getTime())) {
                    formattedDate = rawDate.toLocaleDateString('en-GB');
                }
            }

            return `
                <tr>
                   <td style="font-weight: 600; color: #333;">${r.roll_number || '<span style="color:#aaa;">N/A</span>'}</td>
                   <td><b>${r.userName || 'Unknown'}</b></td>
                   <td><span class="badge-read" style="background:#f1f3f9; color:#4f46e5;">${r.course_branch || 'Unassigned'}</span></td>
                   <td>${r.section || 'None'}</td>
                   <td><span style="color:#2e7d32; font-weight:500;">${r.examSubject}</span></td>
    
                   <td style="text-align:center;">#${r.attempt_number || dynamicAttempt}</td>
    
                   <td><b style="color: #667eea; font-size:1.05rem;">${parseFloat(r.percentage).toFixed(2)}%</b></td>
    
                   <td style="font-size:0.85rem; color:#666;">
                   <span style="color:#2e7d32; font-weight:600;">✔ ${correctQ}/${totalQ} Sahi</span><br>
                   <span style="color:#c62828; font-size:0.75rem;">✖ ${wrongQ} Galat</span>
                   </td>
             
                   <td style="font-size:0.85rem; color:#888;">
                       ${r.submittedAt || formattedDate}<br>
                       <span style="font-size:0.75rem; font-weight:bold; color: ${r.reason && r.reason.toLowerCase().includes('cheating') ? '#c62828' : '#2e7d32'}">
                           ${r.reason && r.reason.toLowerCase().includes('cheating') ? '⚠️ Cheating Detected' : '✅ Normal Submission'}
                       </span>
                   </td>
    
                   <td>
                  <button onclick="viewDetailedExamSheet(${r.id || r.resultId})" class="view-btn" style="background:#4f46e5; color:white; border:none; padding:5px 10px; border-radius:5px; font-size:0.8rem; cursor:pointer; font-weight:500; transition:all 0.2s;">
                 👁 View Exam
                 </button>
                 </td>
              </tr>
            `;
        }).join('');
    }

    if (document.getElementById('tableSearchInput')) {
        document.getElementById('tableSearchInput').addEventListener('input', renderFilteredLedger);
    }
    if (document.getElementById('filterSection')) {
        document.getElementById('filterSection').addEventListener('change', renderFilteredLedger);
    }
    if (document.getElementById('filterSemester')) {
        document.getElementById('filterSemester').addEventListener('change', renderFilteredLedger);
    }
    if (document.getElementById('filterSubject')) {
        document.getElementById('filterSubject').addEventListener('change', renderFilteredLedger);
    }

    loadFacultyLedger();
});

// ==================== STEP 3: VIEW DETAILED EXAM SHEET MODAL (FIXED ESCAPE) ====================
function viewDetailedExamSheet(resultId) {
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

            const fullQuestions = data.questions || [];

            const modalHtml = `
                <div id="examModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
                    <div style="background:white; padding:25px; border-radius:12px; width:90%; max-width:680px; max-height:85vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family: sans-serif;">
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:12px; margin-bottom:15px;">
                            <h3 style="margin:0; color:#0f172a; font-size:1.3rem;">📄 Candidate Response Sheet</h3>
                            <button onclick="document.getElementById('examModal').remove()" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#94a3b8;">&times;</button>
                        </div>
                        
                        <div style="margin-bottom:20px; font-size:0.9rem; background:#f1f5f9; padding:12px; border-radius:8px; color:#334155; display:flex; gap:15px; flex-wrap:wrap;">
                            <div><b>Subject:</b> <span style="color:#4f46e5;">${data.subject}</span></div>
                            <div>| <b>Candidate:</b> <span>${data.studentName}</span></div>
                            <div>| <b>Score:</b> <span style="color:#16a34a; font-weight:bold;">${parseFloat(data.percentage).toFixed(2)}%</span></div>
                        </div>

                        <div id="questionsContainer">
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
            console.error("Error:", err);
            alert("System error fetching response sheet logs.");
        });
}

// 🎯 FIXED: Standalone html sanitizer parser function helper
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== STEP 4: GLOBAL AVATAR UPLOAD ROUTINE ====================
function setupAvatarUploadLogic() {
    const avatarContainer = document.getElementById('avatarContainer');
    const fileInput = document.getElementById('avatarUploader');

    if (!avatarContainer || !fileInput) return;

    avatarContainer.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("⚠️ Profile picture size must be under 2MB!");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result;

                let user = JSON.parse(localStorage.getItem('currentUser'));
                user.avatar = base64Image;
                localStorage.setItem('currentUser', JSON.stringify(user));

                fetch('/api/users/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: user.id,
                        fullName: user.fullName,
                        phone: user.phone || '',
                        avatar: base64Image
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Profile Picture updated successfully! 🔥");
                        window.location.reload();
                    } else {
                        alert("Database synchronization alert: " + data.message);
                    }
                })
                .catch(err => {
                    console.error("Error updating avatar:", err);
                    alert("Network sync failed. Please try again.");
                });
            };
            reader.readAsDataURL(file);
        }
    });
}