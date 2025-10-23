import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge', 'documents');

async function loadTextFile(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

async function loadPdfFile(filePath: string): Promise<string> {
  // For now, skip PDF files to avoid pdf-parse issues
  console.log(`Skipping PDF file: ${filePath}`);
  return '';
}

export async function loadKnowledgeBase(): Promise<string> {
  // Create knowledge directory if it doesn't exist
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    return '';
  }

  const files = fs.readdirSync(KNOWLEDGE_DIR);
  const contents: string[] = [];

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const ext = path.extname(file).toLowerCase();

    try {
      if (ext === '.txt') {
        const content = await loadTextFile(filePath);
        contents.push(`\n--- ${file} ---\n${content}`);
      } else if (ext === '.pdf') {
        const content = await loadPdfFile(filePath);
        contents.push(`\n--- ${file} ---\n${content}`);
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  return contents.join('\n\n');
}
