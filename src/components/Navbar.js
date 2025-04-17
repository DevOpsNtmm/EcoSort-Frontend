import React from 'react';
import { NavLink } from 'react-router-dom';

// Navigation bar component for EcoSort UI
const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>♻️ EcoSort</div>
      <div style={styles.links}>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
          style={({ isActive }) => ({
            ...styles.link,
            ...(isActive ? styles.activeLink : {})
          })}
        >
          Home
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
          style={({ isActive }) => ({
            ...styles.link,
            ...(isActive ? styles.activeLink : {})
          })}
        >
          Results Dashboard
        </NavLink>
      </div>
    </nav>
  );
};

// Styling for navbar layout and interaction
const styles = {
  nav: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  logo: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1565c0',
  },
  links: {
    display: 'flex',
    gap: '20px',
  },
  link: {
    textDecoration: 'none',
    color: '#444',
    fontSize: '16px',
    padding: '6px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.3s',
  },
  activeLink: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    fontWeight: 'bold',
  }
};

export default Navbar;
