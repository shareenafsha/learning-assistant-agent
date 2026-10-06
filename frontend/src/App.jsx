import React, { useState } from "react";

const API = "http://localhost:5000/api";

function App() {
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [hasMaterial, setHasMaterial] = useState(null);
  const [material, setMaterial] = useState("");
  const [fileName, setFileName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetError = () => setError("");

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    resetError();
    try {
      const res = await fetch(`${API}/extract-material`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMaterial(data.text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function makeTopics() {
    if (!subject.trim() || !syllabus.trim()) {
      setError("Please enter the subject and syllabus.");
      return;
    }
    setLoading(true);
    resetError();
    try {
      const res = await fetch(`${API}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, syllabus, material })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopics(data.topics);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startQuiz() {
    if (!selectedTopic) return;
    setLoading(true);
    resetError();
    try {
      const res = await fetch(`${API}/mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, syllabus, material,
          topic: selectedTopic,
          difficulty,
          count: 5
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function answer(index) {
    if (selected !== null) return;
    setSelected(index);
    if (index === questions[current].answer) setScore(s => s + 1);
  }

  function nextQuestion() {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      setStep(6);
    }
  }

  function restart() {
    setStep(1);
    setSubject("");
    setHasMaterial(null);
    setMaterial("");
    setFileName("");
    setSyllabus("");
    setTopics([]);
    setSelectedTopic("");
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    resetError();
  }

  return (
    <div className="app">
      <header>
        <div className="brand">LearnMate</div>
        <span className="tag">Learning Assistant</span>
      </header>

      <main>
        <div className="progress">
          {[1,2,3,4,5].map(n => <span key={n} className={step >= n ? "active" : ""}>{n}</span>)}
        </div>

        {error && <div className="error">{error}</div>}

        {step === 1 && (
          <section className="card">
            <div className="icon">✦</div>
            <h1>What do you want to learn?</h1>
            <p>Start by choosing the subject you want to study.</p>
            <input
              autoFocus
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Software Engineering"
            />
            <button disabled={!subject.trim()} onClick={() => setStep(2)}>Continue →</button>
          </section>
        )}

        {step === 2 && (
          <section className="card">
            <h1>Do you have study material?</h1>
            <p>Upload your notes/PDF or continue without them.</p>
            <div className="choices">
              <button className={hasMaterial === true ? "choice selected" : "choice"} onClick={() => setHasMaterial(true)}>📄 Yes, I have material</button>
              <button className={hasMaterial === false ? "choice selected" : "choice"} onClick={() => { setHasMaterial(false); setStep(3); }}>➜ No, continue without it</button>
            </div>

            {hasMaterial === true && (
              <div className="upload">
                <label className="uploadBox">
                  <strong>Upload PDF or TXT</strong>
                  <span>{fileName || "Click to choose a file"}</span>
                  <input type="file" accept=".pdf,.txt" onChange={uploadFile} />
                </label>
                <textarea value={material} onChange={e => setMaterial(e.target.value)} placeholder="Or paste your study material here..." />
                <button disabled={loading || !material.trim()} onClick={() => setStep(3)}>
                  {loading ? "Reading material..." : "Continue →"}
                </button>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="card wide">
            <h1>Now give me the syllabus</h1>
            <p>The syllabus keeps the assistant focused on what you actually need to study.</p>
            <textarea
              className="syllabus"
              autoFocus
              value={syllabus}
              onChange={e => setSyllabus(e.target.value)}
              placeholder={"Paste your syllabus here...\n\nExample:\nUnit 1: Introduction\nUnit 2: Requirements Engineering\nUnit 3: Software Design\nUnit 4: Testing"}
            />
            <button disabled={loading || !syllabus.trim()} onClick={makeTopics}>
              {loading ? "Analyzing syllabus..." : "Create My Study Topics →"}
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="card wide">
            <h1>Choose a topic</h1>
            <p>{subject} • Select what you want to practice now.</p>
            <div className="topics">
              {topics.map((t, i) => (
                <button key={i} className={selectedTopic === t.topic ? "topic selected" : "topic"} onClick={() => setSelectedTopic(t.topic)}>
                  <b>{t.topic}</b><small>{t.description}</small>
                </button>
              ))}
            </div>
            <div className="difficulty">
              <label>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
            <button disabled={loading || !selectedTopic} onClick={startQuiz}>
              {loading ? "Generating MCQs..." : "Start Topic Quiz →"}
            </button>
          </section>
        )}

        {step === 5 && questions.length > 0 && (
          <section className="card wide">
            <div className="quizTop">
              <span>{selectedTopic}</span>
              <span>Question {current + 1} / {questions.length}</span>
            </div>
            <div className="question">
              <h2>{questions[current].question}</h2>
              <div className="options">
                {questions[current].options.map((option, i) => {
                  let cls = "option";
                  if (selected !== null && i === questions[current].answer) cls += " correct";
                  else if (selected === i) cls += " wrong";
                  return <button key={i} className={cls} onClick={() => answer(i)}>
                    <span>{String.fromCharCode(65+i)}</span>{option}
                  </button>;
                })}
              </div>
              {selected !== null && (
                <div className="explanation">
                  <b>{selected === questions[current].answer ? "Correct! 🎉" : "Not quite."}</b>
                  <p>{questions[current].explanation}</p>
                </div>
              )}
              {selected !== null && <button onClick={nextQuestion}>{current + 1 === questions.length ? "See Result →" : "Next Question →"}</button>}
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="card result">
            <div className="icon">✓</div>
            <h1>Quiz complete!</h1>
            <div className="score">{score}/{questions.length}</div>
            <p>You completed the <b>{selectedTopic}</b> quiz.</p>
            <div className="resultActions">
              <button onClick={() => { setStep(4); setSelected(null); }}>Practice Another Topic</button>
              <button className="secondary" onClick={restart}>Start New Subject</button>
            </div>
          </section>
        )}
      </main>

      <footer>LearnMate • Syllabus-focused learning assistant</footer>
    </div>
  );
}

export default App;
