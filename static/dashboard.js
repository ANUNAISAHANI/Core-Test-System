// dashboard.js - Complete Database Integrated User Dashboard (Fully Synced with SQLite)

document.addEventListener('DOMContentLoaded', function() {
    // 1. Session verification check (CurrentUser configuration stays inside LocalStorage safely)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Display primary user metadata elements
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = `👤 ${currentUser.fullName}`;
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && currentUser.avatar) {
        userAvatar.src = currentUser.avatar;
    }
    
    // Logout action execution loop - Clears temporary local states tokens
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentExam');
            localStorage.removeItem('examProgress');
            window.location.href = '/';
        });
    }

    // Dynamic global tracking storage arrays parameters
    let globalResultsArray = [];

    // ==================== STEP 1: FETCH DATA CONTEXT IN SEQUENCE ====================
   function loadDashboardData() {
    // Pehle real backend se user results records logs khinchte hain
    fetch(`/api/results?userId=${currentUser.id}`)
.then(res => res.json())
.then(resultsData => {
    globalResultsArray = resultsData; // Database se data yahan aagaya

    // 🎯 Database + Student Branch restriction ke sath dropdown populate hoga
    populateStudentSubjectDropdown(resultsData, currentUser);

    renderUserResultsSection(globalResultsArray);

       // 🎯 FIXED: Dynamic filtration parameters for both branch AND semester injected safely
        const roleParam = currentUser.role || 'student';
        const branchParam = currentUser.course_branch || '';
        const semParam = currentUser.semester || ''; // 🎯 NEW: Get student's current semester
        
        return fetch(`/api/exams?role=${roleParam}&course_branch=${encodeURIComponent(branchParam)}&semester=${encodeURIComponent(semParam)}`);
    })
    .then(res => res.json())
    .then(backendExams => {
        // Processing exam visualization inside grid injection system
        renderExamsGrid(backendExams);
    })
    .catch(err => console.error("🚨 Critical Error mapping dashboard fields across database node:", err));
}

    // ==================== STEP 2: LOGICAL CALCULATION FUNCTIONS ====================
    function getAttemptCount(subject) {
        return globalResultsArray.filter(r => r.examSubject === subject).length;
    }
    
    function getBestScore(subject) {
        const userSubjectResults = globalResultsArray.filter(r => r.examSubject === subject);
        if (userSubjectResults.length === 0) return null;
        return Math.max(...userSubjectResults.map(r => parseFloat(r.percentage)));
    }
    
    function getFeedback(percentage) {
        if (percentage < 40) return { text: "💪 Work Hard", class: "feedback-workhard" };
        if (percentage < 60) return { text: "👍 Good", class: "feedback-good" };
        if (percentage < 80) return { text: "🌟 Very Good", class: "feedback-superb" };
        if (percentage < 95) return { text: "🏆 Excellent", class: "feedback-outstanding" };
        return { text: "👑 Outstanding", class: "feedback-excellent" };
    }

    // ==================== STEP 3: RENDER RENDERING GRID MODULES ====================
    function renderExamsGrid(examsList) {
        const examsGrid = document.getElementById('examsGrid');
        if (!examsGrid) return;
        
        examsGrid.innerHTML = '';
        
        examsList.forEach(exam => {
            const maxAttempts = exam.maxAttempts || 2;
            const attemptsUsed = getAttemptCount(exam.subject);
            const remainingAttempts = maxAttempts - attemptsUsed;
            const bestScore = getBestScore(exam.subject);
            const canTake = remainingAttempts > 0;
            
            const card = document.createElement('div');
            card.className = 'exam-card';
            
            let attemptInfo = '';
            let buttonHtml = '';
            
            if (canTake) {
                attemptInfo = `
                    <div style="background: #e8f5e9; padding: 0.5rem; border-radius: 20px; font-size: 0.8rem; color: #2e7d32; margin-top: 0.5rem; text-align: center; font-weight: 500;">
                        ✅ ${remainingAttempts} attempt(s) remaining (Max ${maxAttempts})
                    </div>`;
                buttonHtml = `<button class="start-exam-btn" data-id="${exam.id}" data-subject="${exam.subject}" data-max="${maxAttempts}" style="background: #667eea; cursor: pointer;">Start Exam</button>`;
            } else {
                attemptInfo = `
                    <div style="background: #ffebee; padding: 0.5rem; border-radius: 20px; font-size: 0.8rem; color: #c62828; margin-top: 0.5rem; text-align: center; font-weight: 500;">
                        ❌ No attempts remaining! (Maximum ${maxAttempts} attempts used)
                    </div>`;
                buttonHtml = `<button class="start-exam-btn disabled" disabled style="background: #ccc; cursor: not-allowed;">Exam Locked</button>`;
            }
            
            let bestScoreHtml = '';
            if (bestScore !== null) {
                bestScoreHtml = `
                    <div style="background: #fff3e0; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.75rem; color: #f57c00; margin-top: 0.25rem; text-align: center; font-weight: 600;">
                        🏆 Best Score: ${bestScore.toFixed(1)}%
                    </div>`;
            }
            
            // Fixed CamelCase variable mapping from database schema rules
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 2rem;">${exam.icon || '📝'}</span>
                    <h3>${exam.subject}</h3>
                </div>
                <p style="color: #667eea; font-weight: 500; margin: 4px 0;">${exam.topic || ''}</p>
                <p style="margin: 0.5rem 0; color: #666; font-size:0.9rem;">${exam.description || 'No specialized description asset attached.'}</p>
                <div class="exam-meta" style="font-size: 0.8rem; color:#777; display: flex; gap: 10px; flex-wrap: wrap;">
                    <span>📝 ${exam.totalQuestions || 5} Questions</span>
                    <span>⏱️ ${Math.floor((exam.duration || 3600) / 60)} minutes</span>
                </div>
                ${bestScoreHtml}
                ${attemptInfo}
                ${buttonHtml}
            `;
            examsGrid.appendChild(card);
        });
        
       // ==================== ELIGIBILITY BRANCH FILTER LOCK ====================
        // Attaching active binding click listeners events with branch security layer
        document.querySelectorAll('.start-exam-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', function() {
                const examId = parseInt(this.dataset.id);
                const examSubject = this.dataset.subject;
                const maxAttemptsLimit = parseInt(this.dataset.max);
                
                const chosenExam = examsList.find(e => e.id === examId);
                
                // 🚨 ULTRA SECURITY LAYER: Check if student's branch matches the exam's designated branch
                // (Agar exam ka course_branch user ke course_branch se match nahi karta, toh access block!)
                if (chosenExam.course_branch && chosenExam.course_branch !== currentUser.course_branch) {
                    alert(`🚫 Access Denied: This exam is strictly for ${chosenExam.course_branch} students.\nYour registered department is ${currentUser.course_branch}. Masti nahi bhai! 🙅‍♂️`);
                    return;
                }

                const currentAttemptCount = getAttemptCount(examSubject);
                
                if (currentAttemptCount >= maxAttemptsLimit) {
                    alert(`❌ Security Breach Blocked: You have exhausted all ${maxAttemptsLimit} attempts limit.`);
                    location.reload();
                    return;
                }
                
                // Package tracking session parameters for the live testing engine environment
                chosenExam.nextAttemptNumber = currentAttemptCount + 1;
                
                localStorage.setItem('currentExam', JSON.stringify(chosenExam));
                window.location.href = 'exam.html';
            });
        });
    }

    // ==================== STEP 4: HISTORICAL SHEET DISPLAY LOGIC ====================
    function renderUserResultsSection(resultsList) {
        const userResultsDiv = document.getElementById('userResults');
        if (!userResultsDiv) return;
        
        if (resultsList.length === 0) {
            userResultsDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem; background: white; border-radius: 8px;">No exams attempted yet. Choose a paper card from the board above to deploy your first live test sheet!</p>';
            return;
        }
        
        // Render chronological history stack (Server handles sorting out clean structures)
        userResultsDiv.innerHTML = resultsList.slice().reverse().map((result, idx, arr) => {
            const pctVal = parseFloat(result.percentage) || 0;
            const feedback = getFeedback(pctVal);
            
            // Display internal loops tracking index matching keys sequences reverse ordered logs
            const computedAttemptNum = result.attemptNumber || (arr.length - idx);
            
            return `
                <div class="result-card" style="background: white; padding: 1.2rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.03); border-left: 4px solid #667eea;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                        <h4 style="margin:0; color:#333; font-size:1.1rem;">${result.examSubject} <span style="font-size: 0.8rem; color: #888; font-weight: normal;">(Attempt No: #${result.attempt_number || computedAttemptNum})</span></h4>
                        <button class="btn btn-small btn-outline view-details-btn" data-result-id="${result.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; cursor:pointer;">📋 View Details</button>
                    </div>
                    <div class="result-details" style="display: flex; gap: 15px; margin-top: 0.8rem; font-size: 0.85rem; color: #666; flex-wrap: wrap; align-items: center;">
                        <span>${result.submittedAt}</span>
                        <span>✅ ${result.correctAnswers}/${result.totalQuestions} Correct</span>
                        <span style="font-weight:600; color:#4f46e5;">📊 Score: ${pctVal.toFixed(2)}%</span>
                        <span class="feedback-badge ${feedback.class}" style="font-size:0.75rem; padding:2px 8px; border-radius:10px;">${feedback.text}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #999; margin-top: 0.5rem; font-style:italic;">
                        System Signature Status: ${result.reason || 'Normal Termination Submission'}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for dynamic detailed parameters routing redirection
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                window.location.href = `result-details.html?id=${this.dataset.resultId}`;
            });
        });
    }

    // Initialize execution flow engine
    loadDashboardData();
});

