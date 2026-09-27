const fs = require('fs');
const readline = require('readline');

async function findPrompt() {
  const filePath = 'C:\\Users\\mksbd\\.gemini\\antigravity-ide\\brain\\dbcc3790-2f20-4edd-8a07-0c6653045d6f\\.system_generated\\logs\\transcript_full.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let found = null;
  for await (const line of rl) {
    if (line.includes('"type":"USER_INPUT"') && line.includes('Transform the')) {
      const obj = JSON.parse(line);
      found = obj.content;
    }
  }
  if (found) {
    fs.writeFileSync('./scratch/extracted_prompt.txt', found, 'utf8');
    console.log('Saved extracted prompt, length:', found.length);
  } else {
    console.log('Not found');
  }
}
findPrompt();
