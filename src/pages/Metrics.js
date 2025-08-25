import React, { useEffect, useState } from "react";
import { Pie, Bar, Doughnut, Line } from "react-chartjs-2";
import "./Metrics.css";
import { 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Chart, 
  ArcElement, 
  Tooltip, 
  Legend, LineElement, PointElement,
  Title,
  Filler
} from "chart.js";

Chart.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title,
  Filler
, LineElement, PointElement);

const classNames = ["paper", "plastic", "other"];

const classColors = {
  paper: "#10b981",    // emerald-500
  plastic: "#3b82f6",  // blue-500
  other: "#f59e0b"     // amber-500
};

const classGradients = {
  paper: ["#10b981", "#059669", "#047857"],
  plastic: ["#3b82f6", "#2563eb", "#1d4ed8"],
  other: ["#f59e0b", "#d97706", "#b45309"]
};

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5050/metrics/classification")
      .then((res) => res.json())
      .then((data) => {
        console.log("metrics.samples", data.samples);
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading metrics...</p>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>No Metrics Available</h3>
        <p style={styles.errorText}>Unable to load classification metrics at this time.</p>
      </div>
    );
  }

function getStackedBarChartData(metrics) {
  const totalSamples = metrics.total_samples || 0;
  let withFeedback = 0;
  let correct = 0;
  let incorrect = 0;

  Object.entries(metrics.classification).forEach(([cls, data]) => {
    const classWithFeedback =
      data.correct +
      (data.wrong_as_paper || 0) +
      (data.wrong_as_plastic || 0) +
      (data.wrong_as_other || 0);
    withFeedback += classWithFeedback;
    correct += data.correct;
    incorrect +=
      (data.wrong_as_paper || 0) +
      (data.wrong_as_plastic || 0) +
      (data.wrong_as_other || 0);
  });

  const withoutFeedback = totalSamples - withFeedback;

  return {
    labels: [
      "Total Samples",
      "Correctly Classified",
      "Incorrectly Classified"
    ],
    datasets: [
      {
        label: "With Feedback",
        data: [withFeedback, 0, 0],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: "Without Feedback",
        data: [withoutFeedback, 0, 0],
        backgroundColor: "#d32f2f",
        stack: "Samples"
      },
      {
        label: "Correctly Classified",
        data: [0, correct, 0],
        backgroundColor: "#10b981",
        stack: "Classification"
      },
      {
        label: "Incorrectly Classified",
        data: [0, 0, incorrect],
        backgroundColor: "#f59e0b",
        stack: "Classification"
      }
    ]
  };
}

  const overallAccuracy = metrics.accuracy || 0;
  const accuracyColor = overallAccuracy >= 90 ? "#10b981" : 
                       overallAccuracy >= 70 ? "#f59e0b" : "#ef4444";
