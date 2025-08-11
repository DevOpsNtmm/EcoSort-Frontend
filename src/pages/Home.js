import React, { useState, useRef, useEffect, useContext } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

function Home() {
  const [counter, setCounter] = useState(() => {
    const stored = localStorage.getItem('counter');
    return stored ? parseInt(stored, 10) : 1;
  });

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
  const [fileName, setFileName] = useState('');

  // Block navigation if the system is running
  useBlocker(() => {
    if (isRunning) {
      setBlockMessageVisible(true);
      setTimeout(() => setBlockMessageVisible(false), 3000); // auto-hide after 3s
      return false; // prevent navigation
    }
    return true; // allow navigation
  }, true);

  // Prevent page refresh or close when the system is running
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
    if (stoppedRef.current) return; // Prevent running if stopped
    await captureAndPredict();
  };

  const handleStart = async (isRunning) => {
    stoppedRef.current = false;
    if (!isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to notify backend.');
        }

        console.log('System start notified successfully.');
      } catch (error) {
        console.error('Error starting system:', error);
      }

      setIsRunning(true);
      setTrueClass('');
      await sleep(PREDICTION_INTERVAL_MS);
      if (stoppedRef.current) return;  // Prevent running if stopped during sleep
      runPredictionLoop();
    }
  };

  const captureAndPredict = async () => {
    if (stoppedRef.current) return; // Prevent running if stopped

    console.log('Running prediction...');
    try {
      const response = await fetch('http://localhost:5050/home/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Backend error: ${data.error || 'Unknown error'}`);
      }
      setSystemAnalysis(data.label);
      setFileName(data.image_name);
      const confidenceValue = parseFloat(data.confidence);
      setConfidence(confidenceValue);
      setItemNumber(data.inserted_id || null);
      setCapturedImage(`http://localhost:5050/images/${encodeURIComponent(data.image_name)}`);

      console.log(`Label: ${data.label}, Confidence: ${confidenceValue}`)
      if (confidenceValue < 70 && data.label !== "Track") {
          pausePrediction();
      }
      else {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trueClass,
          systemAnalysis,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.statusText}`);
      }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trueClass,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to call servo: ${response.statusText}`);
      }

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
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to notify backend.');
        }

        console.log('System stop notified successfully.');
      } catch (error) {
        console.error('Error stopping system:', error);
      }

      if (!paused) {
        setIsRunning(false);
      }
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>♻️ EcoSort | Smart Trash Classifier</h2>

      {!isRunning ? (
        <button onClick={() => handleStart(false)} style={styles.startButton}>▶ Start Classification</button>
        
      ) : (
        <div style={styles.resultSection}>
          <div style={styles.card}>
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured item"
                style={styles.image}
              />
            )}

            {itemNumber !== null ? (
              <>
                <p><strong>Prediction:</strong> {systemAnalysis}</p>
                <p><strong>Confidence:</strong> {confidence !== null ? `${confidence}%` : '—'}</p>
                {showSavedMessage && (
                  <p style={{ color: '#2e7d32', marginTop: '10px' }}>✔️ Saved!</p>
                )}
                {confidence !== null && confidence < 70 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ color: '#d32f2f' }}>
                      ⚠️ Low confidence. Please classify manually:
                    </p>
                    <select
                      value={trueClass}
                      onChange={(e) => setTrueClass(e.target.value)}
                      disabled={dropdownDisabled}
                      style={styles.dropdown}
                    >
                      <option value="">-- Select Type --</option>
                      <option value="Paper">Paper</option>
                      <option value="Plastic">Plastic</option>
                      <option value="Other">Other</option>
                      <option value="Track">None</option>
                    </select>
                    <button onClick={handleManualSave} style={styles.manualSaveButton}>
                      💾 Save Manual Class
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ marginTop: '10px', color: '#888' }}>⏳ Waiting for next prediction…</p>
            )}
          </div>

          <button onClick={() => handleStop(true, false)} style={styles.stopButton}>⏹ Stop & Save</button>
        </div>
      )}
      {blockMessageVisible && (
        <div style={styles.blockBanner}>
          ⚠️ Please stop the classification before navigating away.
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '40px 20px',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: 'Roboto, Arial, sans-serif',
    textAlign: 'center',
  },
  manualSaveButton: {
    marginTop: '15px',
    backgroundColor: '#0288d1',
    color: '#fff',
    padding: '10px 18px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
    transition: 'background-color 0.3s ease',
  },
  title: {
    fontSize: '28px',
    color: '#1976d2',
    marginBottom: '30px',
  },
  startButton: {
    backgroundColor: '#43a047',
    color: '#fff',
    padding: '15px 35px',
    fontSize: '18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  stopButton: {
    backgroundColor: '#e53935',
    color: '#fff',
    padding: '12px 30px',
    fontSize: '16px',
    borderRadius: '6px',
    border: 'none',
    marginTop: '20px',
    cursor: 'pointer',
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '25px',
  },
  blockBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ff9800',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,
    fontWeight: 'bold',
  },
  card: {
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'left',
  },
  image: {
    width: '100%',
    height: '160px',
    borderRadius: '6px',
    marginBottom: '15px',
    objectFit: 'cover',
  },
  dropdown: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    marginTop: '10px',
  },
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