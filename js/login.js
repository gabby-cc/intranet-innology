import { UserModel } from './models/UserModel.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email').value.trim();
            const passwordInput = document.getElementById('password').value;

            const userModel = new UserModel();
            const user = userModel.getAllUsers().find(u => 
                u.correo.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput
            );

            if (user) {
                // 🔍 MIRA LA CONSOLA PARA VER CÓMO SE LLAMA LA PROPIEDAD
                console.log("Usuario encontrado:", user); 

                // 🔒 Validación flexible (por si la propiedad se llama 'estado', 'status', 'Estado', etc.)
                const estadoUsuario = user.estado || user.status || user.Estado || 'Activo';
                
                // Convertimos a minúsculas para que 'Inactivo', 'inactivo' o 'INACTIVO' fallen igual
                if (estadoUsuario.toLowerCase() === 'inactivo') {
                    if (errorMessage) {
                        errorMessage.style.display = 'block';
                        errorMessage.textContent = '⛔ Tu cuenta ha sido desactivada. Contacta al administrador.';
                    }
                    return; // Detiene el inicio de sesión
                }

                // ✅ Si está activo, guardamos la sesión
                sessionStorage.setItem('innology_user', JSON.stringify(user));
                sessionStorage.setItem('innology_auth', 'true');
                
                if (errorMessage) errorMessage.style.display = 'none';
                
                window.location.href = 'intranet.html';
            } else {
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = 'Correo o contraseña incorrectos.';
                }
            }
        });
    }
});