// ==========================================================================
// DASHBOARD INTRO ANIMATION LOGIC (UPDATED WITH PERSISTENCE)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const barrier = document.getElementById('clickBarrier');
    const blackScreen = document.getElementById('blackScreen');
    const emojiChar = document.getElementById('emojiChar');
    const dashboardApp = document.getElementById('mainDashboardApp');

    // 1. Animation check: Kya user pehle login kar chuka hai?
    if (localStorage.getItem('hasSeenAnimation') === 'true') {
        if (barrier) barrier.style.display = 'none';
        if (blackScreen) blackScreen.style.display = 'none';
        if (emojiChar) emojiChar.style.display = 'none';
        if (dashboardApp) {
            dashboardApp.classList.remove('hidden-initially');
            dashboardApp.classList.add('showAnim');
        }
    } else {
        // 2. Pehli baar: Animation logic
        if (barrier) {
            barrier.addEventListener('click', () => {
                localStorage.setItem('hasSeenAnimation', 'true'); // Flag set
                initAudio();
                barrier.style.opacity = '0';
                setTimeout(() => {
                    barrier.style.display = 'none';
                    startIntroAnimation();
                }, 500);
            });
        }
    }

    // --- Saare functions jo pehle se the ---
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playTunSound() {
        try {
            initAudio();
            const makeNote = (freq, startTime, duration, gain = 0.6) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            const now = audioCtx.currentTime;
            makeNote(659.25, now, 0.4, 0.8);
            makeNote(1046.50, now + 0.05, 0.6, 0.5);
        } catch(e) { console.log("Audio Error:", e); }
    }

    function startIntroAnimation() {
        // ... (Tumhara pura wahi startIntroAnimation ka logic jo tumne diya tha)
        // Main ye code wahi hai, sirf bracket structure sahi kar diya hai
        emojiChar.style.opacity = '1';
        emojiChar.classList.add('flapping');
        emojiChar.style.animation = 'cinematicEnter 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards';

        setTimeout(() => {
            emojiChar.style.animation = 'hoverFloat 2s infinite ease-in-out';
            const mainEmoji = document.getElementById('mainEmoji');
            mainEmoji.innerText = '😉'; 
            mainEmoji.style.transform = 'scaleX(-1)'; 
            playTunSound();
            blackScreen.classList.add('fadeOut');
            if(dashboardApp) {
                dashboardApp.classList.remove('hidden-initially');
                dashboardApp.classList.add('showAnim');
            }
        }, 3200); 

        setTimeout(() => {
            const mainEmoji = document.getElementById('mainEmoji');
            const leftWing = document.getElementById('leftWing');
            mainEmoji.innerText = '🙂';
            mainEmoji.style.transform = 'scaleX(1)'; 
            leftWing.style.animation = 'none'; 
            const waveAnim = leftWing.animate([
                { transform: 'scaleX(-1) rotate(0deg) translateY(4px)' },
                { transform: 'scaleX(-1) rotate(45deg) translateY(-15px)' },
                { transform: 'scaleX(-1) rotate(0deg) translateY(4px)' }
            ], { duration: 300, iterations: 3, easing: 'ease-in-out' });

            waveAnim.onfinish = () => {
                leftWing.style.animation = 'flapLeft 0.4s ease-in-out infinite'; 
                emojiChar.style.animation = 'flyLeftExit 1.5s ease-in forwards';
                setTimeout(() => {
                    emojiChar.style.display = 'none';
                    blackScreen.style.display = 'none';
                }, 1500);
            };
        }, 4600);
    }
});

// 🎯 Database aur Branch restriction ke sath subject dropdown chalana
function populateStudentSubjectDropdown(resultsList, user) {
    const filterSelect = document.getElementById('studentSubjectFilter');
    if (!filterSelect) return;

    // Database ke records se unique subjects nikal rahe hain jo is student ne diye hain
    // Aur yahan branch check bhi ensure ho raha hai ki sirf valid data aaye
    const subjects = [...new Set(resultsList
        .filter(r => !user.course_branch || !r.course_branch || r.course_branch.toUpperCase() === user.course_branch.toUpperCase())
        .map(r => r.examSubject)
    )];

    const currentValue = filterSelect.value;

    filterSelect.innerHTML = '<option value="ALL">Show All Subjects</option>' + 
        subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');

    if (subjects.includes(currentValue) || currentValue === 'ALL') {
        filterSelect.value = currentValue;
    }

    // Database filtered data render logic with branch safety
    filterSelect.onchange = function() {
        const selectedSub = this.value;
        if (selectedSub === 'ALL') {
            renderUserResultsSection(globalResultsArray);
        } else {
            const filteredResults = globalResultsArray.filter(r => r.examSubject === selectedSub);
            renderUserResultsSection(filteredResults);
        }
    };
}