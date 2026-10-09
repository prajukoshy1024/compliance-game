/*const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const RESULTS_FILE = "./results.json";

function readResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, "[]");
  }

  return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Compliance Game API is running"
  });
});

app.post("/api/results", (req, res) => {
  const { playerName, score, riskLevel, answers } = req.body;

  if (!playerName || typeof score !== "number") {
    return res.status(400).json({
      error: "playerName and score are required"
    });
  }

  const results = readResults();

  const result = {
    id: Date.now(),
    playerName,
    score,
    riskLevel,
    answers,
    createdAt: new Date().toISOString()
  };

  results.push(result);

  fs.writeFileSync(
    RESULTS_FILE,
    JSON.stringify(results, null, 2)
  );

  res.json({
    success: true,
    result
  });
});

app.get("/api/results", (req, res) => {
  res.json(readResults());
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
--initial working Code */ 

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3001;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// GROQ CLIENT
// =====================================================

if (!process.env.GROQ_API_KEY) {
  console.error("ERROR: GROQ_API_KEY is not configured.");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});


// =====================================================
// FILE STORAGE
// =====================================================

const RESULTS_FILE = "./results.json";


// =====================================================
// COMPLIANCE TOPICS
// =====================================================

const TOPICS = [
  "Data privacy",
  "Cybersecurity",
  "Anti-bribery / anti-corruption",
  "Code of conduct",
  "Workplace harassment",
  "Information security",
  "Health & safety",
  "Financial compliance"
];


// =====================================================
// READ SAVED RESULTS
// =====================================================

function readResults() {

  if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(
      RESULTS_FILE,
      "[]"
    );
  }

  try {

    return JSON.parse(
      fs.readFileSync(
        RESULTS_FILE,
        "utf8"
      )
    );

  } catch (error) {

    console.error(
      "Could not read results.json:",
      error
    );

    return [];
  }
}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {

  res.json({
    status: "ok",
    message: "Compliance Game API is running",
    aiProvider: "Groq"
  });

});


// =====================================================
// AI QUESTION GENERATION
// =====================================================

