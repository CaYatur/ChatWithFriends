const apiUrl = '/api'; // Relative URL since we're serving from the same server

// Function to register a new user
async function registerUser(email, username, password) {
    try {
        const response = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
        });
        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        return { message: 'Registration failed' };
    }
}

// Function to log in a user
async function loginUser(username, password) {
    try {
        const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        return { message: 'Login failed' };
    }
}

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const messageDiv = document.getElementById('loginMessage');
            
            const result = await loginUser(username, password);
            
            if (result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('username', result.user.username);
                messageDiv.innerHTML = '<div class="message success">Login successful!</div>';
                setTimeout(() => {
                    showDashboard();
                }, 1000);
            } else {
                messageDiv.innerHTML = `<div class="message error">${result.message}</div>`;
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const messageDiv = document.getElementById('registerMessage');
            
            const result = await registerUser(email, username, password);
            
            if (result.message === 'User registered successfully') {
                messageDiv.innerHTML = '<div class="message success">Registration successful! Please login.</div>';
                setTimeout(() => {
                    showSection('login');
                }, 2000);
            } else {
                messageDiv.innerHTML = `<div class="message error">${result.message}</div>`;
            }
        });
    }
});