
import { useEffect, useRef, useState } from "react";
import "./App.css";

// =====================================================
// BACKEND URL
// =====================================================

const API_URL = "http://localhost:3001";

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
  "Financial compliance"
];

// =====================================================
// GAME CONSTANTS
// =====================================================

const BIRD_RADIUS = 24;

const SLINGSHOT = {
  x: 115,
  y: 450
};

const MAX_DRAG = 150;

const FLIGHT_DURATION = 700;

const AUTO_NEXT_DELAY = 7000;

// =====================================================
// RISK CALCULATION
// =====================================================

function getRiskLevel(score, totalQuestions) {
  const maxScore = totalQuestions * 100;

  const percentage =
    maxScore > 0
      ? (score / maxScore) * 100
      : 0;

  if (percentage >= 80) {
    return "LOW";
  }

  if (percentage >= 50) {
    return "MEDIUM";
  }

  return "HIGH";
}

// =====================================================
// ANSWER WEIGHT + TOPIC ANALYTICS
// =====================================================

const DEFAULT_WEIGHTS = [100, 75, 40, 10];

function normalizeChoices(choices = []) {
  return choices.slice(0, 4).map((choice, index) => {
    const rawWeight =
      choice.weight ??
      choice.points ??
      DEFAULT_WEIGHTS[index];

    const weight = Math.max(
      0,
      Math.min(100, Number(rawWeight) || 0)
    );

    let isCorrect;

    if (
      typeof choice.isCorrect === "boolean"
    ) {
      isCorrect = choice.isCorrect;
    } else if (
      typeof choice.correct === "boolean"
    ) {
      isCorrect = choice.correct;
    } else if (
      typeof choice.is_correct === "boolean"
    ) {
      isCorrect = choice.is_correct;
    } else {
      isCorrect = weight === 100;
    }

    return {
      ...choice,
      weight,
      points: weight,
      isCorrect,
      feedback:
        choice.feedback ||
        `This decision carries a ${weight}% compliance impact.`
    };
  });
}

// =====================================================
// FIND ACTUAL CORRECT ANSWER
// =====================================================

function getCorrectChoiceIndex(choices = []) {
  if (!choices.length) {
    return -1;
  }

  const explicitCorrectIndex =
    choices.findIndex(
      (choice) =>
        choice.isCorrect === true
    );

  if (explicitCorrectIndex !== -1) {
    return explicitCorrectIndex;
  }

  const perfectIndex =
    choices.findIndex(
      (choice) =>
        Number(choice.weight) === 100
    );

  if (perfectIndex !== -1) {
    return perfectIndex;
  }

  let bestIndex = 0;

  choices.forEach(
    (choice, index) => {
      if (
        Number(choice.weight) >
        Number(
          choices[bestIndex].weight
        )
      ) {
        bestIndex = index;
      }
    }
  );

  return bestIndex;
}

// =====================================================
// TOPIC ANALYTICS
// =====================================================

function getTopicStrength(answers, scenarios) {
  const topicMap = {};

  scenarios.forEach((scenario) => {
    if (!scenario?.topic) return;

    if (!topicMap[scenario.topic]) {
      topicMap[scenario.topic] = {
        total: 0,
        count: 0
      };
    }
  });

  answers.forEach((answer) => {
    if (!topicMap[answer.topic]) {
      topicMap[answer.topic] = {
        total: 0,
        count: 0
      };
    }

    topicMap[answer.topic].total +=
      Number(
        answer.weight ??
        answer.points ??
        0
      );

    topicMap[answer.topic].count += 1;
  });

  return TOPICS.map((topic) => {
    const item = topicMap[topic];

    if (!item || item.count === 0) {
      return {
        topic,
        percentage: null,
        assessed: false
      };
    }

    return {
      topic,

      percentage: Math.round(
        item.total /
          item.count
      ),

      assessed: true
    };
  });
}

// =====================================================
// ORIGINAL BIRD
// =====================================================

