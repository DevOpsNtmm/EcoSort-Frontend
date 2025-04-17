import React from 'react';
import PropTypes from 'prop-types';

// Reusable confirmation popup component
const PopupConfirmation = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button onClick={onConfirm} style={styles.confirm}>Yes</button>
          <button onClick={onCancel} style={styles.cancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Prop validation to avoid runtime bugs and SonarLint warnings
PopupConfirmation.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// Inline styling for the popup appearance
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  popup: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    width: '400px',
    textAlign: 'center',
  },
  title: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#1565c0',
  },
  message: {
    fontSize: '16px',
    marginBottom: '20px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '10px',
  },
  confirm: {
    backgroundColor: '#388e3c',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancel: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default PopupConfirmation;
