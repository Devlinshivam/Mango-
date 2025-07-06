import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

const formFields = [
  {
    label: "Project Description",
    name: "projectDescription",
    type: "textarea",
    placeholder: "Describe your project...",
  },
  {
    label: "Skills Required",
    name: "skills",
    type: "text",
    placeholder: "e.g., Web Development, React",
  },
  {
    label: "Budget ($)",
    name: "budget",
    type: "number",
    placeholder: "Enter your budget",
  },
  {
    label: "Duration",
    name: "duration",
    type: "text",
    placeholder: "e.g., 1 month",
  },
  {
    label: "Frameworks/Technologies",
    name: "frameworks",
    type: "text",
    placeholder: "e.g., React, Node.js",
  },
  {
    label: "Preferred Freelancer Location",
    name: "origin",
    type: "text",
    placeholder: "e.g., USA, Remote",
  },
];

const MatchFreelancer = () => {
  const [formData, setFormData] = useState({
    projectDescription: "",
    skills: "",
    budget: "",
    duration: "",
    frameworks: "",
    origin: "",
  });

    const navigate = useNavigate();

  const [mlResults, setMlResults] = useState([]);
  const [semanticResults, setSemanticResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("ml"); // 'ml' or 'semantic'

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/job-matching/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Something went wrong");

      const data = await response.json();
      console.log("Response databjkhebfisdbiisdb================:", data); // Debugging log
      setMlResults(data.recommendedFreelancers);
      setSemanticResults(data.semanticMatches);
      console.log("ML Results:", mlResults);
      console.log("Semantic Results:", semanticResults);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to fetch recommendations. Try again later.");
    } finally {
      setLoading(false);
    }
  };

   const handleClick = (username) => {
   console.log("clicked");  
   navigate(`/profile/${username}`); // Navigate to the profile with the username as the identifier
 };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        Find the Best Freelancers
      </h1>

      <form
        onSubmit={handleFormSubmit}
        className="space-y-4 bg-white shadow-md rounded p-6 border"
      >
        {formFields.map(({ label, name, type, placeholder }) => (
          <div key={name}>
            <label htmlFor={name} className="block font-semibold mb-1">
              {label}
            </label>
            {type === "textarea" ? (
              <textarea
                id={name}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder={placeholder}
                required
              />
            ) : (
              <input
                id={name}
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder={placeholder}
                required
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-teal-500 text-white py-2 rounded hover:bg-teal-600"
          disabled={loading}
        >
          {loading ? "Finding Freelancers..." : "Search Freelancers"}
        </button>
      </form>

      {error && <p className="text-red-600 text-center mt-4">{error}</p>}

      {(mlResults.length > 0 || semanticResults.length > 0) && (
        <div className="mt-8">
          <div className="flex justify-center mb-4">
            <button
              className={`px-4 py-2 border-b-2 ${
                tab === "ml" ? "border-teal-600 font-bold" : "text-gray-500"
              }`}
              onClick={() => setTab("ml")}
            >
              ML Recommendations
            </button>
            <button
              className={`px-4 py-2 border-b-2 ml-4 ${
                tab === "semantic"
                  ? "border-teal-600 font-bold"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("semantic")}
            >
              Semantic Matches
            </button>
          </div>

          <div className="container mx-auto ">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 justify-items-center">
              {(tab === "ml" ? mlResults : semanticResults).map(
                (freelancer, idx) => (
                  <div
                    key={freelancer.username + idx}
                    onClick={() => handleClick(freelancer.username)}
                    className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center w-72"
                  >
                    {/* Avatar */}
                    <img
                      src="/images/user.png"
                      alt="Avatar"
                      className="rounded-full w-24 h-24 object-cover mb-4"
                    />

                    {/* Separator */}
                    <hr className="w-1/2 border-gray-300 mb-4" />

                    {/* Username */}
                    <h3 className="text-xl font-semibold mb-1">
                      {freelancer.username}
                    </h3>

                    {/* Rating */}
                    <p className="text-gray-600 mb-1">
                      Rating:{" "}
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`${
                            i < Math.round(freelancer.rating)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </p>

                    {/* Email */}
                    <p className="text-gray-600 text-sm mb-2">
                      {freelancer.email}
                    </p>

                    {/* Score */}
                    <p className="text-teal-600 font-medium text-sm">
                      {tab === "ml"
                        ? `Recommendation: ${freelancer.recommendation_score}`
                        : `Semantic: ${freelancer.semantic_score}`}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchFreelancer;