function ComplianceBird({
  x,
  y,
  rotation = 0,
  flying = false,
  injured = false
}) {
  return (
    <div
      className={`bird ${
        flying
          ? "bird-flying"
          : ""
      } ${
        injured
          ? "bird-injured"
          : ""
      }`}
      style={{
        left: x,
        top: y,

        transform:
          `translate(-50%, -50%) rotate(${rotation}deg)`
      }}
    >
      <div className="bird-body">

        <div className="bird-wing" />

        <div className="bird-eye left-eye" />

        <div className="bird-eye right-eye" />

        <div className="bird-beak" />

        <div className="bird-brow left-brow" />

        <div className="bird-brow right-brow" />

      </div>

      <div className="bird-tail tail-one" />

      <div className="bird-tail tail-two" />

      {injured && (
        <>
          <div className="injury-star injury-star-one">
            ✦
          </div>

          <div className="injury-star injury-star-two">
            ✕
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// TARGET
// =====================================================

function AnswerTarget({
  choice,
  index,
  selected,
  result,
  onClick
}) {
  const isSelected =
    selected === index;

  let stateClass = "";

  if (result) {
    if (isSelected) {
      if (result.correct) {
        if (result.weight >= 100) {
          stateClass =
            "target-crumble";
        } else {
          stateClass =
            "target-cracked";
        }
      } else {
        stateClass =
          "target-intact";
      }
    }

    if (
      !result.correct &&
      result.correctIndex === index
    ) {
      stateClass =
        "target-answer";
    }
  }

  return (
    <button
      className={`answer-target ${stateClass}`}

      onClick={() =>
        onClick(index)
      }

      disabled={
        Boolean(result)
      }

      aria-label={`Answer ${String.fromCharCode(
        65 + index
      )}: ${choice.text}`}
    >
      <div className="target-roof" />

      <div className="target-card">

        <div className="target-letter">
          {String.fromCharCode(
            65 + index
          )}
        </div>

        <div className="target-text">

          <span className="target-answer-text">
            {choice.text}
          </span>

        </div>

        {isSelected &&
          result &&
          result.correct &&
          result.weight < 100 && (

            <div className="target-cracks">

              <span className="crack crack-one" />

              <span className="crack crack-two" />

              <span className="crack crack-three" />

              <span className="crack crack-four" />

            </div>

          )}

        {isSelected &&
          result &&
          result.correct &&
          result.weight >= 100 && (

            <div className="crumble-particles">

              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />

            </div>

          )}

      </div>

      <div className="target-foundation" />

      {result &&
        isSelected &&
        result.correct &&
        result.weight < 100 && (

          <div className="target-stamp">
            ✓
          </div>

        )}

      {result &&
        isSelected &&
        !result.correct && (

          <div className="target-stamp wrong">
            ×
          </div>

        )}

    </button>
  );
}

// =====================================================
// APP
// =====================================================

function App() {

  // ===================================================
  // PLAYER
  // ===================================================

  const [playerName, setPlayerName] =
    useState("");

  // ===================================================
  // GAME STATE
  // ===================================================

  const [started, setStarted] =
    useState(false);

  const [finished, setFinished] =
    useState(false);

  // ===================================================
  // AI SCENARIOS
  // ===================================================

  const [scenarios, setScenarios] =
    useState([]);

  const [current, setCurrent] =
    useState(0);

  // ===================================================
  // SCORE
  // ===================================================

  const [score, setScore] =
    useState(0);

  // ===================================================
  // ANSWERS
  // ===================================================

  const [selected, setSelected] =
    useState(null);

  const [answers, setAnswers] =
    useState([]);

  // ===================================================
  // RESULT
  // ===================================================

  const [result, setResult] =
    useState(null);

  // ===================================================
  // LOADING
  // ===================================================

  const [loadingQuestions, setLoadingQuestions] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // ===================================================
  // AI INSIGHT
  // ===================================================

  const [aiInsight, setAiInsight] =
    useState(null);

  const [loadingInsight, setLoadingInsight] =
    useState(false);

  // ===================================================
  // SUCCESS POPUP
  // ===================================================

  const [showSuccessPopup, setShowSuccessPopup] =
    useState(false);

  // ===================================================
  // SLINGSHOT STATE
  // ===================================================

  const [birdPosition, setBirdPosition] =
    useState({
      x: SLINGSHOT.x,
      y: SLINGSHOT.y
    });

  const [dragging, setDragging] =
    useState(false);

  const [trajectory, setTrajectory] =
    useState([]);

  const [flying, setFlying] =
    useState(false);

  const [flightPosition, setFlightPosition] =
    useState(null);

  const [selectedTarget, setSelectedTarget] =
    useState(null);

  // ===================================================
  // INJURED BIRD
  // ===================================================

  const [injuredBird, setInjuredBird] =
    useState(false);

  // ===================================================
  // REFS
  // ===================================================

  const gameAreaRef =
    useRef(null);

  const animationRef =
    useRef(null);

  // ===================================================
  // CURRENT SCENARIO
  // ===================================================

  const scenario =
    scenarios[current];

  // ===================================================
  // TARGET POSITIONS
  // ===================================================

  function getTargetPositions() {
    const width =
      gameAreaRef.current?.clientWidth ||
      1200;

    const height =
      gameAreaRef.current?.clientHeight ||
      610;

    let targetWidth =
      Math.min(
        560,
        Math.max(
          300,
          width * 0.55
        )
      );

    if (width < 700) {
      targetWidth =
        Math.max(
          240,
          width - 120
        );
    }

    const left =
      Math.max(
        190,
        width -
          targetWidth -
          45
      );

    const targetHeight = 100;

    const topMargin = 45;

    const bottomMargin = 75;

    const usableHeight =
      Math.max(
        300,
        height -
          topMargin -
          bottomMargin -
          targetHeight
      );

    const verticalGap =
      usableHeight / 3;

    return [0, 1, 2, 3].map(
      (index) => ({
        x:
          left +
          targetWidth / 2,

        y:
          topMargin +
          targetHeight / 2 +
          index *
            verticalGap,

        width:
          targetWidth,

        height:
          targetHeight
      })
    );
  }

  // ===================================================
  // RESET BIRD
  // ===================================================

  function resetBird() {
    setBirdPosition({
      x: SLINGSHOT.x,
      y: SLINGSHOT.y
    });

    setTrajectory([]);

    setDragging(false);

    setFlying(false);

    setFlightPosition(null);

    setSelectedTarget(null);

    setInjuredBird(false);
  }

  // ===================================================
  // START GAME
  // ===================================================

  async function startGame(e) {
    e.preventDefault();

    if (!playerName.trim()) {
      alert(
        "Please enter your name."
      );

      return;
    }

    setLoadingQuestions(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/questions`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              topics: TOPICS,

              numberOfQuestions: 10
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Failed to generate questions."
        );
      }

      if (
        !data.questions ||
        !Array.isArray(
          data.questions
        ) ||
        data.questions.length === 0
      ) {
        throw new Error(
          "AI returned no questions."
        );
      }

      const normalizedQuestions =
        data.questions.map(
          (
            question,
            questionIndex
          ) => {

            const normalizedChoices =
              normalizeChoices(
                question.choices
              );

            const correctIndex =
              getCorrectChoiceIndex(
                normalizedChoices
              );

            if (
              correctIndex === -1
            ) {
              console.warn(
                `Question ${
                  questionIndex + 1
                } has no valid correct answer.`,
                question
              );
            }

            return {
              ...question,

              choices:
                normalizedChoices
            };
          }
        );

      setScenarios(
        normalizedQuestions
      );

      setCurrent(0);

      setScore(0);

      setAnswers([]);

      setSelected(null);

      setResult(null);

      setFinished(false);

      setAiInsight(null);

      setShowSuccessPopup(false);

      setStarted(true);

      setTimeout(
        resetBird,
        50
      );

    } catch (error) {

      console.error(
        "Question generation error:",
        error
      );

      alert(
        "Could not generate the compliance questions.\n\n" +
        "Please make sure:\n" +
        "1. The backend server is running.\n" +
        "2. Your Groq API key is configured in the backend .env file.\n" +
        "3. The /api/questions endpoint is available."
      );

    } finally {
      setLoadingQuestions(false);
    }
  }

  // ===================================================
  // GET POINTER POSITION
  // ===================================================

  function getPointerPosition(e) {

    if (!gameAreaRef.current) {
      return {
        x: SLINGSHOT.x,
        y: SLINGSHOT.y
      };
    }

    const rect =
      gameAreaRef.current.getBoundingClientRect();

    return {
      x:
        e.clientX -
        rect.left,

      y:
        e.clientY -
        rect.top
    };
  }

  // ===================================================
  // CALCULATE DRAG POSITION
  // ===================================================

  function calculateBirdPosition(
    pointer
  ) {

    const dx =
      pointer.x -
      SLINGSHOT.x;

    const dy =
      pointer.y -
      SLINGSHOT.y;

    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    if (
      distance <= MAX_DRAG
    ) {
      return pointer;
    }

    const ratio =
      MAX_DRAG /
      distance;

    return {
      x:
        SLINGSHOT.x +
        dx * ratio,

      y:
        SLINGSHOT.y +
        dy * ratio
    };
  }

  // ===================================================
  // FIND TARGET
  // ===================================================

  function findTargetFromPath(
    startPosition
  ) {

    const targets =
      getTargetPositions();

    const dragX =
      startPosition.x -
      SLINGSHOT.x;

    const dragY =
      startPosition.y -
      SLINGSHOT.y;

    const dragDistance =
      Math.sqrt(
        dragX * dragX +
        dragY * dragY
      );

    if (
      dragDistance < 1
    ) {
      return 0;
    }

    const launchX =
      -dragX /
      dragDistance;

    const launchY =
      -dragY /
      dragDistance;

    let bestTarget = 0;

    let bestAngle =
      Infinity;

    targets.forEach(
      (target, index) => {

        const targetX =
          target.x -
          SLINGSHOT.x;

        const targetY =
          target.y -
          SLINGSHOT.y;

        const targetDistance =
          Math.sqrt(
            targetX * targetX +
            targetY * targetY
          );

        if (
          targetDistance < 1
        ) {
          return;
        }

        const normalizedTargetX =
          targetX /
          targetDistance;

        const normalizedTargetY =
          targetY /
          targetDistance;

        const dot =
          launchX *
            normalizedTargetX +
          launchY *
            normalizedTargetY;

        const safeDot =
          Math.max(
            -1,
            Math.min(
              1,
              dot
            )
          );

        const angle =
          Math.acos(
            safeDot
          );

        if (
          angle < bestAngle
        ) {
          bestAngle =
            angle;

          bestTarget =
            index;
        }

      }
    );

    return bestTarget;
  }

  // ===================================================
  // CREATE TRAJECTORY
  // ===================================================

  function createTrajectory(
    position
  ) {

    const targets =
      getTargetPositions();

    const targetIndex =
      findTargetFromPath(
        position
      );

    const target =
      targets[targetIndex];

    if (!target) {
      setTrajectory([]);
      return;
    }

    setSelectedTarget(
      targetIndex
    );

    const points = [];

    const DOT_COUNT = 16;

    for (
      let i = 1;
      i <= DOT_COUNT;
      i++
    ) {

      const progress =
        i / DOT_COUNT;

      points.push({
        x:
          position.x +
          (target.x -
            position.x) *
            progress,

        y:
          position.y +
          (target.y -
            position.y) *
            progress
      });

    }

    setTrajectory(points);
  }

  // ===================================================
  // POINTER DOWN
  // ===================================================

  function handlePointerDown(e) {

    if (
      selected !== null ||
      flying ||
      result
    ) {
      return;
    }

    e.currentTarget.setPointerCapture(
      e.pointerId
    );

    setDragging(true);
  }

  // ===================================================
  // POINTER MOVE
  // ===================================================

  function handlePointerMove(e) {

    if (!dragging) {
      return;
    }

    const pointer =
      getPointerPosition(e);

    const position =
      calculateBirdPosition(
        pointer
      );

    setBirdPosition(
      position
    );

    createTrajectory(
      position
    );
  }

  // ===================================================
  // POINTER UP
  // ===================================================

  function handlePointerUp(e) {

    if (!dragging) {
      return;
    }

    setDragging(false);

    const pointer =
      getPointerPosition(e);

    const position =
      calculateBirdPosition(
        pointer
      );

    setBirdPosition(
      position
    );

    const dx =
      SLINGSHOT.x -
      position.x;

    const dy =
      SLINGSHOT.y -
      position.y;

    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    if (
      distance < 12
    ) {
      resetBird();
      return;
    }

    launchBird(
      position
    );
  }

  // ===================================================
  // LAUNCH BIRD
  // ===================================================

  function launchBird(
    startPosition,
    forcedTarget = null
  ) {

    if (
      flying ||
      selected !== null
    ) {
      return;
    }

    const targetIndex =
      forcedTarget !== null
        ? forcedTarget
        : findTargetFromPath(
            startPosition
          );

    const targets =
      getTargetPositions();

    const target =
      targets[targetIndex];

    if (!target) {
      return;
    }

    setSelectedTarget(
      targetIndex
    );

    setFlying(true);

    setTrajectory([]);

    setInjuredBird(false);

    const startTime =
      performance.now();

    function animate(
      timestamp
    ) {

      const elapsed =
        timestamp -
        startTime;

      const progress =
        Math.min(
          elapsed /
            FLIGHT_DURATION,
          1
        );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const x =
        startPosition.x +
        (target.x -
          startPosition.x) *
          eased;

      const y =
        startPosition.y +
        (target.y -
          startPosition.y) *
          eased;

      setFlightPosition({
        x,
        y
      });

      if (
        progress < 1
      ) {

        animationRef.current =
          requestAnimationFrame(
            animate
          );

      } else {

        setFlightPosition({
          x: target.x,
          y: target.y
        });

        handleAnswer(
          targetIndex
        );
      }
    }

    animationRef.current =
      requestAnimationFrame(
        animate
      );
  }

  // ===================================================
  // ANSWER
  // ===================================================

  function handleAnswer(
    index
  ) {

    if (
      selected !== null ||
      !scenario
    ) {
      return;
    }

    const choice =
      scenario.choices[index];

    if (!choice) {
      return;
    }

    const correctIndex =
      getCorrectChoiceIndex(
        scenario.choices
      );

    const isCorrect =
      index === correctIndex;

    setSelected(index);

    const answerResult = {

      correct:
        isCorrect,

      correctIndex,

      selectedIndex:
        index,

      points:
        Number(
          choice.points || 0
        ),

      weight:
        Number(
          choice.weight || 0
        ),

      consequence:
        choice.feedback ||
        "Consider the compliance impact of this decision."
    };

    if (!isCorrect) {

      setTimeout(() => {
        setInjuredBird(true);
      }, 50);

    }

    setResult(
      answerResult
    );

    setScore(
      (oldScore) =>
        oldScore +
        Number(
          choice.points || 0
        )
    );

    setAnswers(
      (oldAnswers) => [

        ...oldAnswers,

        {
          scenarioId:
            scenario.id,

          topic:
            scenario.topic,

          question:
            scenario.title,

          selectedAnswer:
            index,

          selectedAnswerText:
            choice.text,

          points:
            Number(
              choice.points || 0
            ),

          weight:
            Number(
              choice.weight || 0
            ),

          isCorrect,

          correctAnswerIndex:
            correctIndex,

          correctAnswerText:
            scenario
              .choices[
                correctIndex
              ]?.text || "",

          consequence:
            choice.feedback ||
            "Consider the compliance impact of this decision."
        }

      ]
    );
  }

  // ===================================================
  // ACCESSIBLE ANSWER
  // ===================================================

  function selectAnswerAccessible(
    index
  ) {

    if (
      selected !== null ||
      flying ||
      result
    ) {
      return;
    }

    const targets =
      getTargetPositions();

    const target =
      targets[index];

    if (!target) {
      return;
    }

    const targetDX =
      target.x -
      SLINGSHOT.x;

    const targetDY =
      target.y -
      SLINGSHOT.y;

    const targetDistance =
      Math.sqrt(
        targetDX *
          targetDX +
        targetDY *
          targetDY
      );

    if (
      targetDistance < 1
    ) {
      return;
    }

    const pullX =
      SLINGSHOT.x -
      (targetDX /
        targetDistance) *
        MAX_DRAG;

    const pullY =
      SLINGSHOT.y -
      (targetDY /
        targetDistance) *
        MAX_DRAG;

    const startPosition = {
      x: pullX,
      y: pullY
    };

    setBirdPosition(
      startPosition
    );

    createTrajectory(
      startPosition
    );

    setTimeout(() => {

      launchBird(
        startPosition,
        index
      );

    }, 150);
  }

  // ===================================================
  // NEXT SCENARIO
  // ===================================================

  function nextScenario() {

    if (
      current ===
      scenarios.length - 1
    ) {

      setFinished(true);

      return;
    }

    setCurrent(
      (old) =>
        old + 1
    );

    setSelected(null);

    setResult(null);

    resetBird();
  }

  // ===================================================
  // AUTOMATIC NEXT QUESTION
  // ===================================================

  useEffect(() => {

    if (!result) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          nextScenario();
        },
        AUTO_NEXT_DELAY
      );

    return () =>
      clearTimeout(timer);

  }, [result]);

  // ===================================================
  // CLEANUP ANIMATION
  // ===================================================

  useEffect(() => {

    return () => {

      if (
        animationRef.current
      ) {

        cancelAnimationFrame(
          animationRef.current
        );

      }

    };

  }, []);

  // ===================================================
  // SAVE RESULT
  // ===================================================

  async function saveResult() {

    setSaving(true);

    try {

      const topicStrength =
        getTopicStrength(
          answers,
          scenarios
        );

      const response =
        await fetch(
          `${API_URL}/api/results`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              playerName,

              score,

              riskLevel:
                getRiskLevel(
                  score,
                  scenarios.length
                ),

              answers,

              topicStrength

            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Could not save result."
        );

      }

      alert(
        "Result saved successfully."
      );

    } catch (error) {

      console.error(
        "Save result error:",
        error
      );

      alert(
        "Could not connect to the backend.\n\n" +
        "Please make sure the backend server is running."
      );

    } finally {

      setSaving(false);

    }
  }

  // ===================================================
  // AI PERFORMANCE INSIGHT
  // ===================================================

  useEffect(() => {

    if (
      !finished ||
      !answers.length
    ) {
      return;
    }

    let cancelled = false;

    async function generateInsight() {

      setLoadingInsight(true);

      const topicStrength =
        getTopicStrength(
          answers,
          scenarios
        );

      try {

        const response =
          await fetch(
            `${API_URL}/api/insight`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                playerName,

                score,

                totalQuestions:
                  scenarios.length,

                answers,

                topicStrength

              })
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "AI insight generation failed."
          );

        }

        if (!cancelled) {

          setAiInsight(
            data.insight
          );

        }

      } catch (error) {

        console.error(
          "AI insight error:",
          error
        );

        const assessed =
          topicStrength
            .filter(
              (item) =>
                item.assessed
            )
            .sort(
              (a, b) =>
                b.percentage -
                a.percentage
            );

        if (!cancelled) {

          setAiInsight({

            headline:
              "Your compliance decision profile",

            summary:
              assessed.length
                ? `You showed your strongest judgment in ${assessed[0].topic} (${assessed[0].percentage}%). Focus additional practice on lower-scoring assessed topics.`
                : "Complete more scenarios to build a reliable compliance profile.",

            strengths:
              assessed
                .filter(
                  (item) =>
                    item.percentage >= 75
                )
                .slice(0, 3)
                .map(
                  (item) =>
                    `${item.topic}: ${item.percentage}%`
                ),

            focusAreas:
              assessed
                .filter(
                  (item) =>
                    item.percentage < 75
                )
                .slice(0, 3)
                .map(
                  (item) =>
                    `${item.topic}: ${item.percentage}%`
                ),

            nextStep:
              "Review the consequences shown after each decision and practise the areas where your strength percentage is lowest."

          });

        }

      } finally {

        if (!cancelled) {
          setLoadingInsight(false);
        }

      }
    }

    generateInsight();

    return () => {
      cancelled = true;
    };

  }, [
    finished,
    answers,
    scenarios,
    playerName,
    score
  ]);

  // ===================================================
  // SHOW SUCCESS POPUP
  // ===================================================

  useEffect(() => {

    if (!finished) {
      return;
    }

    const maxScore =
      scenarios.length * 100;

    const percentage =
      maxScore > 0
        ? (score / maxScore) * 100
        : 0;

    if (percentage > 75) {
      setShowSuccessPopup(true);
    } else {
      setShowSuccessPopup(false);
    }

  }, [
    finished,
    score,
    scenarios.length
  ]);

  // ===================================================
  // RESTART GAME
  // ===================================================

  function restartGame() {

    setStarted(false);

    setFinished(false);

    setScenarios([]);

    setCurrent(0);

    setScore(0);

    setSelected(null);

    setAnswers([]);

    setResult(null);

    setAiInsight(null);

    setShowSuccessPopup(false);

    resetBird();
  }

  // ===================================================
  // START SCREEN
  // ===================================================

  if (!started) {

    return (

      <main className="container">

        <div className="hero">

          <div className="hero-orbit">

            <div className="hero-bird">

              <ComplianceBird
                x={50}
                y={50}
              />

            </div>

          </div>

          <div className="badge">
            CORPORATE COMPLIANCE
          </div>

          <h1>
            Compliance Challenge
          </h1>

          <p className="hero-subtitle">
            Don't just answer compliance
            questions. Aim, decide and
            make the right call.
          </p>

          <div className="game-preview">

            <div className="preview-step">

              <span>
                01
              </span>

              <strong>
                Aim
              </strong>

              <small>
                Pull back the bird
              </small>

            </div>

            <div className="preview-arrow">
              →
            </div>

            <div className="preview-step">

              <span>
                02
              </span>

              <strong>
                Choose
              </strong>

              <small>
                Hit the right answer
              </small>

            </div>

            <div className="preview-arrow">
              →
            </div>

            <div className="preview-step">

              <span>
                03
              </span>

              <strong>
                Learn
              </strong>

              <small>
                Understand why
              </small>

            </div>

          </div>

          <form
            onSubmit={startGame}
            className="start-form"
          >

            <input
              type="text"
              value={playerName}
              onChange={(e) =>
                setPlayerName(
                  e.target.value
                )
              }
              placeholder="Enter your name"
              disabled={
                loadingQuestions
              }
            />

            <button
              type="submit"
              disabled={
                loadingQuestions
              }
            >

              {loadingQuestions
                ? "Generating Questions..."
                : "Start Challenge →"}

            </button>

          </form>

          <div className="info">

            <span>
              ⏱ 10 minutes
            </span>

            <span>
              🎯 10 scenarios
            </span>

            <span>
              🏆 Score-based
            </span>

          </div>

          <div className="topics">

            <h3>
              Topics Covered
            </h3>

            <div className="topic-list">

              {TOPICS.map(
                (topic) => (

                  <span
                    className="topic"
                    key={topic}
                  >
                    {topic}
                  </span>

                )
              )}

            </div>

          </div>

        </div>

      </main>

    );
  }

  // ===================================================
  // SAFETY CHECK
  // ===================================================

  if (
    started &&
    !scenario &&
    !finished
  ) {

    return (

      <main className="container">

        <div className="result-card">

          <h2>
            Loading question...
          </h2>

          <p>
            Please wait while the
            compliance challenge
            is prepared.
          </p>

        </div>

      </main>

    );
  }

  // ===================================================
  // RESULT SCREEN
  // ===================================================

  if (finished) {

    const risk =
      getRiskLevel(
        score,
        scenarios.length
      );

    const maxScore =
      scenarios.length * 100;

    const percentage =
      maxScore > 0
        ? Math.round(
            (score /
              maxScore) *
              100
          )
        : 0;

    const topicStrength =
      getTopicStrength(
        answers,
        scenarios
      );

    let performanceMessage =
      "Keep practicing.";

    if (percentage >= 80) {

      performanceMessage =
        "Excellent compliance judgment!";

    } else if (
      percentage >= 50
    ) {

      performanceMessage =
        "Good foundation — keep sharpening your compliance instincts.";

    }

    return (

      <main className="container">

        <div className="result-card result-card-wide">

          <div className="result-icon">

            {percentage >= 70
              ? "✓"
              : "X"}

          </div>

          <div className="badge">

            {percentage >= 70
              ? "CHALLENGE COMPLETE"
              : "CHALLENGE FAILED"}

          </div>

          <div className="score">

            {score}

            <small>
              / {maxScore}
            </small>

          </div>

          <div className="percentage">

            Your score: {percentage}%

          </div>

          <p>
            Minimum 70% required to pass the challenge
          </p>

          <div
            className={`risk ${risk.toLowerCase()}`}
          >
            {risk} RISK
          </div>

          {/* =================================================
              TOPIC STRENGTH
          ================================================= */}

          <section className="strength-section">

            <div className="section-heading">

              <div>

                <span className="section-kicker">
                  PERFORMANCE MAP
                </span>

                <h2>
                  Topic-wise strength
                </h2>

              </div>

              <span className="section-note">
                Based on your decision weights
              </span>

            </div>

            <div className="strength-grid">

              {topicStrength.map(
                (item) => (

                  <div
                    className={`strength-row ${
                      item.assessed
                        ? ""
                        : "not-assessed"
                    }`}
                    key={item.topic}
                  >

                    <div className="strength-label">

                      <span>
                        {item.topic}
                      </span>

                      <strong>

                        {item.assessed
                          ? `${item.percentage}%`
                          : "Not assessed"}

                      </strong>

                    </div>

                    <div className="strength-track">

                      <div
                        className="strength-fill"
                        style={{
                          width:
                            item.assessed
                              ? `${item.percentage}%`
                              : "0%"
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

          {/* =================================================
              AI INSIGHT
          ================================================= */}

          <section className="ai-insight-card">

            <div className="ai-insight-header">

              <div className="ai-spark">
                ✦
              </div>

              <div>

                <span className="section-kicker">
                  AI INSIGHT
                </span>

                <h2>

                  {loadingInsight
                    ? "Analysing your decisions..."
                    : aiInsight?.headline ||
                      "Your compliance decision profile"}

                </h2>

              </div>

            </div>

            {loadingInsight ? (

              <div className="ai-loading">

                <span className="ai-pulse" />

                AI is comparing your choices,
                topic strengths and risk patterns...

              </div>

            ) : aiInsight ? (

              <>

                <p className="ai-summary">
                  {aiInsight.summary}
                </p>

                <div className="ai-insight-columns">

                  <div className="ai-list strength-list">

                    <strong>
                      What you're doing well
                    </strong>

                    {(
                      aiInsight.strengths ||
                      []
                    ).length ? (

                      <ul>

                        {aiInsight.strengths.map(
                          (
                            item,
                            index
                          ) => (

                            <li
                              key={index}
                            >
                              {item}
                            </li>

                          )
                        )}

                      </ul>

                    ) : (

                      <p>
                        Keep building consistency
                        across the compliance topics.
                      </p>

                    )}

                  </div>

                  <div className="ai-list focus-list">

                    <strong>
                      Where to improve
                    </strong>

                    {(
                      aiInsight.focusAreas ||
                      []
                    ).length ? (

                      <ul>

                        {aiInsight.focusAreas.map(
                          (
                            item,
                            index
                          ) => (

                            <li
                              key={index}
                            >
                              {item}
                            </li>

                          )
                        )}

                      </ul>

                    ) : (

                      <p>
                        No major weak area detected
                        in this challenge.
                      </p>

                    )}

                  </div>

                </div>

                <div className="ai-next-step">

                  <strong>
                    Recommended next step
                  </strong>

                  <span>
                    {aiInsight.nextStep}
                  </span>

                </div>

              </>

            ) : (

              <p className="ai-summary">
                Complete the challenge to receive
                your personalized AI insight.
              </p>

            )}

          </section>

          {/* =================================================
              TAKEAWAY
          ================================================= */}

          <h2>
            Your takeaway
          </h2>

          <p>
            When you're unsure,
            don't guess. Stop,
            think, verify the
            appropriate policy or
            channel, and then act.
          </p>

          <div className="framework">

            <span>
              STOP
            </span>

            <span>
              →
            </span>

            <span>
              THINK
            </span>

            <span>
              →
            </span>

            <span>
              VERIFY
            </span>

            <span>
              →
            </span>

            <span>
              ACT
            </span>

          </div>

          <div className="result-actions">

            <button
              onClick={saveResult}
              disabled={
                saving ||
                loadingInsight
              }
            >

              {saving
                ? "Saving..."
                : "Save Result"}

            </button>

            <button
              type="button"
              onClick={restartGame}
              disabled={saving}
            >
              Restart Quiz
            </button>

          </div>

        </div>

        {/* =====================================================
            SUCCESS POPUP
        ===================================================== */}

        {showSuccessPopup && percentage > 75 && (

          <div
            className="success-popup-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-popup-title"
          >

            <div className="success-popup">

              <button
                type="button"
                className="success-popup-close"
                onClick={() =>
                  setShowSuccessPopup(false)
                }
                aria-label="Close"
              >
                ×
              </button>

              <div className="success-popup-icon">
                ✓
              </div>

              <div className="success-popup-badge">
                TRAINING COMPLETED
              </div>

              <h2 id="success-popup-title">
                Congratulations, {playerName || "Champion"}!
              </h2>

              <p className="success-popup-main">
                You have successfully completed
                the compliance training.
              </p>

              <div className="success-popup-score">
                <span>Your Score</span>

                <strong>
                  {percentage}%
                </strong>
              </div>

              <p className="success-popup-description">
                Excellent work! You demonstrated
                strong compliance decision-making
                throughout the challenge.
              </p>

              {/* =============================================
                  MOCK PHISHING SIMULATION LINK
              ============================================= */}

              <div className="phishing-simulation-card">


                <div className="phishing-simulation-title">
                  🎉 CONGRATULATIONS! 🎉
                </div>

                <p>
                        "You've scored exceptionally well in the compliance test!"
                        "💰 AMAZING NEWS! 💰"
                        "You have WON an AMAZING MONEY VOUCHER for your outstanding performance!"
                        "Click on below link to claim your voucher."
                </p>

                <a
                  href="https://voucher"
                  className="mock-phishing-link"
                  onClick={(e) => {
                    e.preventDefault();

                    const claimVoucher =
                      window.confirm(
                        "😈 Hey, You've been phished! 😈\n\n" +
                        "There was no money voucher.\n\n" +
                        "This was a simulated phishing attempt designed to test your awareness.\n\n" +
                        "Be careful next time :)"
                      );

                    if (claimVoucher) {
                      window.alert(
                        "😈 Hey, You've been phished! 😈\n\n" +
                        "There was no money voucher.\n\n" +
                        "This was a simulated phishing attempt designed to test your awareness.\n\n" +
                        "Be careful next time :)"
                      );
                    }
                  }}
                >
                  https://voucher
                </a>

              </div>

              <button
                type="button"
                className="success-popup-button"
                onClick={() =>
                  setShowSuccessPopup(false)
                }
              >
                Continue to Results
              </button>

            </div>

          </div>

        )}

      </main>

    );
  }

  // ===================================================
  // QUESTION SCREEN
  // ===================================================

  const progress =
    ((current + 1) /
      scenarios.length) *
    100;

  const displayedBird =
    flightPosition ||
    birdPosition;

  let birdRotation = 0;

  if (
    flying &&
    selectedTarget !== null &&
    flightPosition
  ) {

    const targets =
      getTargetPositions();

    const target =
      targets[selectedTarget];

    if (target) {

      birdRotation =
        Math.atan2(
          target.y -
            flightPosition.y,

          target.x -
            flightPosition.x
        ) *
        (180 / Math.PI);

    }
  }

  return (

    <main className="container game-container">

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark">
            ✓
          </div>

          <div>

            <strong>
              Compliance Challenge
            </strong>

            <span>
              Scenario{" "}
              {current + 1} /{" "}
              {scenarios.length}
            </span>

          </div>

        </div>

        <div className="score-small">

          <span>
            Score
          </span>

          <strong>
            {score}
          </strong>

        </div>

      </header>

      {/* =================================================
          PROGRESS
      ================================================= */}

      <div className="progress-wrapper">

        <div className="progress-label">

          <span>
            Question {current + 1} of{" "}
            {scenarios.length}
          </span>

          <span>
            {Math.round(progress)}%
          </span>

        </div>

        <div className="progress">

          <div
            style={{
              width:
                `${progress}%`
            }}
          />

        </div>

      </div>

      {/* =================================================
          QUESTION PANEL
      ================================================= */}

      <section className="question-panel">

        <div className="scenario-meta">

          <span className="topic-pill">
            {scenario.topic}
          </span>

          <div className="question-instruction">

            <div>

              <strong>
                What would you do?
              </strong>

            </div>

          </div>

        </div>

        <h1>
          {scenario.title}
        </h1>

        <p className="description">
          {scenario.description}
        </p>

      </section>

      {/* =================================================
          GAME BOARD
      ================================================= */}

      <section
        className="game-board"
        ref={gameAreaRef}
      >

        <div className="cloud cloud-one" />

        <div className="cloud cloud-two" />

        <div className="board-label">
          CHOOSE YOUR RESPONSE
        </div>

        {/* =================================================
            TARGETS
        ================================================= */}

        <div className="targets">

          {scenario.choices
            .slice(0, 4)
            .map(
              (
                choice,
                index
              ) => (

                <AnswerTarget
                  key={index}
                  choice={choice}
                  index={index}
                  selected={selected}
                  result={result}
                  onClick={
                    selectAnswerAccessible
                  }
                />

              )
            )}

        </div>

        {/* =================================================
            SLINGSHOT
        ================================================= */}

        <div
          className="slingshot"
          style={{
            left:
              SLINGSHOT.x,

            top:
              SLINGSHOT.y
          }}
        >

          <div className="slingshot-arm left" />

          <div className="slingshot-arm right" />

          <div className="slingshot-base" />

        </div>

        {/* =================================================
            DRAGGING BIRD
        ================================================= */}

        {!flying && (

          <div
            className={`bird-drag-area ${
              dragging
                ? "dragging"
                : ""
            }`}

            style={{
              left:
                birdPosition.x,

              top:
                birdPosition.y
            }}

            onPointerDown={
              handlePointerDown
            }

            onPointerMove={
              handlePointerMove
            }

            onPointerUp={
              handlePointerUp
            }

            onPointerCancel={
              handlePointerUp
            }
          >

            <ComplianceBird
              x={0}
              y={0}

              rotation={
                dragging
                  ? -12
                  : 0
              }
            />

          </div>

        )}

        {/* =================================================
            FLYING / INJURED BIRD
        ================================================= */}

        {flying &&
          flightPosition && (

            <ComplianceBird

              x={
                displayedBird.x
              }

              y={
                displayedBird.y
              }

              rotation={
                injuredBird
                  ? 90
                  : birdRotation
              }

              flying

              injured={
                injuredBird
              }

            />

          )}

        {/* =================================================
            TRAJECTORY
        ================================================= */}

        {dragging &&
          trajectory.map(
            (
              point,
              index
            ) => (

              <div
                key={index}
                className="trajectory-dot"

                style={{
                  left:
                    point.x,

                  top:
                    point.y,

                  opacity:
                    1 -
                    index *
                      0.055
                }}
              />

            )
          )}

        {/* =================================================
            FEEDBACK
        ================================================= */}

        {result && (

          <div
            className={`game-feedback ${
              result.correct
                ? "success"
                : "failure"
            }`}
          >

            <div className="feedback-icon">

              {result.correct
                ? "✓"
                : "!"}

            </div>

            <div>

              <strong>

                {result.correct
                  ? result.weight >= 100
                    ? "Perfect decision!"
                    : "Good decision — but not optimal"
                  : "Incorrect decision"}

              </strong>

              <div className="feedback-weight">

                Solution accuracy:{" "}
                {result.weight}%

              </div>

              <p>
                {result.consequence}
              </p>

              {!result.correct && (

                <small>

                  Best principle:{" "}

                  {
                    scenario
                      .choices[
                        result
                          .correctIndex
                      ]?.text
                  }

                </small>

              )}

            </div>

          </div>

        )}

      </section>

    </main>

  );
}

export default App;
