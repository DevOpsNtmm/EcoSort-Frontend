import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EditResult.css';

const EditResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [trueClass, setTrueClass] = useState('');
  const [systemAnalysis, setSystemAnalysis] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch result:", error);
        setLoading(false);
      }
    };
  
    fetchSingleResult();
  }, [id]);
  

  // Save changes back to localStorage
  const handleSave = async () => {
    setSaving(true);
    try {
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
      if (systemAnalysis !== trueClass) {
        await fetch(`http://localhost:5050/dashboard/copy_uncertain/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueClass })
        });
      }
      localStorage.setItem('results', JSON.stringify(updated));
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading result...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>Result Not Found</h3>
        <p style={styles.errorText}>Unable to load the requested result.</p>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={styles.backButton}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.emoji}>✏️</span>
          <span style={styles.gradientText}>Edit Result</span>
        </h1>
        <p style={styles.subtitle}>Update classification details for {entry.image_name}</p>
      </div>

      {/* Main Content Card */}
              <div style={styles.mainCard} className="main-card">
        {/* Image Preview Section */}
        <div style={styles.imageSection} className="image-section">
          <h2 style={styles.sectionTitle}>Image Preview</h2>
          {entry.file_path && (
            <div style={styles.imageContainer}>
              <img
                src={`http://localhost:5050/images/${encodeURIComponent(entry.image_name)}`}
                alt={`Item ${entry.image_name}`}
                style={styles.imagePreview}
                className="image-preview"
              />
            </div>
          )}
        </div>

        {/* Form Section */}
        <div style={styles.formSection} className="form-section">
          <h2 style={styles.sectionTitle}>Classification Details</h2>
          
          <div style={styles.formGroup}>
            <label htmlFor="trueClass" style={styles.label}>
              True Classification
            </label>
            <select
              id="trueClass"
              value={trueClass}
              onChange={(e) => setTrueClass(e.target.value)}
              style={styles.select}
              className="form-select"
            >
              {trueClass === '-' && (
                <option value="-" disabled>-</option>
              )}
              <option value="Paper">Paper</option>
              <option value="Plastic">Plastic</option>
              <option value="Other">Other</option>
              <option value="Track">None</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="systemAnalysis" style={styles.label}>
              System Prediction
            </label>
            <div style={styles.readonlyInput}>
              <span style={styles.readonlyText}>{systemAnalysis}</span>
              <div style={styles.readonlyBadge}>System Generated</div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Confidence Level
            </label>
            <div style={styles.confidenceDisplay}>
              <div style={{
                ...styles.confidenceBar,
                width: `${Number(entry.confidence_percentage) || 0}%`,
                backgroundColor: (Number(entry.confidence_percentage) || 0) >= 70 ? '#10b981' : '#f59e0b'
              }}></div>
              <span style={styles.confidenceText}>
                {entry.confidence_percentage ? `${Number(entry.confidence_percentage).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionSection} className="action-section">
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.cancelButton}
            className="cancel-button"
          >
            ← Cancel
          </button>
          <button 
            onClick={handleSave} 
            style={styles.saveButton}
            className="save-button"
            disabled={saving}
          >
            {saving ? (
              <>
                <div style={styles.saveSpinner}></div>
                Saving...
              </>
            ) : (
              <>
                💾 Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '32px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  },
  emoji: {
    fontSize: '2.5rem',
    filter: 'none'
  },
  gradientText: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500'
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  },
  imageSection: {
    padding: '32px',
    borderBottom: '1px solid #f1f5f9'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  imageContainer: {
    textAlign: 'center'
  },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: '400px',
    height: 'auto',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease'
  },
  formSection: {
    padding: '32px'
  },
  formGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '1rem'
  },

  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  readonlyInput: {
    position: 'relative',
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  readonlyText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500'
  },
  readonlyBadge: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  confidenceDisplay: {
    position: 'relative',
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
  actionSection: {
    padding: '32px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  saveButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '140px',
    justifyContent: 'center'
  },
  saveSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc'
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px'
  },
  loadingText: {
    fontSize: '1.125rem',
    color: '#64748b',
    fontWeight: '500'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc'
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '24px'
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  errorText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0 0 24px 0'
  },
  backButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

export default EditResult;
