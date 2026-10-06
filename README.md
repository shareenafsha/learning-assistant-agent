# Learning Assistant Agent

A beginner-friendly full-stack learning assistant that:
- asks for the subject
- asks whether study material is available
- accepts a syllabus
- accepts PDF/text study material
- extracts PDF text
- lets the student choose a topic and difficulty
- generates topic-focused MCQs using Groq
- gives explanations after answering
- tracks the current quiz score

## Requirements
- Node.js 18+
- Python 3.10+
- VS Code
- A Groq API key

## 1. Backend

Open a terminal in the `backend` folder:

```bash
python -m venv venv
```

Windows:
```bash
venv\Scripts\activate
```

macOS/Linux:
```bash
source venv/bin/activate
```

Install packages:
```bash
pip install -r requirements.txt
```

Create a `.env` file inside `backend`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:
```bash
python app.py
```

It runs at:
`http://localhost:5000`

## 2. Frontend

Open a second VS Code terminal and go to `frontend`:

```bash
npm install
npm run dev
```

Open the URL shown by Vite, normally:
`http://localhost:5173`

## Project flow

Subject → Study Material → Syllabus → Topics → Topic + Difficulty → MCQ Quiz → Explanation → Score

## Notes

If no study material is provided, the app can still generate questions from the syllabus and topic.
For strict syllabus-only behavior, upload/paste the syllabus and study material and use the generated topic list.
