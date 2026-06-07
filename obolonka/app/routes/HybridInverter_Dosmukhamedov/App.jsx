import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';

function App() {
  return (
    <Router>
      <div style={layoutStyle}>
        {/* Навігаційна панель (Homebar) */}
        <nav style={navStyle}>
          <div style={logoStyle}>⚡ SmartEnergy</div>
          <div style={linksContainer}>
<Link to="/HybridInverter_Dosmukhamedov" style={linkStyle}>Дашборд</Link>
<Link to="/HybridInverter_Dosmukhamedov/history" style={linkStyle}>Історія</Link>
<Link to="/HybridInverter_Dosmukhamedov/settings" style={linkStyle}>Налаштування</Link>
          </div>
        </nav>

        {/* Контент сторінок */}
        <main style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
          <Routes>
            <Route path="/HybridInverter_Dosmukhamedov" element={<Dashboard />} />
            <Route path="/HybridInverter_Dosmukhamedov/history" element={<History />} />
            <Route path="/HybridInverter_Dosmukhamedov/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Стилі 
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 40px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e5e7eb'
};

const linkStyle = {
  color: '#666666',
  textDecoration: 'none',
  marginLeft: '20px',
  fontSize: '18px',
  fontWeight: '500',
  transition: 'color 0.3s',
  ':hover': { color: '#f59e0b' }
};

const layoutStyle = {
  minHeight: '100vh',
  width: '100%',
  backgroundColor: '#f9f9f9',
  color: '#1f2937',
  display: 'flex',
  flexDirection: 'column'
};

const logoStyle = { color: '#f59e0b', fontSize: '24px', fontWeight: 'bold' };
const linksContainer = { display: 'flex' };

export default App;