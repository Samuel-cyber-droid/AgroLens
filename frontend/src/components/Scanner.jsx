import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; // <- Importamos nuestro nuevo cerebro central

export default function Scanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [textoDetectado, setTextoDetectado] = useState('');
  const [productoDetectado, setProductoDetectado] = useState(null);
  // 👇 NUEVOS ESTADOS PARA LAS RECOMENDACIONES 👇
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [mensajeScanner, setMensajeScanner] = useState('');
  
  const [procesando, setProcesando] = useState(false);
  const [errorCamera, setErrorCamera] = useState('');
  
  const [cantidad, setCantidad] = useState('');
  const [procesandoMovimiento, setProcesandoMovimiento] = useState(false);
  const [mensajeMovimiento, setMensajeMovimiento] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const iniciarCamara = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setErrorCamera('No se pudo acceder a la cámara. Revisa los permisos.');
      }
    };
    iniciarCamara();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturarYEnviar = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setProcesando(true);
    setTextoDetectado('');
    setProductoDetectado(null);
    setMensajeMovimiento('');
    setCantidad('');
    // 👇 Limpiamos estados anteriores 👇
    setRecomendaciones([]);
    setMensajeScanner('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imagenBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const respuesta = await api.post('inventario/escanear/', { 
        imagen: imagenBase64 
      });

      const datos = respuesta.data;
      
      setTextoDetectado(datos.texto_bruto || 'No se detectó texto.');
      setMensajeScanner(datos.mensaje || ''); // Guardamos el mensaje de la IA
      
      if (datos.producto_detectado) {
        setProductoDetectado(datos.producto_detectado);
      }
      
      // 👇 Guardamos las alternativas si existen 👇
      if (datos.recomendaciones) {
        setRecomendaciones(datos.recomendaciones);
      }

    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setTextoDetectado(`Aviso: ${error.response.data.error}`);
      } else {
        setTextoDetectado('Error al conectar con el servidor.');
      }
      console.error(error);
    } finally {
      setProcesando(false);
    }
  };

  const registrarMovimiento = async (tipo) => {
    if (!cantidad || cantidad <= 0) {
      setMensajeMovimiento('⚠️ Ingresa una cantidad válida.');
      return;
    }

    setProcesandoMovimiento(true);
    setMensajeMovimiento('');

    try {
      const respuesta = await api.post('inventario/movimiento/', {
        producto_id: productoDetectado.id,
        tipo: tipo,
        cantidad: parseInt(cantidad)
      });

      const datos = respuesta.data;
      setMensajeMovimiento(`✅ ${tipo} registrada. Nuevo stock: ${datos.nuevo_stock}`);
      setProductoDetectado({ ...productoDetectado, stock_actual: datos.nuevo_stock });
      setCantidad('');
      
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setMensajeMovimiento(`❌ Error: ${error.response.data.error}`);
      } else {
        setMensajeMovimiento('❌ Error de conexión al registrar.');
      }
    } finally {
      setProcesandoMovimiento(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#2E7D32' }}>Escanear</h2>
        <div>
          <button onClick={() => navigate('/inventario')} style={{ padding: '8px 15px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}>
            Inventario
          </button>
          <button onClick={cerrarSesion} style={{ padding: '8px 15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', position: 'relative' }}>
        {errorCamera ? (
          <p style={{ color: 'white', textAlign: 'center', padding: '20px' }}>{errorCamera}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <button 
        onClick={capturarYEnviar} 
        disabled={procesando || errorCamera}
        style={{ width: '100%', padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
      >
        {procesando ? 'Analizando...' : 'Tomar Foto y Escanear'}
      </button>

      {productoDetectado ? (
        <div style={{ padding: '20px', backgroundColor: '#e3f2fd', border: '2px solid #1976d2', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>✅ Producto Reconocido</h3>
          <p style={{ margin: '5px 0', fontWeight: 'bold', fontSize: '18px' }}>{productoDetectado.nombre_comercial}</p>
          <p style={{ margin: '5px 0', color: '#555' }}>Presentación: {productoDetectado.presentacion}</p>
          
          {/* El stock se pone rojo si es 0 */}
          <p style={{ margin: '15px 0', fontSize: '16px' }}>
            Stock Actual: <strong style={{ color: productoDetectado.stock_actual > 0 ? 'green' : 'red' }}>{productoDetectado.stock_actual}</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <input 
              type="number" 
              placeholder="Cant." 
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="1"
              style={{ width: '80px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
            />
            <button 
              onClick={() => registrarMovimiento('ENTRADA')}
              disabled={procesandoMovimiento}
              style={{ flex: 1, padding: '10px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Entrada
            </button>
            <button 
              onClick={() => registrarMovimiento('SALIDA')}
              disabled={procesandoMovimiento || productoDetectado.stock_actual <= 0}
              style={{ flex: 1, padding: '10px', backgroundColor: '#c62828', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              - Salida
            </button>
          </div>
          
          {mensajeMovimiento && (
            <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: '#333' }}>{mensajeMovimiento}</p>
          )}

          {/* 🌟 BLOQUE DE RECOMENDACIONES 🌟 */}
          {recomendaciones.length > 0 && (
            <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', backgroundColor: '#FFF3E0', border: '1px solid #FFB74D' }}>
              <h4 style={{ color: '#E65100', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ⚠️ Alternativas Sugeridas
              </h4>
              <p style={{ fontSize: '13px', color: '#E65100', marginBottom: '10px' }}>
                {mensajeScanner}
              </p>
              <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
                {recomendaciones.map((alt) => (
                  <li key={alt.id} style={{ padding: '8px', borderBottom: '1px solid #FFE0B2', display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{alt.nombre_comercial} ({alt.presentacion})</strong>
                    <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>Stock: {alt.stock_actual}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      ) : textoDetectado ? (
        <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderLeft: '5px solid #ff9800', borderRadius: '4px' }}>
          <p style={{ margin: 0, color: '#e65100', fontWeight: 'bold' }}>Texto detectado:</p>
          <p style={{ margin: '10px 0 0 0', color: '#333', whiteSpace: 'pre-wrap', fontSize: '14px' }}>{textoDetectado}</p>
        </div>
      ) : null}
    </div>
  );
}