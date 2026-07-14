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

       // Line 229: Percentage calculation
        const finalPercentage = (correctAnswersCount / liveQuestionsList.length) * 100;

        // 🌟 REASON STRING LOGIC REPAIR (Naya safe logic)
        let finalReasonStatus = "Normal Termination Submission"; 

        if (submissionReason === "TIMEOUT_AUTO_SUBMIT") {
            finalReasonStatus = "⌛ Timeout Auto-Submission";
        } else if (submissionReason !== "USER_MANUAL_SUBMIT") {
            finalReasonStatus = `🚨 Cheating Detected: ${submissionReason}`;
        }

        // Line 231 ka purana payload ab aise modify hoga:
        const resultPayload = {
            userId: currentUser.id,
            userName: currentUser.fullName,
            rollNumber: currentUser.roll_number || 'N/A',
            courseBranch: currentUser.course_branch || 'N/A',
            section: currentUser.section || 'None',
            examSubject: currentExam.subject,
            totalQuestions: liveQuestionsList.length,
            attemptedQuestions: attemptedCount,
            correctAnswers: correctAnswersCount, 
            score: correctAnswersCount,          
            percentage: finalPercentage.toFixed(2),
            submittedAt: new Date().toISOString(),
            userAnswers: JSON.stringify(userSelectedAnswers),
            questionsOrder: liveQuestionsList.map(q => q.id).join(','),
            attemptNumber: currentExam.nextAttemptNumber || 1,
            reason: finalReasonStatus // 🎯 FIXED: Ab sahi dynamic text database me jayega
        };

        fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultPayload)
        })
        .then(res => res.json())
        // --- exam.js mein processExamEvaluationPipeline ke andar ka fetch block ---
        .then(data => {
            if (data.success) {
                localStorage.removeItem('currentExam');
                
                const overlay = document.getElementById('resultAnimationOverlay');
                overlay.style.display = 'flex';
                
                // 1. Emoji set karo
                let emojiChar = finalPercentage < 40 ? '😂' : (finalPercentage < 80 ? '😊' : '🤩');
                const spans = document.querySelectorAll('#emojiContainer span');
                spans.forEach(s => s.innerText = emojiChar);
                
                // 2. English Feedback Messages (Update)
                let feedbackText = "";
                if (finalPercentage < 40) {
                    feedbackText = "You got poor marks, no worries! Work hard and perform better next time to get good marks.";
                } else if (finalPercentage < 80) {
                    feedbackText = "You got good marks! Keep practicing, you can achieve even better marks next time.";
                } else {
                    feedbackText = "You got excellent marks! Keep up the hard work and maintain this performance to get such marks again.";
                }
                
                // Feedback message ka colour aur visibility thik karne ke liye
               document.getElementById('resultMsg').innerHTML = `
               <div style="color: #ffffff; font-size: 1.2rem; margin-bottom: 5px;">Final Score: ${finalPercentage.toFixed(2)}%</div>
               <div style="color: #e2e8f0; font-size: 0.95rem; font-weight: 500; line-height: 1.4; padding: 0 20px;">${feedbackText}</div>`;

                // 3. Animation: Fly wala logic hat gaya, sirf rotate aur disappear
                document.getElementById('goToDashboardBtn').onclick = () => {
                    const btn = document.getElementById('goToDashboardBtn');
                    const container = document.getElementById('emojiContainer');
                    
                    btn.style.display = 'none';
                    // Sirf rotateAndDisappear call hoga
                    container.classList.add('animation-sequence'); 

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                };
            } else {
                alert("❌ Critical Server Error saving results entry!");
                isSubmitting = false;
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

    // 1. Pehle flag ko true karenge
    isPopupOpen = true; 

    // 2. setTimeout use karenge taaki browser ko flag memory me update karne ka poora waqt mile
    setTimeout(() => {
        const userChoice = confirm(`⚠️ Confirmation Alert:\n\nTotal Questions: ${totalQs}\nAnswered: ${answeredCount}\nSkipped/Left: ${unattemptedCount}\n\nAre you sure you want to finalize and lock your exam choice card sheet now?`);
        
        if (userChoice) {
            isSubmitting = true; 
            isPopupOpen = false;
            clearInterval(timerIntervalNode);
            processExamEvaluationPipeline("USER_MANUAL_SUBMIT");
        } else {
            // Cancel dabane par pehle focus wapas laao, fir safe delay ke baad flag hatao
            window.focus(); 
            setTimeout(() => {
                isPopupOpen = false;
            }, 300);
        }
    }, 50); // 50ms ka chota sa delay event loop ko normal karega
};

   function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
   }

        // 🌟 GLOBAL VARIABLES (Sirf tabhi 'let' lagayein agar ye pehle se pooray code me upar declared NAHO)
        if (typeof isSubmitting === 'undefined') {
        window.isSubmitting = false; 
     }
        if (typeof isPopupOpen === 'undefined') {
       window.isPopupOpen = false; 
     }

       // ⚡ AUTO SUBMIT ENGINE WITH REASON
       function triggerAutoSubmit(reason) {
       if (isSubmitting || isPopupOpen) return; 
    
       isSubmitting = true; 
       clearInterval(timerIntervalNode);
    
       alert(`🚨 EXAM TERMINATED: ${reason}\nAapka exam auto-submit kiya ja raha hai!`);
       processExamEvaluationPipeline(reason);
     }

       // ⚡ 2. FOCUS LOST DETECTION (Micro-delay verification ke sath)
       window.addEventListener('blur', function() {
       if (isSubmitting || isPopupOpen) return; 
    
       // 150ms ruk kar verify karega ki sachme screen chodi hai ya sirf popup aaya hai
        setTimeout(() => {
        if (isSubmitting || isPopupOpen) return; 
        triggerAutoSubmit("Split Screen ya Dusri Window par click kiya gaya (Focus Lost).");
      }, 150); 
  });

      // 🔒 3. TAB SWITCH DETECTION ENGINE
      document.addEventListener('visibilitychange', function () {
      if (isSubmitting || isPopupOpen) return; 
      if (document.hidden) {
      triggerAutoSubmit("Browser Tab badalne ki koshish ki gayi.");
    }
  });

     // 🔒 4. RIGHT CLICK BLOCK
     document.addEventListener('contextmenu', event => event.preventDefault());

     // 🔒 5. SHORTCUT KEYS LOCK
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