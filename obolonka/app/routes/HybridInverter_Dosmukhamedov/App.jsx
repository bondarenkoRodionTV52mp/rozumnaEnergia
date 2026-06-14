import React from 'react';
import { Outlet } from 'react-router-dom';

import './App.css';


export default function App() {
  return (
    <div style={layoutStyle}>
      <nav style={navStyle}>
        <div style={logoStyle}>⚡ SmartEnergy</div>
        <div style={linksContainer}>
          <a href="/HybridInverter_Dosmukhamedov" style={linkStyle}>Дашборд</a>
          <a href="/HybridInverter_Dosmukhamedov/history" style={linkStyle}>Історія</a>
          <a href="/HybridInverter_Dosmukhamedov/settings" style={linkStyle}>Налаштування</a>
        </div>
      </nav>
      <main style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
        <Outlet />
      </main>
    </div>
  );
}

// Dark Theme Styles
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 40px',
  backgroundColor: '#1e293b',
  borderBottom: '1px solid #334155'
};

const linkStyle = {
  color: '#e5e7eb',
  textDecoration: 'none',
  marginLeft: '20px',
  fontSize: '18px',
  fontWeight: '500',
  transition: 'color 0.3s',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  padding: 0,
  ':hover': { color: '#fbbf24' }
};

const layoutStyle = {
  minHeight: '100vh',
  width: '100%',
  backgroundColor: '#0f172a',
  color: 'rgb(1, 29, 83)',
  display: 'flex',
  flexDirection: 'column'
};

const logoStyle = { color: '#f59e0b', fontSize: '24px', fontWeight: 'bold' };
const linksContainer = { display: 'flex' };