function getInterventionOverTimeData(samples) {
  const interventions = samples.filter(s => Number(s.confidence_percentage) < 70 && s.timestamp);
  const countsByDate = {};
  
  interventions.forEach(s => {
    const date = new Date(s.timestamp).toISOString().slice(0, 10);
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });
  
  const labels = Object.keys(countsByDate).sort();
  const data = labels.map(date => countsByDate[date]);
  
  // Format dates for better readability
  const formattedLabels = labels.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  });
  
  return {
    labels: formattedLabels,
    datasets: [
      {
        label: "Manual Interventions",
        data,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };
}

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.emoji}>📊</span>
          <span style={styles.gradientText}>Analytics Dashboard</span>
        </h1>
        <p style={styles.subtitle}>Comprehensive insights into your waste classification system</p>
      </div>

      {/* Key Metrics Cards */}
      <div style={styles.metricsGrid} className="metrics-grid">
        <div style={styles.metricCard} className="metric-card">
          <div style={styles.metricIcon}>📦</div>
          <div style={styles.metricContent}>
            <h3 style={styles.metricValue}>{metrics.total_samples}</h3>
            <p style={styles.metricLabel}>Total Samples</p>
          </div>
        </div>
        
        <div style={styles.metricCard} className="metric-card">
          <div style={styles.metricIcon}>🎯</div>
          <div style={styles.metricContent}>
            <h3 style={{...styles.metricValue, color: accuracyColor}}>{overallAccuracy}%</h3>
            <p style={styles.metricLabel}>Model Accuracy</p>
          </div>
        </div>
        
        <div style={styles.metricCard} className="metric-card">
          <div style={styles.metricIcon}>🔄</div>
          <div style={styles.metricContent}>
            <h3 style={styles.metricValue}>{metrics.retrain_count}</h3>
            <p style={styles.metricLabel}>Retrain Count</p>
          </div>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>Performance Overview</h2>
        <div style={styles.chartContainer} className="chart-container">
          <Bar
            data={getStackedBarChartData(metrics)}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  display: true,
                  position: 'top',
                  labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                      size: 14,
                      weight: '600'
                    }
                  }
                },
                title: {
                  display: false
                }
              },
              scales: {
                x: { 
                  stacked: false,
                  grid: {
                    display: false
                  },
                  ticks: {
                    font: {
                      size: 14,
                      weight: '600'
                    }
                  }
                },
                y: { 
                  stacked: false, 
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: false
                  },
                  ticks: {
                    font: {
                      size: 12
                    }
                  }
                }
              },
              elements: {
                bar: {
                  borderRadius: 8,
                }
              }
            }}
            height={400}
          />
        </div>
      </div>

      {/* Pie Charts Section */}
      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>Classification Breakdown</h2>
        <div style={styles.pieChartsGrid} className="pie-charts-grid">
          {classNames.map((cls) => {
            const data = metrics.classification[cls];

            // Calculate accuracy for this class
            const classTotal =
              (data.confident || 0) +
              (data.correct || 0) +
              (data.wrong_as_paper || 0) +
              (data.wrong_as_plastic || 0) +
              (data.wrong_as_other || 0);

            const accuracy =
              classTotal > 0
                ? (((data.correct + data.confident) / classTotal) * 100).toFixed(1)
                : "—";

            // Check if there's any data for this class
            const hasData = classTotal > 0;

            // Pie chart labels, values, colors
            let labels, values, colors;
            if (cls === "paper") {
              labels = ["Correct", "Wrong as Plastic", "Wrong as Other"];
              values = [data.correct + data.confident, data.wrong_as_plastic, data.wrong_as_other];
              colors = ["#10b981", "#3b82f6", "#f59e0b"];
            } else if (cls === "plastic") {
              labels = ["Correct", "Wrong as Paper", "Wrong as Other"];
              values = [data.correct + data.confident, data.wrong_as_paper, data.wrong_as_other];
              colors = ["#3b82f6", "#10b981", "#f59e0b"];
            } else {
              labels = ["Correct", "Wrong as Paper", "Wrong as Plastic"];
              values = [data.correct + data.confident, data.wrong_as_paper, data.wrong_as_plastic];
              colors = ["#f59e0b", "#10b981", "#3b82f6"];
            }

            return (
              <div key={cls} style={styles.pieChartCard} className="pie-chart-card">
                <div style={styles.pieChartHeader}>
                  <h3 style={{...styles.pieChartTitle, color: classColors[cls]}}>
                    {cls.charAt(0).toUpperCase() + cls.slice(1)}
                  </h3>
                  <div style={styles.accuracyBadge} className="accuracy-badge">
                    <span style={styles.accuracyValue}>{accuracy}%</span>
                    <span style={styles.accuracyLabel}>Accuracy</span>
                  </div>
                </div>
                
                {hasData ? (
                  <div style={styles.chartWrapper}>
                    <Doughnut
                      data={{
                        labels,
                        datasets: [
                          {
                            data: values,
                            backgroundColor: colors,
                            borderWidth: 3,
                            borderColor: '#ffffff',
                            hoverBorderWidth: 4,
                            hoverBorderColor: '#ffffff',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: "bottom",
                            labels: {
                              usePointStyle: true,
                              padding: 15,
                              font: {
                                size: 12,
                                weight: '500'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: true,
                            padding: 12
                          }
                        },
                        cutout: '60%',
                        elements: {
                          arc: {
                            borderRadius: 4
                          }
                        }
                      }}
                      height={250}
                    />
                  </div>
                ) : (
                  <div style={styles.noDataContainer}>
                    <div style={styles.noDataIcon}>📊</div>
                    <p style={styles.noDataText}>No data available</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Line Chart Section */}
      {metrics.samples && (
        <div style={styles.chartSection}>
          <h2 style={styles.sectionTitle}>Manual Interventions Over Time</h2>
          <div style={styles.chartContainer} className="chart-container line-chart-container">
            <Line
              data={getInterventionOverTimeData(metrics.samples)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 14,
                        weight: '600'
                      }
                    }
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  x: { 
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                      drawBorder: false
                    },
                    ticks: {
                      font: {
                        size: 12
                      }
                    }
                  },
                  y: { 
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                      drawBorder: false
                    },
                    ticks: {
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                elements: {
                  line: {
                    tension: 0.3
                  },
                  point: {
                    radius: 4,
                    hoverRadius: 6
                  }
                }
              }}
              height={400}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1400px',
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
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '48px'
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  metricIcon: {
    fontSize: '2.5rem',
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px'
  },
  metricContent: {
    flex: 1
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  chartSection: {
    marginBottom: '48px'
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    height: '500px'
  },
  pieChartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '32px'
  },
  pieChartCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },
  pieChartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  pieChartTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    margin: '0'
  },
  accuracyBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  accuracyValue: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  accuracyLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '500'
  },
  chartWrapper: {
    height: '300px',
    position: 'relative'
  },
  noDataContainer: {
    height: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px dashed #cbd5e1'
  },
  noDataIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.5'
  },
  noDataText: {
    color: '#64748b',
    fontSize: '1rem',
    fontWeight: '500',
    margin: '0'
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
    margin: '0'
  }
};

export default Metrics;
