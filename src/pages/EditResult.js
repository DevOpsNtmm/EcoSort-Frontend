import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EditResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [trueClass, setTrueClass] = useState('');
  const [systemAnalysis, setSystemAnalysis] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log("Editing result with ID:", id);
    const fetchSingleResult = async () => {
      try {
        const response = await fetch(`http://localhost:5050/dashboard/results/${id}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        setEntry(data.sample);
        setTrueClass(data.sample?.image_class || "-");
        setSystemAnalysis(data.sample?.system_analysis || "-");
      } catch (error) {
        console.error("Failed to fetch result:", error);
      }
    };
  
    fetchSingleResult();
  }, [id]);
  

  // Save changes back to localStorage
  const handleSave = async () => {
    const storedResults = JSON.parse(localStorage.getItem('results') || '[]');
    const updated = storedResults.map((r) =>
      String(r.id) === id
        ? { ...r, trueClass, systemAnalysis, success }
        : r
    ); 
    const response = await fetch(`http://localhost:5050/dashboard/results/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trueClass, systemAnalysis, success }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    localStorage.setItem('results', JSON.stringify(updated));
    navigate('/dashboard');
  };

  if (!entry) return <p style={styles.loading}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>✏️ Edit Result: ID {entry.image_name}</h2>
      {entry.file_path && (
        <div style={styles.imageContainer}>
          <img
            src={`http://localhost:5050/images/${encodeURIComponent(entry.image_name)}`}
            alt={`Item ${entry.image_name}`}
            style={styles.imagePreview}
          />
        </div>
      )}
      <div style={styles.formGroup}>
        <label htmlFor="trueClass" style={styles.label}>True Class:</label>
        <select
          id="trueClass"
          value={trueClass}
          onChange={(e) => setTrueClass(e.target.value)}
          style={styles.select}
        >
          {trueClass === '-' && (
            <option value="-" disabled>-</option>
          )}
          <option value="Paper">Paper</option>
          <option value="Plastic">Plastic</option>
          <option value="Other">Other</option>
          <option value="None">None</option>
        </select>

      </div>

      <div style={styles.formGroup}>
        <label htmlFor="systemAnalysis" style={styles.label}>System Prediction:</label>
        <input
          readOnly
          id="systemAnalysis"
          type="text"
          value={systemAnalysis}
          onChange={(e) => setSystemAnalysis(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* ✅ Using <fieldset> and <legend> to avoid accessibility warning */}
      {/* <div style={styles.formGroup}>
        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend style={styles.label}>Status:</legend>
          <div style={styles.radioGroup}>
            <label htmlFor="success-yes">
              <input
                type="radio"
                id="success-yes"
                name="success"
                checked={success}
                onChange={() => setSuccess(true)}
              /> ✅ Success
            </label>
            &nbsp;&nbsp;
            <label htmlFor="success-no">
              <input
                type="radio"
                id="success-no"
                name="success"
                checked={!success}
                onChange={() => setSuccess(false)}
              /> ❌ Failure
            </label>
          </div>
        </fieldset>
      </div> */}

      <button onClick={handleSave} style={styles.saveButton}>💾 Save Changes</button>
    </div>
  );
};

// 💅 Styling
const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: '#f5f7fa',
    borderRadius: '10px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    fontFamily: 'Arial, sans-serif'
  },
  imageContainer: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  imagePreview: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },  
  title: {
    fontSize: '24px',
    color: '#1565c0',
    textAlign: 'center',
    marginBottom: '30px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    fontSize: '16px',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '15px'
  },
  loading: {
    textAlign: 'center',
    marginTop: '80px',
    fontSize: '18px'
  }
};

export default EditResult;
