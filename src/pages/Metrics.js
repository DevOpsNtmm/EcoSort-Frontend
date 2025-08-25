import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import { Pie, Bar } from "react-chartjs-2";
=======
import { Pie,Bar } from "react-chartjs-2";
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266
import { CategoryScale, LinearScale, BarElement, Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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

<<<<<<< HEAD
  function getStackedBarChartData(metrics) {
    const totalSamples = metrics.total_samples || 0;
    let withFeedback = 0;
    let correct = 0;
    let incorrect = 0;

    Object.entries(metrics.classification).forEach(([cls, data]) => {
      const classTotal =
        data.correct +
        (data.wrong_as_paper || 0) +
        (data.wrong_as_plastic || 0) +
        (data.wrong_as_other || 0);
      withFeedback += classTotal;
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
=======
function getStackedBarChartData(metrics) {
  const totalSamples = metrics.total_samples || 0;
  let withFeedback = 0;
  let correct = 0;
  let incorrect = 0;

  Object.entries(metrics.classification).forEach(([cls, data]) => {
    const classTotal =
      data.correct +
      (data.wrong_as_paper || 0) +
      (data.wrong_as_plastic || 0) +
      (data.wrong_as_other || 0);
    withFeedback += classTotal;
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
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266

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

<<<<<<< HEAD
      {/* Pie Charts Section */}
      <h3 style={{ textAlign: "center", marginTop: "40px" }}>Classifications</h3>
      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px", width: "100%" }}>
        {classNames.map((cls) => {
          const data = metrics.classification[cls];

          // Calculate accuracy for this class
          const totalWithFeedback =
            (data.correct || 0) +
            (data.wrong_as_paper || 0) +
            (data.wrong_as_plastic || 0) +
            (data.wrong_as_other || 0);

          const accuracy =
            totalWithFeedback > 0
              ? ((data.correct / totalWithFeedback) * 100).toFixed(1)
              : "—";

          // Pie chart labels, values, colors
=======
    {/* Pie Charts Section */}
      <h3 style={{ textAlign: "center" }}> Classifications </h3>
      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px", width: "100%" }}>
        {classNames.map((cls) => {
          const data = metrics.classification[cls];
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266
          let labels, values, colors;
          if (cls === "paper") {
            labels = ["Correct (Paper)", "Wrong as Plastic", "Wrong as Other"];
            values = [data.correct, data.wrong_as_plastic, data.wrong_as_other];
            colors = ["#4caf50", "#2196f3", "#ff9800"];
          } else if (cls === "plastic") {
            labels = ["Correct (Plastic)", "Wrong as Paper", "Wrong as Other"];
            values = [data.correct, data.wrong_as_paper, data.wrong_as_other];
            colors = ["#2196f3", "#4caf50", "#ff9800"];
          } else {
            labels = ["Correct (Other)", "Wrong as Paper", "Wrong as Plastic"];
            values = [data.correct, data.wrong_as_paper, data.wrong_as_plastic];
            colors = ["#ff9800", "#4caf50", "#2196f3"];
          }
<<<<<<< HEAD

          return (
            <div key={cls} style={{ width: 300, textAlign: "center" }}>
              <h3 style={{ textTransform: "capitalize", color: classColors[cls] }}>{cls}</h3>
=======
          return (
            <div key={cls} style={{ width: 300 }}>
              <h3 style={{ textTransform: "capitalize", textAlign: "center", color: classColors[cls]}}>{cls}</h3>
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266
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
<<<<<<< HEAD
              <div style={{ marginTop: 10 }}>
                <div>
                  <strong>Accuracy:</strong> {accuracy}%
                </div>
              </div>
=======
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266
            </div>
          );
        })}
      </div>
    </div>
  );
<<<<<<< HEAD
};
=======
};

export default Metrics;
>>>>>>> 46f745bf09c7fdc7ba35b832b9e1a79b848c7266
