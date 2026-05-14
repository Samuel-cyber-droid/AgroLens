import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; // <- Importamos nuestro nuevo cerebro central

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerInventario = async () => {
      try {
        // ¡Mira qué limpio! Ya no hay que buscar el token, ni armar headers, ni revisar el status 401.
        // Axios e interceptors se encargan de todo eso en la sombra.
        const respuesta = await api.get('inventario/productos/');
        
        // Axios también convierte el JSON automáticamente en "respuesta.data"
        setProductos(respuesta.data); 
      } catch (err) {
        setError('Error al cargar la base de datos.');
        console.error(err);
      } finally {
        setCargando(false);
      }
    };

    obtenerInventario();
  }, []);

  const productosFiltrados = productos.filter(producto => 
    producto.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#2E7D32', margin: 0 }}>Inventario General</h2>
        <div>
          <button onClick={() => navigate('/escanear')} style={{ padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}>
            Ir al Escáner
          </button>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ padding: '8px 15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      <input 
        type="text" 
        placeholder="🔍 Buscar agroquímico..." 
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' }}
      />

      {cargando ? (
        <p style={{ textAlign: 'center' }}>Cargando base de datos...</p>
      ) : error ? (
        <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px 15px', color: '#333' }}>Producto</th>
                <th style={{ padding: '12px 15px', color: '#333' }}>Stock</th>
                <th style={{ padding: '12px 15px', color: '#333' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length > 0 ? (
                productosFiltrados.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{item.nombre}</td>
                    <td style={{ padding: '12px 15px' }}>{item.cantidad} unidades</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: item.cantidad > 10 ? '#e8f5e9' : '#ffebee', color: item.cantidad > 10 ? '#2e7d32' : '#c62828' }}>
                        {item.cantidad > 10 ? 'Disponible' : 'Stock Bajo'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#777' }}>
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}