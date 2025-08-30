import React, { useState, useRef, useEffect, useContext } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import './Home.css';

function Home() {
  const intervalRef = useRef(null);
  const stoppedRef = useRef(false);
  const PREDICTION_INTERVAL_MS = 250;
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const [blockMessageVisible, setBlockMessageVisible] = useState(false);
  const [dropdownDisabled, setDropdownDisabled] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [itemNumber, setItemNumber] = useState(null);
  const [systemAnalysis, setSystemAnalysis] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [trueClass, setTrueClass] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  useBlocker(() => {
    if (isRunning) {
      setBlockMessageVisible(true);
      setTimeout(() => setBlockMessageVisible(false), 3000);
      return false;
    }
    return true;
  }, true);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isRunning) {
        const message = '⚠️ Are you sure you want to leave? Your classification is still running.';
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning]);

  const runPredictionLoop = async () => {
    if (stoppedRef.current) return;
    await captureAndPredict();
  };

  const handleStart = async (isRunning) => {
    stoppedRef.current = false;
    if (!isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to notify backend.');
        console.log('System start notified successfully.');
      } catch (error) {
        console.error('Error starting system:', error);
      }
      setIsRunning(true);
      setTrueClass('');
      await sleep(PREDICTION_INTERVAL_MS);
      if (stoppedRef.current) return;
      runPredictionLoop();
    }
  };

  const captureAndPredict = async () => {
    if (stoppedRef.current) return;
    console.log('Running prediction...');
    try {
      const response = await fetch('http://localhost:5050/home/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Backend error: ${data.error || 'Unknown error'}`);
      setSystemAnalysis(data.label);
      const confidenceValue = parseFloat(data.confidence);
      setConfidence(confidenceValue);
      setItemNumber(data.inserted_id || null);
      setCapturedImage(`http://localhost:5050/images/${encodeURIComponent(data.image_name)}`);
      console.log(`Label: ${data.label}, Confidence: ${confidenceValue}`);
      if (confidenceValue < 70 && data.label !== "Track") {
        pausePrediction();
      } else {
        if (!stoppedRef.current) {
          const timeoutId = setTimeout(captureAndPredict, PREDICTION_INTERVAL_MS);
          intervalRef.current = timeoutId;
        }
      }
    } catch (error) {
      console.error('Error capturing and predicting:', error);
    }
  };

  const pausePrediction = () => {
    clearTimeout(intervalRef.current);
    intervalRef.current = null;
    handleStop(true, true);
    setDropdownDisabled(false);
    console.log('🛑 Prediction paused due to low confidence.');
  };

  const handleManualSave = async () => {
    if (!trueClass) {
      alert('⚠️ Please select a classification before saving.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5050/dashboard/results/${itemNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueClass, systemAnalysis }),
      });
      if (!response.ok) throw new Error(`Failed to update: ${response.statusText}`);
    } catch (error) {
      console.error('Error updating true class:', error);
    }
    setDropdownDisabled(true);
    setShowSavedMessage(true);
    handleStart(false);
    setTimeout(() => setShowSavedMessage(false), 1000);
    try {
      const response = await fetch(`http://localhost:5050/home/servo_push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueClass }),
      });
      if (!response.ok) throw new Error(`Failed to call servo: ${response.statusText}`);
    } catch (error) {
      console.error('Error calling servo endpoint:', error);
    }
    await fetch(`http://localhost:5050/dashboard/copy_uncertain/${itemNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trueClass }),
    });
    setTrueClass('');
  };

  const handleStop = async (isRunning, paused) => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to notify backend.');
        console.log('System stop notified successfully.');
      } catch (error) {
        console.error('Error stopping system:', error);
      }
      if (!paused) setIsRunning(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.emoji}>♻️</span>
          <span style={styles.gradientText}>EcoSort</span>
        </h1>
        <p style={styles.subtitle}>Smart Trash Classification System</p>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {!isRunning ? (
          <div style={styles.startSection}>
            <div style={styles.startCard} className="start-card">
              <h2 style={styles.startTitle}>Ready to Start</h2>
              <p style={styles.startDescription}>
                Click the button below to begin automatic waste classification
              </p>
              <button 
                onClick={() => handleStart(false)} 
                style={styles.startButton}
                className="start-button"
              >
                ▶ Start Classification
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.runningSection}>
            {/* Status Card */}
            <div style={styles.statusCard} className="status-card">
              <div style={styles.statusHeader}>
                <div style={styles.statusIndicator}>
                  <div style={styles.statusDot}></div>
                  <span style={styles.statusText}>System Running</span>
                </div>
                <button 
                  onClick={() => handleStop(true, false)} 
                  style={styles.stopButton}
                  className="stop-button"
                >
                  ⏹ Stop & Save
                </button>
              </div>
            </div>

            {/* Results Card */}
            <div style={styles.resultsCard} className="results-card">
              <h2 style={styles.resultsTitle}>Live Classification Results</h2>
              
              {/* Image Display */}
              {capturedImage && (
                <div style={styles.imageSection}>
                  <img
                    src={capturedImage}
                    alt="Captured item"
                    style={styles.image}
                    className="captured-image"
                  />
                </div>
              )}

              {/* Results Display */}
              {itemNumber !== null ? (
                <div style={styles.resultsContent}>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Prediction:</span>
                    <span style={styles.resultValue}>
                      {systemAnalysis === "Track" ? "—" : systemAnalysis}
                    </span>
                  </div>
                  
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Confidence:</span>
                    <div style={styles.confidenceDisplay}>
                      <div style={{
                        ...styles.confidenceBar,
                        width: `${confidence || 0}%`,
                        backgroundColor: (confidence || 0) >= 70 ? '#10b981' : '#f59e0b'
                      }}></div>
                      <span style={styles.confidenceText}>
                        {confidence !== null ? `${confidence}%` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Success Message */}
                  {showSavedMessage && (
                    <div style={styles.successMessage}>
                      <span style={styles.successIcon}>✅</span>
                      <span style={styles.successText}>Classification saved successfully!</span>
                    </div>
                  )}

                  {/* Low Confidence Section */}
                  {confidence !== null && confidence < 70 && (
                    <div style={styles.lowConfidenceSection}>
                      <div style={styles.warningHeader}>
                        <span style={styles.warningIcon}>⚠️</span>
                        <span style={styles.warningText}>Low Confidence - Manual Classification Required</span>
                      </div>
                      
                      <div style={styles.classificationForm}>
                        <label style={styles.formLabel}>Select the correct classification:</label>
                        <select
                          value={trueClass}
                          onChange={(e) => setTrueClass(e.target.value)}
                          disabled={dropdownDisabled}
                          style={styles.dropdown}
                          className="classification-dropdown"
                        >
                          <option value="">-- Select Type --</option>
                          <option value="Paper">Paper</option>
                          <option value="Plastic">Plastic</option>
                          <option value="Other">Other</option>
                          <option value="Track">None</option>
                        </select>
                        
                        <button 
                          onClick={handleManualSave} 
                          style={styles.manualSaveButton}
                          className="manual-save-button"
                        >
                          Save Manual Classification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.waitingSection}>
                  <div style={styles.waitingIcon}>⏳</div>
                  <p style={styles.waitingText}>Waiting for next prediction...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Warning Banner */}
      {blockMessageVisible && (
        <div style={styles.blockBanner} className="block-banner">
          <span style={styles.blockIcon}>⚠️</span>
          <span style={styles.blockText}>
            Please stop the classification before navigating away.
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  title: {
    fontSize: '3rem',
    fontWeight: '700',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  emoji: {
    fontSize: '3rem',
    filter: 'none'
  },
  gradientText: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px'
  },
  startSection: {
    width: '100%',
    maxWidth: '500px'
  },
  startCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px 32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    textAlign: 'center'
  },
  startIcon: {
    fontSize: '4rem',
    marginBottom: '24px'
  },
  startTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  startDescription: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0 0 32px 0',
    lineHeight: '1.6'
  },
  startButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '16px 32px',
    fontSize: '1.125rem',
    fontWeight: '600',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  runningSection: {
    width: '100%',
    maxWidth: '600px'
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    marginBottom: '24px'
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  statusText: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#10b981'
  },
  stopButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },
  resultsTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  imageSection: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '300px',
    height: 'auto',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease'
  },
  resultsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  resultLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  resultValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  confidenceDisplay: {
    position: 'relative',
    width: '120px',
    height: '24px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  confidenceBar: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s ease'
  },
  confidenceText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#166534'
  },
  successIcon: {
    fontSize: '1.25rem'
  },
  successText: {
    fontSize: '1rem',
    fontWeight: '600'
  },
  lowConfidenceSection: {
    padding: '24px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    marginTop: '16px'
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  warningIcon: {
    fontSize: '1.5rem'
  },
  warningText: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#dc2626'
  },
  classificationForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  dropdown: {
    padding: '12px 16px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  manualSaveButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  waitingSection: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  waitingIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.6'
  },
  waitingText: {
    fontSize: '1.125rem',
    color: '#64748b',
    fontWeight: '500'
  },
  blockBanner: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #fbbf24'
  },
  blockIcon: {
    fontSize: '1.25rem'
  },
  blockText: {
    fontSize: '1rem',
    fontWeight: '600'
  }
};

function useBlocker(blocker, when = true) {
  const navigator = useContext(UNSAFE_NavigationContext).navigator;
  useEffect(() => {
    if (!when) return;
    const push = navigator.push;
    navigator.push = (...args) => {
      const result = blocker();
      if (result !== false) {
        push.apply(navigator, args);
      }
    };
    return () => {
      navigator.push = push;
    };
  }, [blocker, when, navigator]);
}

export default Home;  