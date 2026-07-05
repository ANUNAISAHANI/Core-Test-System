// login.js - Full-Stack SQL Connected Role-Based Authentication Controller

document.addEventListener('DOMContentLoaded', function() {
    console.log("🔗 Database Login Stream Active and Monitoring Inputs.");
    
    // ==================== LAMP ANIMATION INTEGRATED LOGIC ====================
    const rootWrapper = document.querySelector('.lamp-login-wrapper');
    const switchKnob = document.querySelector('.lamp-string-knob');

    function executeLightOn() {
        if (rootWrapper && !rootWrapper.classList.contains('lamp-active-glow')) {
            rootWrapper.classList.add('lamp-active-glow');
        }
    }

    function executeLightOff() {
        if (rootWrapper && rootWrapper.classList.contains('lamp-active-glow')) {
            rootWrapper.classList.remove('lamp-active-glow');
        }
    }

    if (switchKnob) {
        switchKnob.addEventListener('click', function(e) {
            e.stopPropagation();
            if (rootWrapper.classList.contains('lamp-active-glow')) {
                executeLightOff();
            } else {
                executeLightOn();
            }
            
            // Linear chain pull bounce mechanics
            switchKnob.style.transform = 'translateY(24px)';
            setTimeout(() => {
                switchKnob.style.transform = 'translateY(0px)';
            }, 130);
        });
    }

    document.addEventListener('click', function(e) {
        if (rootWrapper && rootWrapper.classList.contains('lamp-active-glow') && 
            !e.target.closest('.auth-card') && 
            !e.target.closest('.lamp-pull-string-group')) {
            executeLightOff();
        }
    });
    // ==========================================================================

    // ==================== 1. PASSWORD LOGIN SUBMIT ====================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            console.log("🚀 Packaging authentication handshake token for:", email);
            
            const loginPayload = {
                email: email,
                password: password
            };
            
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginPayload)
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Invalid credentials stream mapping mismatch.");
                }
                return res.json();
            })
            .then(responseData => {
                if (responseData.success) {
                    localStorage.setItem('currentUser', JSON.stringify(responseData.user));
                    alert(`🎉 Login Successful! Welcome back, ${responseData.user.fullName}.`);
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const nextRoute = urlParams.get('next');

                    if (responseData.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else if (responseData.user.role === 'teacher') {
                        window.location.href = 'teacher.html'; 
                    } else {
                        if (nextRoute === 'secure-exams') {
                            window.location.href = 'dashboard.html';
                        } else if (nextRoute === 'timed-tests') {
                            window.location.href = 'exam.html'; 
                        } else if (nextRoute === 'otp-login') {
                            window.location.href = 'dashboard.html?mode=otp';
                        } else {
                            window.location.href = 'dashboard.html'; 
                        }
                    }
                }
            })
            .catch(err => {
                console.error("🚨 Authentication Exception Caught:", err);
                alert("❌ Login Failed: Check if your Email/Password is correct, or make sure your server is running.");
            });
        });
    }

    // ==================== 2. OTP REQUEST SUBMIT (WITH UX PROTECTION) ====================
    const otpRequestForm = document.getElementById('otpRequestForm');
    if (otpRequestForm) {
        otpRequestForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const sendOtpBtn = otpRequestForm.querySelector('button[type="submit"]');
            const originalText = sendOtpBtn.innerText;
            
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerText = "Sending OTP... ⏳";
            
            const email = document.getElementById('otpEmail').value;
            
            fetch('/api/auth/generate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("OTP Sent Successfully!");
                    otpRequestForm.style.display = 'none';
                    document.getElementById('otpVerification').style.display = 'block';
                } else {
                    alert("Error: " + data.message);
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerText = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Kuch dikkat aa gayi hai bhai!");
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = originalText;
            });
        });
    }
    
    // ==================== 3. OTP LOGIN TOGGLE BUTTONS ====================
    const showOtpLogin = document.getElementById('showOtpLogin');
    const otpLoginDiv = document.getElementById('otpLogin');
    const passwordLoginDiv = document.getElementById('passwordLogin');
    const backToPassword = document.getElementById('backToPassword');
    
    if (showOtpLogin && otpLoginDiv && passwordLoginDiv) {
        showOtpLogin.addEventListener('click', function() {
            passwordLoginDiv.style.display = 'none';
            otpLoginDiv.style.display = 'block';
        });
    }
    
    if (backToPassword && otpLoginDiv && passwordLoginDiv) {
        backToPassword.addEventListener('click', function() {
            otpLoginDiv.style.display = 'none';
            passwordLoginDiv.style.display = 'block';
        });
    }
});

// ==================== 4. OTP VERIFICATION SUBMIT ====================
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', function(e) {
        e.preventDefault(); 
        
        const email = document.getElementById('otpEmail').value.trim();
        const otpCode = document.getElementById('otpCode').value.trim();
        
        if (!otpCode) {
            alert("Bhai pehle OTP toh daalo!");
            return;
        }
        
        console.log("🔐 Submitting OTP token validation request for:", email);
        
        fetch('/api/auth/verify-otp-login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, otp: otpCode })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                alert(`🎉 OTP Verified! Welcome back, ${data.user.fullName}.`);
                window.location.href = 'dashboard.html'; 
            } else {
                alert("❌ Invalid OTP: Sahi se check karke daalo bhai.");
            }
        })
        .catch(err => {
            console.error("🚨 OTP Verification Error:", err);
            alert("Kuch dikkat aa gayi verification me!");
        });
    });
}

// ==================== 5. FORGOT PASSWORD ACTION (UX PROTECTED) ====================
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('resetEmail');
        if (!emailInput) {
            alert("Email input field nahi mila bhai!");
            return;
        }
        const email = emailInput.value.trim();
        
        const resetSubmitBtn = document.getElementById('resetSubmitBtn');
        const originalText = resetSubmitBtn.innerText;
        
        resetSubmitBtn.disabled = true;
        resetSubmitBtn.innerText = "Checking Database... ⏳";
        
        fetch('/api/auth/forgot-password-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("🎉 Password Sent! Please check your registered Gmail inbox.");
                window.location.href = '/forgot-password';
            } else {
                alert("❌ Error: " + data.message);
                resetSubmitBtn.disabled = false;
                resetSubmitBtn.innerText = originalText;
            }
        })
        .catch(err => {
            console.error("🚨 Forgot Password Error:", err);
            alert("Kuch dikkat aa gayi bhai network me!");
            resetSubmitBtn.disabled = false;
            resetSubmitBtn.innerText = originalText;
        });
    });
}