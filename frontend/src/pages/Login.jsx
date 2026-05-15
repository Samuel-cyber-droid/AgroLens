import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [credenciales, setCredenciales] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const manejarCambio = (e) => {
        setCredenciales({
            ...credenciales,
            [e.target.name]: e.target.value
        });
    };

    const iniciarSesion = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        try {
            const respuesta = await fetch('https://agrolens-l9z7.onrender.com/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credenciales),
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Guardamos los tokens en el almacenamiento local del navegador
                localStorage.setItem('accessToken', datos.access);
                localStorage.setItem('refreshToken', datos.refresh);

                // Redirección directa al escáner sin alertas
                navigate('/escanear');
            } else {
                setError('Usuario o contraseña incorrectos.');
            }
        } catch (err) {
            setError('Error al conectar con el servidor. Verifica que Django esté corriendo.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>

                <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>AgroLens Login</h2>

                <form onSubmit={iniciarSesion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Usuario</label>
                        <input
                            type="text"
                            name="username"
                            value={credenciales.username}
                            onChange={manejarCambio}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Contraseña</label>
                        <input
                            type="password"
                            name="password"
                            value={credenciales.password}
                            onChange={manejarCambio}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && <p style={{ color: 'red', fontSize: '14px', margin: '0', textAlign: 'center' }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={cargando}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}
                    >
                        {cargando ? 'Verificando...' : 'Entrar al Sistema'}
                    </button>
                </form>
            </div>
        </div>
    );
}