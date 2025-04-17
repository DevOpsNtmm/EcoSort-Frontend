import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios'; // <-- Axios for HTTP requests

function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [itemNumber, setItemNumber] = useState(null);
  const [systemAnalysis, setSystemAnalysis] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [fileName, setFileName] = useState('');
  const [manualClass, setManualClass] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const intervalRef = useRef(null);

  const webcamRef = useRef(null);

  const handleStart = () => {
    if (!isRunning) {
      setIsRunning(true);
      setConfidence(null);
      setSystemAnalysis('');
      setManualClass('');
      setFileName('');
      setItemNumber(null);
      setCapturedImage(null);
  
      // Start interval to capture every 3 seconds
      intervalRef.current = setInterval(captureAndPredict, 3000);
    }
  };

  const captureAndPredict = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
  
    setCapturedImage(imageSrc);

    // Simulate a random prediction
    const classes = ['Paper', 'Plastic', 'Other'];
    const predictedClass = classes[Math.floor(Math.random() * classes.length)];
    const predictedConfidence = Math.floor(Math.random() * 100); // 0 to 99
  
    // const randomItem = Math.floor(Math.random() * 100000);
    const file = `Image${counter}.png`;
  
    setItemNumber(counter);
    incrementCounter();
    setSystemAnalysis(predictedClass);
    setConfidence(predictedConfidence);
    setFileName(file);
  
    if (predictedConfidence >= 50) {
      const newResult = {
        id: randomItem,
        fileName: file,
        systemAnalysis: predictedClass,
        imageClass: predictedClass,
        success: true,
        confidence: predictedConfidence,
        time: new Date().toLocaleString(),
        imageData: imageSrc,
      };
  
      const storedResults = JSON.parse(localStorage.getItem('results') || '[]');
      localStorage.setItem('results', JSON.stringify([...storedResults, newResult]));
    } else {
      // Pause treadmill (stop prediction cycle)
      clearInterval(intervalRef.current);
    }
  };
  
  const handleManualSave = () => {
    if (!manualClass) {
      alert('⚠️ Please select a classification before saving.');
      return;
    }
  
    const manualResult = {
      id: itemNumber,
      fileName: fileName,
      systemAnalysis: systemAnalysis,
      imageClass: manualClass,
      success: false,
      confidence: confidence,
      time: new Date().toLocaleString(),
      imageData: capturedImage,
    };
  
    const storedResults = JSON.parse(localStorage.getItem('results') || '[]');
    localStorage.setItem('results', JSON.stringify([...storedResults, manualResult]));
  
    // Reset manual input and resume classification
    setManualClass('');
    intervalRef.current = setInterval(captureAndPredict, 3000);
  };

  
  const handleStop = () => {
    if (isRunning) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
    }
  };
  

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>🚮 EcoSort | Smart Trash Classifier</h2>

      {!isRunning ? (
        <button onClick={handleStart} style={styles.startButton}>▶ Start Classification</button>
      ) : (
        <div style={styles.resultSection}>
          <div style={styles.card}>
            {/* Webcam view */}
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/png"
              videoConstraints={{
                width: 320,
                height: 160,
                facingMode: 'environment'
              }}
              style={styles.image}
            />

            {/* Display prediction once available */}
            {confidence !== null && (
              <>
                <p><strong>Item ID:</strong> {itemNumber}</p>
                <p><strong>File:</strong> {fileName}</p>
                <p><strong>Prediction:</strong> {systemAnalysis}</p>
                <p><strong>Confidence:</strong> {confidence}%</p>

                {confidence < 50 && (
                    <div style={{ marginTop: '10px' }}>
                        <p style={{ color: '#d32f2f' }}>
                            ⚠️ Low confidence. Please classify manually:
                        </p>
                        <select
                            value={manualClass}
                            onChange={(e) => setManualClass(e.target.value)}
                            style={styles.dropdown}
                        >
                            <option value="">-- Select Type --</option>
                            <option value="Paper">Paper</option>
                            <option value="Plastic">Plastic</option>
                            <option value="Other">Other</option>
                        </select>

                        <button
                            onClick={handleManualSave}
                            style={{ ...styles.stopButton, marginTop: '10px', backgroundColor: '#0288d1' }}
                        >
                            💾 Save & Continue
                        </button>
                    </div>
                )}
              </>
            )}
          </div>

          <button onClick={handleStop} style={styles.stopButton}>⏹ Stop & Save</button>
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
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    color: '#1976d2',
    marginBottom: '30px'
  },
  startButton: {
    backgroundColor: '#43a047',
    color: '#fff',
    padding: '15px 35px',
    fontSize: '18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  },
  stopButton: {
    backgroundColor: '#e53935',
    color: '#fff',
    padding: '12px 30px',
    fontSize: '16px',
    borderRadius: '6px',
    border: 'none',
    marginTop: '20px',
    cursor: 'pointer'
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '25px'
  },
  card: {
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'left'
  },
  image: {
    width: '100%',
    height: '160px',
    borderRadius: '6px',
    marginBottom: '15px',
    objectFit: 'cover'
  },
  dropdown: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    marginTop: '10px'
  }
};

export default Home;
