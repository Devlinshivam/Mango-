const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/job-matching", async (req, res) => {
  const { projectDescription, skills, budget, duration, frameworks, origin } = req.body;
  

  try {
    if (!projectDescription || !skills || !budget || !duration || !frameworks || !origin) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔁 Send data to Python Flask API
    const pythonResponse = await axios.post("http://127.0.0.1:5000/recommend", {
      description: projectDescription,
      skills,
      cost: budget,
      duration,
      frameworks,
      origin
    });
    console.log("Python response:", pythonResponse.data);
    // 🔽 Forward response from Flask to your frontend
    return res.json({
      recommendedFreelancers: pythonResponse.data.xbg_top || [], // XGBoost recommendations
      semanticMatches: pythonResponse.data.semantic_top || [] // if available
    });
    
  } catch (error) {
    console.error("Error in job-matching endpoint:", error.message || error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
