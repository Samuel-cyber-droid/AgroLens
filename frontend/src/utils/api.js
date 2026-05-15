import axios from 'axios';

// 1. Configuramos la instancia base
// ⚠️ IMPORTANTE: Cambia "192.168.X.X" por la dirección IP de tu computadora (ej. 192.168.1.70)
// Nota: Si en el futuro dejas de usar el celular y vuelves a desarrollar solo en la laptop, 
// cambia esta IP de vuelta a "127.0.0.1"
const api = axios.create({
    baseURL: 'https://agrolens-l9z7.onrender.com/api/',
});

// 2. INTERCEPTOR DE PETICIÓN: El "Gafete Automático"
// Antes de que cualquier petición salga hacia Django, Axios le pega el Access Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. INTERCEPTOR DE RESPUESTA: El "Escudo de Sesión"
// Vigila lo que responde Django. Si detecta un 401 (Token caducado), pide uno nuevo en silencio
api.interceptors.response.use(
    (response) => response, // Si todo sale bien, deja pasar la respuesta normal
    async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 y es la primera vez que falla esta petición específica
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Marcamos que ya estamos intentando rescatar la petición

            try {
                const refreshToken = localStorage.getItem('refreshToken');

                // Vamos a la ruta nativa de Django SimpleJWT para renovar llaves
                // Nota: Como no usamos 'api.post', esto no entra en un bucle infinito
                const respuestaRefresh = await axios.post('https://agrolens-l9z7.onrender.com/api/token/refresh/', {
                    refresh: refreshToken,
                });

                // Si Django nos da un token nuevo, lo guardamos
                if (respuestaRefresh.status === 200) {
                    localStorage.setItem('accessToken', respuestaRefresh.data.access);

                    // Actualizamos la petición original que había fallado con la nueva llave
                    originalRequest.headers.Authorization = `Bearer ${respuestaRefresh.data.access}`;

                    // Volvemos a disparar la petición original como si nada hubiera pasado
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Si el Refresh Token también ya caducó (ej. pasaron varios días)
                // Entonces limpiamos la memoria y mandamos al usuario al Login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Si es otro tipo de error (como 500 o 400), lo dejamos pasar para que React lo maneje
        return Promise.reject(error);
    }
);

export default api;