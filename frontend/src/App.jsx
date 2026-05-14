import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Scanner from './components/Scanner';
import Inventario from './pages/Inventario'; // <- 1. Importamos la nueva pantalla

function App() {
  const estaAutenticado = !!localStorage.getItem('accessToken');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/escanear" 
          element={estaAutenticado ? <Scanner /> : <Navigate to="/login" replace />} 
        />

        {/* 2. Agregamos la ruta protegida del Inventario */}
        <Route 
          path="/inventario" 
          element={estaAutenticado ? <Inventario /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;