export class UserModel {
    constructor() {
        // ✅ 1. Intentamos cargar los usuarios guardados en el navegador
        const guardados = localStorage.getItem('innology_usuarios');
        
        if (guardados) {
            this.users = JSON.parse(guardados);
        } else {
            // 2. Si no hay nada guardado, creamos los de prueba por defecto
            this.users = [
                {
                    id: "USR-001",
                    nombre: "Laura Méndez",
                    correo: "laura@innology.com",
                    password: "demo123",
                    rol: "Administrador",
                    perfil: "-",
                    modulos: [],
                    paises: [],
                    empresa: "",
                    paisSolicitante: "",
                    estado: "Activo",
                    fechaAlta: "2026-10-20"
                },
                {
                    id: "USR-002",
                    nombre: "Daniel Rojas",
                    correo: "daniel@innology.com",
                    password: "123",
                    rol: "Consultor",
                    perfil: "Técnico",
                    modulos: ["Ventas", "Inventario"],
                    paises: ["México", "Colombia"],
                    empresa: "",
                    paisSolicitante: "",
                    estado: "Activo",
                    fechaAlta: "2026-10-21"
                },
                {
                    id: "USR-003",
                    nombre: "Carlos Pérez",
                    correo: "carlos@innology.com",
                    password: "123",
                    rol: "Solicitante",
                    perfil: "-",
                    modulos: [],
                    paises: [],
                    empresa: "Grupo Atlas",
                    paisSolicitante: "México",
                    estado: "Activo",
                    fechaAlta: "2026-10-22"
                }
            ];
            this.guardarUsuarios(); // Guardamos los por defecto
        }
    }

    // ✅ 3. Nuevo método para guardar los cambios en el almacenamiento
    guardarUsuarios() {
        localStorage.setItem('innology_usuarios', JSON.stringify(this.users));
    }

    getAllUsers() { return this.users; }
    getUserById(id) { return this.users.find(u => u.id === id); }

    checkEmailExists(correo, excludeId = null) {
        return this.users.some(u => u.correo.toLowerCase() === correo.toLowerCase() && u.id !== excludeId);
    }

    createUser(userData) {
        const lastNumber = this.users.length > 0 
            ? Math.max(...this.users.map(u => parseInt(u.id.split('-')[1]))) 
            : 0;
        const newId = `USR-${String(lastNumber + 1).padStart(3, '0')}`;
        
        const today = new Date();
        const fechaAlta = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const newUser = {
            id: newId,
            ...userData,
            fechaAlta: fechaAlta
        };
        
        this.users.push(newUser);
        this.guardarUsuarios(); // ✅ Guardamos
        return newUser;
    }

    updateUser(id, updatedData) {
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            const existingUser = this.users[index];
            const newPassword = updatedData.password && updatedData.password.trim() !== '' 
                ? updatedData.password 
                : existingUser.password;

            this.users[index] = { 
                ...existingUser, 
                ...updatedData,
                password: newPassword
            };
            this.guardarUsuarios(); // ✅ Guardamos
            return true;
        }
        return false;
    }

    toggleStatus(id) {
        const user = this.getUserById(id);
        if (user) {
            user.estado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
            this.guardarUsuarios(); // ✅ Guardamos
            return true;
        }
        return false;
    }
}