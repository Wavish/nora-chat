# Psychic Medium Chat

Fresh deployment test - Manual trigger

A clean, minimal chat interface powered by Claude API with knowledge base integration.

## Setup

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```
ANTHROPIC_API_KEY=your_api_key_here
```

4. Add your knowledge base files to `knowledge/documents/`

5. Run development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Deployment

This project is configured for Vercel:

1. Push to GitHub
2. Import repository in Vercel
3. Add `ANTHROPIC_API_KEY` environment variable
4. Deploy

## Knowledge Base

Place your `.txt` and `.pdf` files in `knowledge/documents/`. The system will process them and use them as context for responses.
