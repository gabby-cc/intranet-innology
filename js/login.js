document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const USUARIO_VALIDO = "laura.mendez@innology.com";
    const PASSWORD_VALIDA = "demo123";

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email').value;
            const passwordInput = document.getElementById('password').value;

            if (emailInput === USUARIO_VALIDO && passwordInput === PASSWORD_VALIDA) {
                errorMessage.style.display = 'none';
                sessionStorage.setItem('innology_auth', 'true');
                window.location.href = 'intranet.html';
            } else {
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Correo o contraseña incorrectos.';
            }
        });
    }
});