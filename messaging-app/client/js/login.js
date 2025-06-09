const apiUrl = '/api';

// Check if already logged in
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'chat.html';
        return;
    }
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const messageDiv = document.getElementById('loginMessage');
            
            if (!username || !password) {
                showMessage('Lütfen tüm alanları doldurun!', 'error');
                return;
            }
            
            // Disable button during request
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Giriş yapılıyor...';
            
            try {
                const response = await fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });
                
                const result = await response.json();
                
                if (response.ok && result.token) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('username', result.user.username);
                    showMessage('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'chat.html';
                    }, 1000);
                } else {
                    showMessage(result.message || 'Giriş başarısız!', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Bağlantı hatası! Lütfen tekrar deneyin.', 'error');
            } finally {
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Giriş Yap';
            }
        });
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}