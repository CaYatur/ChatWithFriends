const apiUrl = '/api';

// Check if already logged in
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'chat.html';
        return;
    }
    
    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            
            // Validation
            if (!username || !email || !password) {
                showMessage('Lütfen tüm alanları doldurun!', 'error');
                return;
            }
            
            if (username.length < 3) {
                showMessage('Kullanıcı adı en az 3 karakter olmalıdır!', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Şifre en az 6 karakter olmalıdır!', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showMessage('Geçerli bir e-posta adresi girin!', 'error');
                return;
            }
            
            // Disable button during request
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Kayıt oluşturuluyor...';
            
            try {
                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, username, password }),
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    showMessage(result.message || 'Kayıt başarısız!', 'error');
                }
            } catch (error) {
                console.error('Register error:', error);
                showMessage('Bağlantı hatası! Lütfen tekrar deneyin.', 'error');
            } finally {
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kayıt Ol';
            }
        });
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('registerMessage');
    messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}