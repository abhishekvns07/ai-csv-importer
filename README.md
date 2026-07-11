# AI-Powered CSV Importer

An intelligent web application that allows users to upload any CRM lead CSV file and uses AI (Google Gemini) to automatically map, clean, and extract the data into standard CRM fields.

## Features
- **Intelligent Field Mapping**: Uses Gemini AI to understand column context and map disparate fields to standard ones.
- **AI Batching & Retries**: Processes large files in chunks of 50 rows, with automatic exponential backoff retries if the AI API limits are hit.
- **File Upload & Backend Parsing**: Sends raw `multipart/form-data` to the backend where it is robustly parsed using PapaParse.
- **SQLite Database Integration**: Automatically creates a persistent local SQLite database (`database.sqlite`) to store all imported leads permanently.
- **Virtualized Tables**: Uses `react-virtuoso` to smoothly render huge data tables without browser lag.
- **Smart Data Handling**: Skips invalid records and consolidates extra contact information into notes.
- **Responsive UI & Dark Mode**: A beautiful, premium interface built with Vanilla CSS.

## Tech Stack
- **Frontend**: Next.js, React, PapaParse (Client Preview), React Virtuoso, Lucide React (Icons).
- **Backend**: Node.js, Express, SQLite3 (Database), PapaParse (Server parsing), @google/generative-ai.
- **Styling**: Vanilla CSS (CSS Modules).

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key

### Setup Instructions

1. **Clone the repository or navigate to the project directory.**

2. **Configure Backend Environment Variables**
   - Navigate to the `backend` directory.
   - Open `.env` and replace `your_gemini_api_key_here` with your actual Google Gemini API key.

3. **Start the Backend**
   \`\`\`bash
   cd backend
   npm install
   node server.js
   \`\`\`
   The backend will run on http://localhost:5000.

4. **Start the Frontend**
   Open a new terminal window:
   \`\`\`bash
   cd frontend
   npm install
   npm run dev
   \`\`\`
   The frontend will run on http://localhost:3000.

5. **Usage**
   - Open \`http://localhost:3000\` in your browser.
   - Click "Import Leads via CSV".
   - Upload any CSV file with leads.
   - Preview the data and click "Confirm Import".

## Docker Setup (Optional)
You can run the entire stack using Docker Compose:
\`\`\`bash
docker-compose up --build
\`\`\`
Make sure your \`.env\` file in the backend is configured before running Docker Compose.
