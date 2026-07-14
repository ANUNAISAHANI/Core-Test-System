// result-details.js - Enterprise Standard Sequential Report Parser (Fixed Execution)

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id');

    if (!resultId) {
        alert("🚨 Technical Log Error: No report token reference id detected!");
        window.location.href = 'dashboard.html';
        return;
    }

   // ==================== FETCH DETAILED INDIVIDUAL REPORT FROM SQL ====================
    fetch(`/api/get_result_detail/${resultId}`)
    .then(res => res.json())
    .then(data => {
        console.log("=== BACKEND DATA CHECK ===", data);
        if (!data || !data.success) {
            document.getElementById('questionsReviewSection').innerHTML = '<p style="text-align:center; color:red;">No historical performance sheets found under this entry id parameter.</p>';
            return;
        }

        // Render Scoreboard Meta Metrics dynamically from mapped controller
        document.getElementById('reportTitle').textContent = `Performance Report Card: ${data.subject}`;
        document.getElementById('candidateName').textContent = data.studentName || currentUser.fullName;
        document.getElementById('subjectTag').textContent = data.subject;
        document.getElementById('scorePercentage').textContent = `${parseFloat(data.percentage).toFixed(2)}%`;
        document.getElementById('submissionTimestamp').textContent = data.submittedAt || "N/A";
        
        // 🎯 EXACT ID FIX: Ab backend ka real reason data is completionReason element me link ho jayega
        const reasonEl = document.getElementById('completionReason');
        if (reasonEl) {
            // Agar database se full remarks string (with timestamp) aa rahi hai toh use filter karke clear dikhayenge
            const fullRemarks = data.remarks || data.reason || "System Normal Termination";
            const cleanReasonText = fullRemarks.includes(' | Log Timestamp:') 
                ? fullRemarks.split(' | Log Timestamp:')[0] 
                : fullRemarks;

            reasonEl.textContent = `Status: ${cleanReasonText}`;
        }

        // Count total questions directly from the payload
        const totalQs = data.questions ? data.questions.length : 0;
        let correctCount = 0;
        if (data.questions) {
            data.questions.forEach(q => {
                const sAns = String(q.selectedOption || '').trim().toUpperCase();
                const cAns = String(q.correctOption || '').trim().toUpperCase();
                if (sAns !== "" && sAns !== "NONE" && sAns !== "UNDEFINED" && sAns !== "NULL" && sAns !== "0" && sAns === cAns) {
                    correctCount++;
                }
            });
        }

        document.getElementById('totalCorrect').textContent = `${correctCount} / ${totalQs}`;
        
        // Review container clear setup
        const reviewContainer = document.getElementById('questionsReviewSection');
        if (!reviewContainer) return;
        reviewContainer.innerHTML = '';

        if (!data.questions || data.questions.length === 0) {
            reviewContainer.innerHTML = '<p style="color:#e74c3c; font-style:italic; text-align:center;">⚠️ Notice: No question logs found under this exam submission.</p>';
            return;
        }

        // 🎯 FIX #2: Strict checking for Unattempted/Skipped options
        data.questions.forEach((q, index) => {
            let studentAns = String(q.selectedOption || '').trim().toUpperCase();
            const correctAns = String(q.correctOption || '').trim().toUpperCase();
            
            // Agar backend se numerical index 0, 1, 2, 3 aa raha ho toh use letter me convert karenge safely, 
            // par agar index khali ya undefined/none hai toh mapping bypass hogi
            if (studentAns === "0" && !q.options["0"]) studentAns = "A";
            if (studentAns === "1" && !q.options["1"]) studentAns = "B";
            if (studentAns === "2" && !q.options["2"]) studentAns = "C";
            if (studentAns === "3" && !q.options["3"]) studentAns = "D";

            // Strict Unattempted condition check (0 index fallback check removed)
            const isUnattempted = q.selectedOption === null || 
                                 q.selectedOption === undefined || 
                                 String(q.selectedOption).trim() === "" || 
                                 String(q.selectedOption).trim().toUpperCase() === "NONE" || 
                                 String(q.selectedOption).trim().toUpperCase() === "UNDEFINED" ||
                                 String(q.selectedOption).trim().toUpperCase() === "NULL";

            const isCorrect = !isUnattempted && (studentAns === correctAns);

            const questionBlock = document.createElement('div');
            questionBlock.style.cssText = `
                background: white; 
                padding: 1.5rem; 
                border-radius: 12px; 
                margin-bottom: 1.2rem; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                border-left: 6px solid ${isCorrect ? '#2ecc71' : isUnattempted ? '#95a5a6' : '#e74c3c'};
            `;

            let evaluationStatusHtml = '';
            if (isCorrect) {
                evaluationStatusHtml = `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">✅ Correct Option Marked</span>`;
            } else if (isUnattempted) {
                evaluationStatusHtml = `<span style="background:#f2f4f4; color:#566573; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">⚪ Question Skipped</span>`;
            } else {
                evaluationStatusHtml = `<span style="background:#fdedec; color:#922b21; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">❌ Wrong Option Marked</span>`;
            }

            // Options checking safely
            const optA = q.options ? (q.options['A'] || q.options[0] || '') : '';
            const optB = q.options ? (q.options['B'] || q.options[1] || '') : '';
            const optC = q.options ? (q.options['C'] || q.options[2] || '') : '';
            const optD = q.options ? (q.options['D'] || q.options[3] || '') : '';

            // Grid block backgrounds updates for unattempted cases
            const bgA = correctAns === 'A' ? '#e8f5e9' : (!isUnattempted && studentAns === 'A' ? '#fdedec' : '#f8f9fa');
            const bgB = correctAns === 'B' ? '#e8f5e9' : (!isUnattempted && studentAns === 'B' ? '#fdedec' : '#f8f9fa');
            const bgC = correctAns === 'C' ? '#e8f5e9' : (!isUnattempted && studentAns === 'C' ? '#fdedec' : '#f8f9fa');
            const bgD = correctAns === 'D' ? '#e8f5e9' : (!isUnattempted && studentAns === 'D' ? '#fdedec' : '#f8f9fa');

            const borderA = correctAns === 'A' ? '#2ecc71' : '#eee';
            const borderB = correctAns === 'B' ? '#2ecc71' : '#eee';
            const borderC = correctAns === 'C' ? '#2ecc71' : '#eee';
            const borderD = correctAns === 'D' ? '#2ecc71' : '#eee';

            questionBlock.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#555;">Question Item #${index + 1}</strong>
                    ${evaluationStatusHtml}
                </div>
                <p style="font-size:1.05rem; font-weight:500; color:#333; margin-bottom:15px;">${escapeHtml(q.questionText)}</p>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; color:#555;">
                    <div style="padding:8px; border-radius:6px; background:${bgA}; border:1px solid ${borderA}">A: ${escapeHtml(optA)}</div>
                    <div style="padding:8px; border-radius:6px; background:${bgB}; border:1px solid ${borderB}">B: ${escapeHtml(optB)}</div>
                    <div style="padding:8px; border-radius:6px; background:${bgC}; border:1px solid ${borderC}">C: ${escapeHtml(optC)}</div>
                    <div style="padding:8px; border-radius:6px; background:${bgD}; border:1px solid ${borderD}">D: ${escapeHtml(optD)}</div>
                </div>
                
                <div style="margin-top:15px; padding-top:10px; border-top:1px dashed #eee; font-size:0.9rem; display:flex; gap:15px;">
                    <span style="color:#27ae60; font-weight:600;">✔️ Correct Answer: Option ${correctAns}</span>
                    <span style="color:${isUnattempted ? '#566573' : isCorrect ? '#27ae60' : '#c0392b'}; font-weight:600;">
                        📥 Candidate Answer Choice: ${isUnattempted ? 'Question Skipped' : 'Option ' + studentAns}
                    </span>
                </div>
            `;
            reviewContainer.appendChild(questionBlock);
        });
    })
    .catch(err => console.error("Detailed results fetch error:", err));

    // Balanced navigation redirection actions mapping
    document.getElementById('returnBtn').onclick = () => {
        if (currentUser.role === 'admin') { window.location.href = 'admin.html'; }
        else if (currentUser.role === 'teacher') { window.location.href = 'teacher.html'; }
        else { window.location.href = 'dashboard.html'; }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});