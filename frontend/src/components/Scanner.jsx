import { useRef, useState, useEffect } from 'react';

export default function Scanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Encender la cámara al cargar la pantalla
  useEffect(() => {
    iniciarCamara();
  }, []);

  const iniciarCamara = async () => {
    try {
      // facingMode: "environment" fuerza a usar la cámara trasera (ideal para campo)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Revisa los permisos.");
    }
  };

  const capturarYEnviar = () => {
    setCargando(true);
    setError('');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Ajustar el canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // "Tomar la foto" dibujando el video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir el canvas a un archivo de imagen (Blob)
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('imagen', blob, 'etiqueta.jpg');

      try {
        // AQUÍ CONECTAMOS CON TU DJANGO
        // Nota: Pega aquí temporalmente el Token que sacaste en Postman
        const tokenJWT = "TU_TOKEN_LARGUISIMO_DE_POSTMAN_AQUI"; 

        const respuesta = await fetch('http://127.0.0.1:8000/api/inventario/escanear/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenJWT}`
          },
          body: formData
        });

        const datos = await respuesta.json();
        
        if (datos.coincidencias && datos.coincidencias.length > 0) {
          setProducto(datos.coincidencias[0]); // Mostramos el primer producto encontrado
        } else {
          setError("No se reconoció ningún producto en la base de datos.");
        }
      } catch (err) {
        setError("Error al conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    }, 'image/jpeg');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Escanear Agroquímico</h2>
      
      {/* Contenedor del Video (Subtarea 1 y 4) */}
      <div style={{ backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }}></video>
      </div>

      {/* Canvas Oculto (necesario para tomar la foto) */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {/* Botón de Captura Grande para Operadores */}
      <button 
        onClick={capturarYEnviar} 
        disabled={cargando}
        style={{ width: '100%', padding: '15px', fontSize: '18px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '20px' }}
      >
        {cargando ? 'Procesando...' : '📷 Tomar Foto de Etiqueta'}
      </button>

      {/* Mensajes de Error */}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {/* Tarjeta de Resultados (Subtarea 1) */}
      {producto && (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>✅ Coincidencia Encontrada</h3>
          <p><strong>Producto:</strong> {producto.nombre_comercial}</p>
          <p><strong>Ingrediente:</strong> {producto.ingrediente_activo}</p>
          <p><strong>Stock Actual:</strong> {producto.stock_actual} {producto.presentacion}</p>
        </div>
      )}
    </div>
  );
}