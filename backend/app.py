import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from pypdf import PdfReader

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"

def extract_pdf(file):
    reader = PdfReader(file)
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)

def clean_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text, flags=re.I).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text

def call_groq(prompt):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env.")

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": MODEL,
            "temperature": 0.4,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict academic learning assistant. "
                        "Use only the supplied syllabus, topic and study material. "
                        "Do not invent facts outside the supplied scope."
                    )
                },
                {"role": "user", "content": prompt}
            ]
        },
        timeout=90
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/api/extract-material")
def extract_material():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            text = extract_pdf(file)
        elif filename.endswith(".txt"):
            text = file.read().decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Only PDF and TXT files are supported."}), 400

        return jsonify({
            "filename": file.filename,
            "text": text[:120000]
        })
    except Exception as e:
        return jsonify({"error": f"Could not read file: {str(e)}"}), 500

@app.post("/api/topics")
def generate_topics():
    data = request.get_json(force=True)
    subject = data.get("subject", "").strip()
    syllabus = data.get("syllabus", "").strip()
    material = data.get("material", "").strip()

    if not subject or not syllabus:
        return jsonify({"error": "Subject and syllabus are required."}), 400

    # Limit text sent to Groq to avoid oversized requests
    syllabus_for_ai = syllabus[:15000]
    material_for_ai = material[:20000]

    prompt = f"""
Create a clean topic list for this student's subject.

SUBJECT:
{subject}

SYLLABUS:
{syllabus_for_ai}

STUDY MATERIAL:
{material_for_ai}

Return ONLY valid JSON in this format:
[
  {{"topic":"Topic name","description":"One short sentence"}}
]

Rules:
- Topics must come from the syllabus.
- Do not add outside topics.
- Keep 5 to 15 useful study topics.
"""

    try:
        result = json.loads(clean_json(call_groq(prompt)))
        return jsonify({"topics": result})
    except Exception as e:
        return jsonify({"error": f"Could not generate topics: {str(e)}"}), 500

@app.post("/api/mcq")
def generate_mcq():
    data = request.get_json(force=True)
    subject = data.get("subject", "").strip()
    syllabus = data.get("syllabus", "").strip()
    material = data.get("material", "").strip()
    topic = data.get("topic", "").strip()
    difficulty = data.get("difficulty", "Medium")
    count = min(max(int(data.get("count", 5)), 1), 10)

    if not subject or not syllabus or not topic:
        return jsonify({"error": "Subject, syllabus and topic are required."}), 400

    # Limit text sent to Groq to avoid oversized requests
    syllabus_for_ai = syllabus[:15000]
    material_for_ai = material[:25000]

    prompt = f"""
Generate {count} multiple-choice questions for a student.

SUBJECT:
{subject}

SELECTED TOPIC:
{topic}

DIFFICULTY:
{difficulty}

SYLLABUS:
{syllabus_for_ai}

STUDY MATERIAL:
{material_for_ai}

Return ONLY valid JSON:
[
  {{
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Brief explanation"
  }}
]

Rules:
- answer must be an integer from 0 to 3.
- Exactly four options.
- Questions must be primarily about the selected topic.
- Stay within the syllabus and supplied material.
- Do not repeat the same question.
- Keep explanations concise and student-friendly.
"""

    try:
        result = json.loads(clean_json(call_groq(prompt)))
        return jsonify({"questions": result})
    except Exception as e:
        return jsonify({"error": f"Could not generate MCQs: {str(e)}"}), 500
        
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
