document.addEventListener('DOMContentLoaded', function() {
    
    const authCard = document.getElementById('mainRegisterCard');
    if (authCard) {
        setTimeout(() => {
            authCard.classList.add('reveal-active');
        }, 300);
    }

    /* ==========================================================================
       SMOOTH MULTI-ELEMENT IRIS TRACKING SYSTEM
       ========================================================================== */
    const bgEyeContainers = document.querySelectorAll('.bg-eye-container');
    const bgIrisGroups = document.querySelectorAll('.iris-movement-group');
    const normalInputs = document.querySelectorAll('#registerForm input:not([type="password"]), #registerForm select');
    const secureInputs = document.querySelectorAll('input[type="password"]');

    normalInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let length = e.target.value.length || 0;
            // Precise horizontal coordinate shift calculation
            let xOffset = Math.min(35, Math.max(-35, (length - 12) * 2.5));
            bgIrisGroups.forEach(group => {
                group.style.transform = `translateX(${xOffset}px)`;
            });
        });
        
        input.addEventListener('focus', () => {
            bgEyeContainers.forEach(container => container.classList.remove('close-action'));
        });
    });

    secureInputs.forEach(pwd => {
        pwd.addEventListener('focus', () => {
            bgEyeContainers.forEach(container => container.classList.add('close-action'));
        });
        pwd.addEventListener('blur', () => {
            bgEyeContainers.forEach(container => container.classList.remove('close-action'));
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#registerForm')) {
            bgIrisGroups.forEach(group => group.style.transform = 'translateX(0px)');
        }
    });

    // Existing Form Registration Request API Pipeline Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value.trim();
            const rollNumber = document.getElementById('rollNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const courseBranch = document.getElementById('courseBranch').value;
            const section = document.getElementById('section').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value || 'student';
            const semester = document.getElementById('regSemester') ? document.getElementById('regSemester').value : 'Semester-1';
            
            if (password !== confirmPassword) {
                alert('❌ Error: Passwords do not match!');
                return;
            }
            if (password.length < 6) {
                alert('❌ Security Warning: Password must be at least 6 characters long!');
                return;
            }
            if (!rollNumber) {
                alert('❌ Validation Failure: University Roll Number is strict mandatory!');
                return;
            }
            
            const signupPayload = {
                fullName: fullName, rollNumber: rollNumber, email: email, phone: phone,
                courseBranch: courseBranch, section: section, password: password, role: role, semester: semester
            };
            
            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupPayload)
            })
            .then(res => res.json())
            .then(responseData => {
                if (responseData.success) {
                    alert('🎉 Registration Successful! Redirecting to sign-in page...');
                    window.location.href = 'login.html';
                } else {
                    alert('❌ Registration Failed: ' + responseData.message);
                }
            })
            .catch(err => {
                alert("❌ Server Connection Error: Check if backend is running.");
            });
        });
    }
});




// 🎬 DYNAMIC TYPEWRITER KINETIC TIMELINE CONTROL FUNCTION
function triggerCinematicTextTimeline() {
    const visualStage = document.getElementById('introVisualStage');
    const textStage = document.getElementById('introTextStage');
    const textHeader = document.getElementById('kineticTextHeader');
    const mainOverlay = document.getElementById('cinemaIntroOverlay');
    
    // Step 1: Hide globe and start button immediately
    visualStage.classList.add('hidden');
    textStage.classList.remove('hidden');
    
    // Netflix high-speed configuration arrays strings
    const targetString = "Welcome to CoreTest System";
    let index = 0;
    textHeader.innerHTML = ""; // Clear stage array strings
    
    // 🎯 Fast typewriter loop function mapping
    const dynamicTypingTimer = setInterval(() => {
        if (index < targetString.length) {
            textHeader.innerHTML += targetString.charAt(index);
            index++;
        } else {
            clearInterval(dynamicTypingTimer);
            
            // Step 2: Allow the message to flash for exactly 2.5 seconds
            setTimeout(() => {
                // Fade out cinematic screen animation sequence
                mainOverlay.style.opacity = '0';
                
                // Finalize timeline and hand over view dashboard matrix to layout
                setTimeout(() => {
                    mainOverlay.classList.add('hidden');
                }, 800);
            }, 2500);
        }
    }, 70); // High-speed dynamic frame duration (70ms per character trace)
}


// ==========================================================================
// 🌌 CINEMATIC ENGINE: STABLE MEDIUM-DENSITY SPHERE & ULTRA-SMOOTH EXPOSION
// ==========================================================================