app.post("/api/questions", async (req, res) => {

  try {

    // -------------------------------------------------
    // CHECK GROQ API KEY
    // -------------------------------------------------

    if (!process.env.GROQ_API_KEY) {

      return res.status(500).json({
        success: false,
        error:
          "GROQ_API_KEY is not configured in the backend .env file."
      });

    }


    // -------------------------------------------------
    // GET REQUEST DATA
    // -------------------------------------------------

    const {
      topics = TOPICS,
      numberOfQuestions = 5
    } = req.body;


    // -------------------------------------------------
    // VALIDATE NUMBER OF QUESTIONS
    // -------------------------------------------------

    const questionCount =
      Math.min(
        Math.max(
          Number(numberOfQuestions) || 5,
          1
        ),
        10
      );


    // -------------------------------------------------
    // VALIDATE TOPICS
    // -------------------------------------------------

    const validTopics =
      Array.isArray(topics)
        ? topics.filter((topic) =>
            TOPICS.includes(topic)
          )
        : TOPICS;


    if (validTopics.length === 0) {

      return res.status(400).json({
        success: false,
        error:
          "At least one valid compliance topic is required."
      });

    }


    // -------------------------------------------------
    // PROMPT
    // -------------------------------------------------

    const prompt = `
You are an expert corporate compliance training designer.

Generate exactly ${questionCount} realistic workplace compliance scenarios.

Use ONLY these topics:

${validTopics.join(", ")}

The questions are for an interactive employee compliance game.

Requirements:

1. Each question must describe a realistic workplace situation.
2. Questions should test decision-making rather than memorization.
3. Each question must have exactly 4 answer choices.
4. Exactly ONE answer should be the best compliance decision.
5. The other three answers should be plausible but less appropriate.
6. Each answer must contain:
   - text
   - points
   - feedback
7. The best answer must receive 100 points.
8. Other answers should receive 0, 20, or 40 points.
9. Feedback should briefly explain why the choice is appropriate or risky.
10. Avoid asking for confidential company information.
11. Do not invent specific laws, company policies, penalties, or regulations.
12. Use general corporate compliance principles.
13. Make every scenario different.
14. Use professional but easy-to-understand language.
15. Questions should be suitable for employees and students.
16. Return ONLY valid JSON.
17. The "topic" must be one of the supplied topics.
18. The "time" should be a realistic time such as "9:15 AM".
19. Do not include markdown.
20. Do not include explanations outside the JSON.

Required JSON format:

{
  "questions": [
    {
      "id": 1,
      "topic": "Cybersecurity",
      "title": "Short scenario title",
      "time": "9:15 AM",
      "description": "Workplace scenario description",
      "choices": [
        {
          "text": "Answer option",
          "points": 0,
          "feedback": "Explanation"
        },
        {
          "text": "Answer option",
          "points": 20,
          "feedback": "Explanation"
        },
        {
          "text": "Best answer",
          "points": 100,
          "feedback": "Explanation"
        },
        {
          "text": "Answer option",
          "points": 40,
          "feedback": "Explanation"
        }
      ]
    }
  ]
}
`;


    // =================================================
    // CALL GROQ
    // =================================================

    console.log(
      `Generating ${questionCount} questions using Groq...`
    );

    const response =
      await groq.chat.completions.create({

        model: "openai/gpt-oss-120b",

        messages: [

          {
            role: "system",
            content:
              "You are an expert corporate compliance training designer. Return only valid JSON when JSON is requested."
          },

          {
            role: "user",
            content: prompt
          }

        ],

        temperature: 0.7,

        response_format: {
          type: "json_object"
        }

      });


    // =================================================
    // GET GROQ RESPONSE
    // =================================================

    const text =
      response.choices?.[0]?.message?.content;


    if (!text) {

      throw new Error(
        "Groq returned an empty response."
      );

    }


    console.log(
      "Groq response received successfully."
    );


    // =================================================
    // PARSE JSON
    // =================================================

    let data;

    try {

      data = JSON.parse(
        text.trim()
      );

    } catch (parseError) {

      console.error(
        "Invalid JSON returned by Groq:"
      );

      console.error(text);

      throw new Error(
        "Groq returned invalid JSON."
      );

    }


    // =================================================
    // VALIDATE QUESTIONS
    // =================================================

    if (
      !data.questions ||
      !Array.isArray(data.questions) ||
      data.questions.length === 0
    ) {

      throw new Error(
        "Groq returned no questions."
      );

    }


    // =================================================
    // VALIDATE EACH QUESTION
    // =================================================

    const questions =
      data.questions.map(
        (question, index) => {

          if (
            !question.topic ||
            !question.title ||
            !question.description ||
            !Array.isArray(
              question.choices
            ) ||
            question.choices.length !== 4
          ) {

            throw new Error(
              `Invalid question at index ${index}`
            );

          }


          // Validate topic

          if (
            !validTopics.includes(
              question.topic
            )
          ) {

            throw new Error(
              `Invalid topic at question ${index}`
            );

          }


          // Validate choices

          question.choices.forEach(
            (choice, choiceIndex) => {

              if (
                !choice.text ||
                typeof choice.points !== "number" ||
                !choice.feedback
              ) {

                throw new Error(
                  `Invalid answer choice ${choiceIndex} in question ${index}`
                );

              }

            }
          );


          return {

            ...question,

            // Always create our own ID
            id: index + 1

          };

        }
      );


    // =================================================
    // SEND QUESTIONS TO FRONTEND
    // =================================================

    res.json({

      success: true,

      questions

    });

  }

  catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "GROQ QUESTION GENERATION ERROR"
    );

    console.error(
      "================================="
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Status:",
      error.status
    );

    console.error(
      "Code:",
      error.code
    );

    console.error(
      "Type:",
      error.type
    );


    res.status(500).json({

      success: false,

      error:
        error.message ||
        "Could not generate compliance questions."

    });

  }

});


// =====================================================
// SAVE RESULT
// =====================================================

app.post("/api/results", (req, res) => {

  try {

    const {
      playerName,
      score,
      riskLevel,
      answers
    } = req.body;


    if (
      !playerName ||
      typeof score !== "number"
    ) {

      return res.status(400).json({

        success: false,

        error:
          "playerName and score are required"

      });

    }


    const results =
      readResults();


    const result = {

      id: Date.now(),

      playerName,

      score,

      riskLevel,

      answers: Array.isArray(answers)
        ? answers
        : [],

      createdAt:
        new Date().toISOString()

    };


    results.push(result);


    fs.writeFileSync(

      RESULTS_FILE,

      JSON.stringify(
        results,
        null,
        2
      )

    );


    res.json({

      success: true,

      result

    });

  }

  catch (error) {

    console.error(
      "Save result error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Could not save result."

    });

  }

});


// =====================================================
// GET RESULTS
// =====================================================

app.get("/api/results", (req, res) => {

  try {

    res.json(
      readResults()
    );

  }

  catch (error) {

    res.status(500).json({

      success: false,

      error:
        "Could not read results."

    });

  }

});


// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Compliance Game Backend"
    );

    console.log(
      "================================="
    );

    console.log(
      `Backend running on http://localhost:${PORT}`
    );

    console.log(
      "AI Provider: Groq"
    );

    console.log(
      "================================="
    );

  }
);
