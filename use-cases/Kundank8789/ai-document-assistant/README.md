# AI Document Assistant

An AI-powered document analysis application built for the SuperDocs Task 2 assignment.

The application allows users to upload multiple documents, analyze their contents, and generate an AI-powered Post-Event Impact Report with insights, conflicts, recommendations, and document summaries.

## Features

- Upload multiple documents
- Support for PDF files
- Support for TXT files
- Support for DOCX files
- Support for XLSX and XLS files
- Document content extraction
- Analyze uploaded documents
- AI-powered report generation
- Executive summary
- Event overview
- Key outcomes
- Attendance insights
- Feedback insights
- Financial insights
- Conflict detection
- Recommendations
- Individual document summaries
- Clear all uploaded documents

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express.js
- Multer
- pdf-parse
- Mammoth
- XLSX
- Groq API

## Project Structure

```text
ai-document-assistant/
├── src/
│   ├── pages/
│   │   └── Documents.jsx
│   └── ...
├── server/
│   ├── uploads/
│   ├── .env
│   ├── index.js
│   └── package.json
├── .gitignore
├── package.json
└── README.md

Installation
1. Clone the repository
git clone https://github.com/Kundank8789/superdocs-builds.git
2. Navigate to the project
cd superdocs-builds/use-cases/Kundank8789/ai-document-assistant
Frontend Setup

Install dependencies:

npm install

Start the frontend:

npm run dev

The frontend will run locally, typically at:

http://localhost:5173
Backend Setup

Open another terminal and navigate to the server folder:

cd server

Install dependencies:

npm install

Create a .env file:

GROQ_API_KEY=your_groq_api_key_here
PORT=5000

Start the backend:

npm run dev

The backend runs at:

http://localhost:5000
How to Use
Start the frontend and backend servers.
Open the application in the browser.
Navigate to the Documents page.
Upload one or more supported documents.
Click Analyze Documents to extract and process document content.
Click Generate Report.
The application generates an AI-powered Post-Event Impact Report.
Review the generated insights, conflicts, recommendations, and document summaries.
Use Clear All to remove uploaded documents and reset the document workspace.
Environment Variables

The backend requires:

GROQ_API_KEY=your_groq_api_key_here
PORT=5000

Never commit your .env file or API key to GitHub.

Supported File Types
PDF (.pdf)
Text (.txt)
Word (.docx)
Excel (.xlsx, .xls)
API Endpoints
Method	Endpoint	Description
GET	/	Check API status
POST	/api/upload	Upload a document
POST	/api/analyze	Analyze uploaded documents
POST	/api/generate	Generate the AI-powered report
POST	/api/clear	Clear uploaded documents
Submission

This project was built as part of the SuperDocs build assignment and is located at:

use-cases/Kundank8789/ai-document-assistant/