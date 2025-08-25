import React, { useEffect, useState } from "react";
import { Pie, Bar, Line } from "react-chartjs-2";
import { CategoryScale, LinearScale, BarElement, Chart, ArcElement, Tooltip, Legend, LineElement, PointElement } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const classNames = ["paper", "plastic", "other"];

const classColors = {
  paper: "#4caf50",    // green
  plastic: "#2196f3",  // blue
  other: "#ff9800"     // orange
};

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5050/metrics/classification")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading metrics...</div>;
  if (!metrics) return <div>No metrics available.</div>;

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
        "Samples",
        "Correctly Classified (with feedback)",
        "Falsely Classified (with feedback)"
      ],
      datasets: [
        {
          label: "With Feedback",
          data: [withFeedback, null, null],
          backgroundColor: "#4caf50",
          stack: "Samples"
        },
        {
          label: "Without Feedback",
          data: [withoutFeedback, null, null],
          backgroundColor: "#d32f2f",
          stack: "Samples"
        },
        {
          label: "Correctly Classified (with feedback)",
          data: [null, correct, null],
          backgroundColor: "#2196f3",
          stack: "Other"
        },
        {
          label: "Falsely Classified (with feedback)",
          data: [null, null, incorrect],
          backgroundColor: "#ff9800",
          stack: "Other"
        }
      ]
    };
  }

function getInterventionOverTimeData(samples) {
  const interventions = samples.filter(s => Number(s.confidence_percentage) < 70 && s.timestamp);
  const countsByDate = {};
  interventions.forEach(s => {
    const date = new Date(s.timestamp).toISOString().slice(0, 10);
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });
  const labels = Object.keys(countsByDate).sort();
  const data = labels.map(date => countsByDate[date]);
  return {
    labels,
    datasets: [
      {
        label: "Manual Interventions",
        data,
        borderColor: "#d32f2f",
        backgroundColor: "#d32f2f33",
        fill: true,
        tension: 0.3
      }
    ]
  };
}

  return (
    <div style={{ padding: 32 }}>
      <h2>📊 Metrics & Statistics</h2>
      <ul>
        <li>Total Samples: {metrics.total_samples}</li>
        <li>Model Accuracy: {metrics.accuracy}%</li>
        <li>Retrain Count: {metrics.retrain_count}</li>
      </ul>

      {/* Bar Chart Section */}
      <div style={{ maxWidth: 600, margin: "40px auto" }}>
        <h3 style={{ textAlign: "center" }}>Prediction & Feedback Overview</h3>
        <Bar
          data={getStackedBarChartData(metrics)}
          options={{
            plugins: {
              legend: { display: true }
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true }
            }
          }}
        />
      </div>

      {/* Pie Charts Section */}
      <h3 style={{ textAlign: "center", marginTop: "40px" }}>Classifications</h3>
      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px", width: "100%" }}>
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
            colors = ["#4caf50", "#2196f3", "#ff9800"];
          } else if (cls === "plastic") {
            labels = ["Correct", "Wrong as Paper", "Wrong as Other"];
            values = [data.correct + data.confident, data.wrong_as_paper, data.wrong_as_other];
            colors = ["#2196f3", "#4caf50", "#ff9800"];
          } else {
            labels = ["Correct", "Wrong as Paper", "Wrong as Plastic"];
            values = [data.correct + data.confident, data.wrong_as_paper, data.wrong_as_plastic];
            colors = ["#ff9800", "#4caf50", "#2196f3"];
          }

          return (
            <div key={cls} style={{ width: 300, textAlign: "center" }}>
              <h3 style={{ textTransform: "capitalize", color: classColors[cls] }}>{cls}</h3>
              
              {hasData ? (
                <>
                  <Pie
                    data={{
                      labels,
                      datasets: [
                        {
                          data: values,
                          backgroundColor: colors,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { position: "bottom" },
                      },
                    }}
                  />
                  <div style={{ marginTop: 10 }}>
                    <div>
                      <strong>Accuracy:</strong> {accuracy}%
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  height: 200, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px",
                  border: "2px dashed #ccc"
                }}>
                  <div style={{ color: "#666", fontSize: "16px" }}>
                    No data
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {metrics.samples && (
        <div style={{ maxWidth: 400, margin: "40px auto" }}>
          <h3 style={{ textAlign: "center" }}>Manual Interventions Over Time</h3>
          <Line
            data={getInterventionOverTimeData(metrics.samples)}
            options={{
              plugins: { legend: { display: true } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Metrics;
