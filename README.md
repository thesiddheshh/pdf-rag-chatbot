# 🧠 PDF RAG Chatbot (React Frontend)

An elegant, highly interactive multi-PDF Retrieval-Augmented Generation (RAG) chatbot frontend built with **React** and **Tailwind CSS**. This interface allows users to upload multiple PDF files, chunk and analyze them client-side, and query them using popular LLM providers like **OpenAI**, **Anthropic (Claude)**, and **OpenRouter**. Seamless experience, dark mode, animated gradients, and full support for live document-based Q\&A.

---

## 📌 Table of Contents

* [Overview](#overview)
* [Key Features](#key-features)
* [Tech Stack](#tech-stack)
* [Architecture & Flow](#architecture--flow)
* [Project Structure](#project-structure)
* [Installation](#installation)
* [Usage Guide](#usage-guide)
* [API Integration](#api-integration)
* [Customization](#customization)
* [Screenshots](#screenshots)
* [Future Improvements](#future-improvements)
* [License](#license)
* [Contact](#contact)

---

## 📖 Overview

This project implements a **frontend-only** PDF document assistant capable of:

* Uploading and managing multiple PDFs
* Extracting text (via FileReader)
* Chunking documents with overlap
* Finding relevant chunks using cosine-like semantic similarity
* Querying selected document context via LLMs
* Generating contextual, cited answers in a rich, animated chat UI

Ideal use cases:

* Academic research
* Legal document review
* Business intelligence Q\&A
* Student projects using API-based LLMs

---

## ✨ Key Features

### PDF Management

* Upload multiple PDFs via drag-and-drop or file picker
* Persistent state of uploaded files and their metadata
* Select/deselect PDFs for querying
* Remove individual documents

### Text Processing

* Text extraction via `FileReader` (mocked but extensible)
* Overlapping chunking with adjustable parameters
* Lightweight semantic similarity scoring

### LLM Integration

* Works with **OpenAI**, **Anthropic**, and **OpenRouter**
* Dynamic system prompts with citation instructions
* API key stored locally (never sent to server)
* Top-k context chunk retrieval + prompt injection

### Chat Interface

* Timestamped user and assistant messages
* Source chunk citation with filenames and ranges
* Streaming-style loading animation
* Clear chat and download history

### UI/UX

* Tailwind-based layout
* Pastel animated gradients
* Fully responsive dark-mode design
* Modal-based API configuration

---

## 🛠 Tech Stack

| Category          | Tech                             |
| ----------------- | -------------------------------- |
| Framework         | React                            |
| Styling           | Tailwind CSS                     |
| PDF Parsing       | FileReader (browser native)      |
| Chunking          | Custom tokenizer & overlap logic |
| Similarity Search | In-browser cosine approximation  |
| LLM Providers     | OpenAI, Anthropic, OpenRouter    |
| Build Tooling     | Next.js (optional) or Vite       |
| State Management  | React useState + useRef          |

---

## 🧠 Architecture & Flow

```mermaid
graph TD
  A[User Uploads PDFs] --> B[Extract text via FileReader]
  B --> C[Chunk text with overlap]
  C --> D[User submits query]
  D --> E[Calculate chunk similarity scores]
  E --> F[Select Top-K Relevant Chunks]
  F --> G[Build Prompt with Citations]
  G --> H[Send request to LLM via fetch()]
  H --> I[Render response in chat UI]
```

---

## 🗂 Project Structure

```
frontend/
├── components/
│   └── PDFRagChatbot.jsx     # Full component logic and UI
├── pages/
│   └── index.js              # Entry file (Next.js or base React)
├── public/                   # Icons, assets
├── styles/                   # Tailwind and global CSS (if any)
├── tailwind.config.js        # Tailwind config
├── package.json              # NPM dependencies
└── README.md                 # You're here!
```

---

## ⚙️ Installation

```bash
git clone https://github.com/yourusername/pdf-rag-chatbot.git
cd pdf-rag-chatbot/frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

---

## 🧪 Usage Guide

1. **Upload PDFs** from the sidebar
2. **Select files** you want the bot to query
3. Click ⚙️ and **configure your API key** and provider
4. Type your question
5. View answers with full citations
6. Download the conversation or clear chat as needed

---

## 🔐 API Integration

### Supported Providers

* OpenAI (`gpt-3.5-turbo`, `gpt-4`)
* Anthropic (`claude-3-sonnet`)
* OpenRouter (`mistral-7b-instruct`, etc.)

### API Setup

* Click ⚙️ icon to open modal
* Choose provider from dropdown
* Paste API key (saved in local state)
* Keys are used **only client-side**

> ❗ You are responsible for securing and monitoring your API key usage.

---

## 🎨 Customization

* Modify `extractPDFText()` to plug in **PDF.js** or server-side parsing
* Replace `calculateSimilarity()` with real embeddings + cosine similarity
* Add chunk size or overlap sliders in settings
* Integrate Firebase or Supabase for multi-user sessions
* Swap React for Next.js or Remix for SSR support

---

## 📸 Screenshots

> *(Add actual screenshots here when deploying)*

* Drag-and-drop upload
* API settings modal
* Citation-enabled assistant reply
* Animated message bubbles

---

## 🚧 Future Improvements

* Real PDF parsing via `pdfjs-dist`
* Token-count aware chunking and filtering
* FAISS/Vector DB support via backend
* Streaming LLM responses
* File-level answer traceability
* OAuth-based login to save sessions

---

## 📄 License

MIT License. Free for personal and commercial use.

---

## 👤 Contact

**Developer:** Siddh Wagawad
**GitHub:** [@thesiddheshh](https://github.com/thesiddheshh)
**Email:** [siddhwagawad@gmail.com](mailto:siddhwagawad@gmail.com)
**Instagram:** [@thesiddheshh](https://instagram.com/thesiddheshh)

---

> If you found this project useful, please consider ⭐ starring the repo and sharing it with others!