(function initSmoothBalancedGlobe() {
    const canvas = document.getElementById('particleGlobeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Strict pixel alignment to avoid resolution scaling stutters
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const points = [];
    // 🎯 STRICTLY LOCKED: Shuruaat mein pure 2000 particles ghanepan ke saath ghoomenge
    const numParticles = 15000; 
    const sphereRadius = 140; 
    let angleY = 0;
    
    window.isExplodingActive = false;
    window.particleExplosionAlpha = 1.0;

    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    // Rigid static sphere particle generation loop
    for (let i = 0; i < numParticles; i++) {
        const theta = Math.acos((Math.random() * 2) - 1);
        const phi = Math.random() * Math.PI * 2;
        
        const dirX = Math.sin(theta) * Math.cos(phi);
        const dirY = Math.cos(theta);
        const dirZ = Math.sin(theta) * Math.sin(phi);
        
        // 🎯 STRICT UNIFORM VELOCITY: Phatne ki speed har particle ke liye fix taaki barabar bikhre
        const speedMultiplier = 14; 

        points.push({
            x: sphereRadius * dirX,
            y: sphereRadius * dirY,
            z: sphereRadius * dirZ,
            vX: dirX * speedMultiplier,
            vY: dirY * speedMultiplier,
            vZ: dirZ * speedMultiplier
        });
    }

    // Dynamic browser windows resize alignment metrics updates
    window.addEventListener('resize', () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
    });

    function renderFrame() {
        if (window.particleExplosionAlpha <= 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return; 
        }

        // 🎯 60FPS SMOOTHNESS GLITCH REMOVAL: Clean canvas drawing baseline trace
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (!window.isExplodingActive) {
            angleY += 0.005; // Controlled premium uniform rotational velocity
        }

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        for (let i = 0; i < points.length; i++) {
            const p = points[i];

            if (window.isExplodingActive) {
                // Smooth progressive transition layout
                p.x += p.vX * 0.4;
                p.y += p.vY * 0.4;
                p.z += p.vZ * 0.4;
            }

            const rotX = p.x * cosY - p.z * sinY;
            const rotZ = p.x * sinY + p.z * cosY;

            const perspective = 300 / (300 + rotZ);
            const finalX = centerX + rotX * perspective;
            const finalY = centerY + p.y * perspective;

            // Restricting coordinates tracking inside view frames perfectly
            if (finalX >= 0 && finalX <= canvas.width && finalY >= 0 && finalY <= canvas.height) {
                ctx.beginPath();
                // Bounded atomic size metrics to preserve medium starry text balance
                ctx.arc(finalX, finalY, 1.1 * perspective, 0, Math.PI * 2);
                
                const alphaValue = (window.isExplodingActive) ? window.particleExplosionAlpha : (0.4 + (perspective * 0.6));
                ctx.fillStyle = `rgba(220, 38, 38, ${alphaValue})`; 
                ctx.fill();
            }
        }

        if (window.isExplodingActive) {
            window.particleExplosionAlpha -= 0.015; // Smooth exponential linear fade away execution
        }

        requestAnimationFrame(renderFrame);
    }
    renderFrame();
})();

// 🎯 TRIGGER TIMELINE CONTROL WITH INSTANT BUTTON ERASURE
function triggerCinematicTextTimeline() {
    const startBtn = document.getElementById('startIntroTimelineBtn');
    const textStage = document.getElementById('introTextStage');
    const textHeader = document.getElementById('kineticTextHeader');
    const mainOverlay = document.getElementById('cinemaIntroOverlay');
    
    // 🎯 REMOVE BUTTON INSTANTLY WITH MAXIMUM DISPATCH RESPONSE
    if (startBtn) {
        startBtn.style.display = 'none';
        startBtn.style.visibility = 'hidden';
    }

    // Detonate canvas points layout smoothly
    window.isExplodingActive = true;

    // Smooth delay before initializing typewriter letters animation strings streams
    setTimeout(() => {
        if (textStage) {
            textStage.classList.remove('hidden');
            textStage.style.display = 'flex';
        }
    }, 80); 
    
    const targetString = "Welcome to CoreTest System";
    let index = 0;
    textHeader.innerHTML = "";
    
    const dynamicTypingTimer = setInterval(() => {
        if (index < targetString.length) {
            textHeader.innerHTML += targetString.charAt(index);
            index++;
        } else {
            clearInterval(dynamicTypingTimer);
            setTimeout(() => {
                if (mainOverlay) {
                    mainOverlay.style.opacity = '0';
                    setTimeout(() => { 
                        mainOverlay.classList.add('hidden'); 
                        mainOverlay.style.display = 'none';
                    }, 600);
                }
            }, 2500);
        }
    }, 65);
}