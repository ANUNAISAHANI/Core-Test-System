// exam.js - Premium Multi-Page Examination Slider with Serial Jumping Box Matrix

// 🚀 GLOBAL FLAG: Yeh poore code ko batayega ki user abhi submit kar raha hai ya nahi
let isSubmitting = false; 

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentExam = JSON.parse(localStorage.getItem('currentExam'));

if (!currentUser || !currentExam) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Dynamic global states tracking indices
    let liveQuestionsList = [];
    let userSelectedAnswers = {}; 
    let currentQuestionIndex = 0; // Tracks what single slide is actively viewed by the candidate
    let visitedQuestionSet = new Set(); // Identifies questions user has opened/seen to toggle RED alerts
    
    let timeRemaining = currentExam.duration || 3600; 
    let timerIntervalNode = null;

    document.getElementById('examTitleDisplay').textContent = `🎯 Live Paper: ${currentExam.subject}`;

    let warned10Min = false;
    let warned5Min = false;

    // --- DYNAMIC AUDIO COUNTDOWN BEEP AUDIO ---
    function playCountdownBeep(isUrgent) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(isUrgent ? 800 : 440, audioCtx.currentTime); 
            
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
            console.log("Audio play blocked by browser autoplay policy.");
        }
    }

    function updateTimerDisplay() {
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        const timerDisplay = document.getElementById('timerDisplay');
        
        if (timerDisplay) {
            timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeRemaining === 600 && !warned10Min) {
                warned10Min = true;
                alert("⚠️ Alert: Only 10 minutes remaining! Please review your answers quickly.");
            }
            if (timeRemaining === 300 && !warned5Min) {
                warned5Min = true;
                alert("🚨 Urgent Warning: Only 5 minutes left! The exam will auto-submit when the timer reaches 00:00:00.");
            }

            if (timeRemaining <= 600 && timeRemaining > 0) {
                timerDisplay.style.color = '#ff6b6b';
                timerDisplay.style.fontWeight = 'bold';
                const isUrgent = timeRemaining <= 300;
                playCountdownBeep(isUrgent);
            }
        }

        if (timeRemaining <= 0) {
            clearInterval(timerIntervalNode);
            processExamEvaluationPipeline("TIMEOUT_AUTO_SUBMIT");
        }
        timeRemaining--;
    }

    // ==================== FETCH QUESTION BANK SHEETS FROM SQLITE ====================
    function loadExamQuestionsPaper() {
        fetch(`/api/questions?subject=${encodeURIComponent(currentExam.subject)}`)
        .then(res => res.json())
        .then(questions => {
            const maxAllottedCount = currentExam.totalQuestions || 5;
            liveQuestionsList = questions.slice(0, maxAllottedCount);

            if (liveQuestionsList.length === 0) {
                alert("📢 No questions loaded in this module yet.");
                window.location.href = 'dashboard.html';
                return;
            }

            // Mark the very first question index as viewed instantly inside runtime tracker
            visitedQuestionSet.add(0);

            // Trigger dynamic render components loops
            renderSideMatrixGridBox();
            renderActiveQuestionSlide();
            
            timerIntervalNode = setInterval(updateTimerDisplay, 1000);
        })
        .catch(err => console.error("🚨 Problem mapping questions list across pipeline:", err));
    }

    // ==================== GENERATING RIGHT SIDE NAVIGATION BOXES ====================
    function renderSideMatrixGridBox() {
        const gridContainer = document.getElementById('questionMatrixGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = liveQuestionsList.map((q, idx) => {
            let statusClass = '';
            
            if (idx === currentQuestionIndex) {
                statusClass = 'current';
            } else if (userSelectedAnswers[q.id] !== undefined) {
                statusClass = 'answered'; // GREEN
            } else if (visitedQuestionSet.has(idx)) {
                statusClass = 'skipped'; // RED
            }

            return `
                <div class="matrix-box ${statusClass}" id="matrix_box_${idx}" onclick="jumpToExplicitQuestion(${idx})">
                    ${idx + 1}
                </div>
            `;
        }).join('');
    }

    // ==================== DISPLAY SINGLE LIVE SLIDE AREA (FIXED) ====================
    function renderActiveQuestionSlide() {
        const container = document.getElementById('activeQuestionContainer');
        if (!container) return;

        const activeQ = liveQuestionsList[currentQuestionIndex];
        
        // Ensure string or integer matching consistency
        const selectedOpt = userSelectedAnswers[activeQ.id];

        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <span style="background: #4f46e5; color:white; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
                    Question ${currentQuestionIndex + 1} of ${liveQuestionsList.length}
                </span>
            </div>
            <h3 style="margin: 0 0 1.5rem 0; color: #1e293b; line-height: 1.4;">${escapeHtml(activeQ.text)}</h3>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                ${activeQ.options.map((opt, oIdx) => {
                    // Force rigorous matching check
                    const isChecked = (selectedOpt !== undefined && String(selectedOpt) === String(oIdx));
                    return `
                        <div class="option-card ${isChecked ? 'selected' : ''}" onclick="saveActiveSelection(${activeQ.id}, ${oIdx})">
                            <input type="radio" name="live_option_${activeQ.id}" value="${oIdx}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); saveActiveSelection(${activeQ.id}, ${oIdx})">
                            <span style="font-size: 1rem; color: #334155; font-weight: 500;">${escapeHtml(opt)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('prevQuestionBtn').disabled = (currentQuestionIndex === 0);
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (currentQuestionIndex === liveQuestionsList.length - 1) {
            nextBtn.textContent = 'Review End 🏁';
            nextBtn.style.background = '#64748b';
        } else {
            nextBtn.textContent = 'Next ➡️';
            nextBtn.style.background = '#4f46e5';
        }
    }

    window.jumpToExplicitQuestion = (targetIdx) => {
        if (targetIdx < 0 || targetIdx >= liveQuestionsList.length) return;
        currentQuestionIndex = targetIdx;
        visitedQuestionSet.add(targetIdx); 
        
        renderActiveQuestionSlide();
        renderSideMatrixGridBox();
    };

    window.saveActiveSelection = (qId, optionIdx) => {
        userSelectedAnswers[qId] = optionIdx;
        renderActiveQuestionSlide();
        renderSideMatrixGridBox(); 
    };

    document.getElementById('clearSelectionBtn').onclick = () => {
        const activeQ = liveQuestionsList[currentQuestionIndex];
        if (userSelectedAnswers[activeQ.id] !== undefined) {
            delete userSelectedAnswers[activeQ.id];
            renderActiveQuestionSlide();
            renderSideMatrixGridBox(); 
        }
    };

    document.getElementById('prevQuestionBtn').onclick = () => {
        if (currentQuestionIndex > 0) {
            window.jumpToExplicitQuestion(currentQuestionIndex - 1);
        }
    };

    document.getElementById('nextQuestionBtn').onclick = () => {
        if (currentQuestionIndex < liveQuestionsList.length - 1) {
            window.jumpToExplicitQuestion(currentQuestionIndex + 1);
        } else {
            alert("✨ You have reached the final query card item loop. Review your right side matrix grid box codes before deployment!");
        }
    };

    // ==================== CORE EVALUATION LOGIC PIPELINE ====================
    function processExamEvaluationPipeline(submissionReason = "USER_MANUAL_SUBMIT") {
        let correctAnswersCount = 0;
        let attemptedCount = 0;

        liveQuestionsList.forEach(q => {
            if (userSelectedAnswers[q.id] !== undefined) {
                attemptedCount++;
                if (parseInt(userSelectedAnswers[q.id]) === parseInt(q.correct)) {
                    correctAnswersCount++;
                }
            }
        });

        const finalPercentage = (correctAnswersCount / liveQuestionsList.length) * 100;

        const resultPayload = {
            userId: currentUser.id,
            userName: currentUser.fullName,
            rollNumber: currentUser.roll_number || 'N/A',
            courseBranch: currentUser.course_branch || 'N/A',
            section: currentUser.section || 'None',
            examSubject: currentExam.subject,
            totalQuestions: liveQuestionsList.length,
            attemptedQuestions: attemptedCount,
            correctAnswers: correctAnswersCount, // 🎯 Dono format secure kar diye
            score: correctAnswersCount,          // 🎯 Agar backend 'score' dhoondhe toh bhi mile
            percentage: finalPercentage.toFixed(2),
            submittedAt: new Date().toISOString(),
            userAnswers: JSON.stringify(userSelectedAnswers),
            
           // 🎯 FIX: Brackets hata kar saaf clean comma-separated IDs string backend ko bhejenge
           questionsOrder: liveQuestionsList.map(q => q.id).join(','),

            attemptNumber: currentExam.nextAttemptNumber || 1,
            reason: submissionReason === "TIMEOUT_AUTO_SUBMIT" ? "⌛ Timeout Auto-Submission" : (submissionReason.includes("Lost") || submissionReason.includes("Tab") ? `🚨 Cheating Detected: ${submissionReason}` : "✅ Normal User Submission")
        };

        fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultPayload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.removeItem('currentExam');
                alert(`🎉 Exam Submitted Successfully!\nYour Score: ${finalPercentage.toFixed(2)}%`);
                window.location.href = 'dashboard.html';
            } else {
                alert("❌ Critical Server Error saving results entry!");
                isSubmitting = false; // Reset flag on failure
            }
        })
        .catch(err => {
            console.error("🚨 Submission Network Stream Error:", err);
            alert("Connection error! Result could not commit to cloud SQL tables nodes.");
            isSubmitting = false; // Reset flag on network issue
        });
    }

    document.getElementById('submitExamBtn').onclick = () => {
        const totalQs = liveQuestionsList.length;
        const answeredCount = Object.keys(userSelectedAnswers).length;
        const unattemptedCount = totalQs - answeredCount;

        if (confirm(`⚠️ Confirmation Alert:\n\nTotal Questions: ${totalQs}\nAnswered: ${answeredCount}\nSkipped/Left: ${unattemptedCount}\n\nAre you sure you want to finalize and lock your exam choice card sheet now?`)) {
            isSubmitting = true; // 🌟 SAFE BOUND: Trigger submit flag immediately to stop anti-cheat popup loops
            clearInterval(timerIntervalNode);
            processExamEvaluationPipeline("USER_MANUAL_SUBMIT");
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ⚡ AUTO SUBMIT ENGINE WITH REASON
    function triggerAutoSubmit(reason) {
        // Agar submit process pehle se chalu ho chuka hai, toh doosre call block karo
        if (isSubmitting) return; 
        
        isSubmitting = true; // Block further anti-cheat loops
        clearInterval(timerIntervalNode);
        
        alert(`🚨 EXAM TERMINATED: ${reason}\nAapka exam auto-submit kiya ja raha hai!`);
        processExamEvaluationPipeline(reason);
    }

    // ⚡ 2. FOCUS LOST DETECTION (Split screen aur multi-window cheat block)
    window.addEventListener('blur', function() {
        if (isSubmitting) return; // 🛡️ Submit button click ho chuka hai, toh chup rho
        triggerAutoSubmit("Split Screen ya Dusri Window par click kiya gaya (Focus Lost).");
    });

    // 🔒 3. TAB SWITCH DETECTION ENGINE (Jab bacha doosri tab par jaye)
    document.addEventListener('visibilitychange', function () {
        if (isSubmitting) return; // 🛡️ Submit button click ho chuka hai, toh chup rho
        if (document.hidden) {
            triggerAutoSubmit("Browser Tab badalne ki koshish ki gayi.");
        }
    });

    // 🔒 4. RIGHT CLICK BLOCK (Taki inspect element na khol sake)
    document.addEventListener('contextmenu', event => event.preventDefault());

    // 🔒 5. SHORTCUT KEYS LOCK (F12, Ctrl+Shift+I, Ctrl+U block karne ke liye)
    document.addEventListener('keydown', function(e) {
        if (e.keyCode == 123 || 
            (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || 
            (e.ctrlKey && e.keyCode == 85)) {
            e.preventDefault();
            alert("🔒 Security Lock: Developer Tools is exam mein disable hain!");
        }
    });

    // 🔄 Exam questions paper ko load karne wala function call
    loadExamQuestionsPaper();
});