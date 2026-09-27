const fs = require('fs');
const readline = require('readline');

async function findAuthorizedPrompt() {
  const filePath = 'C:\\Users\\mksbd\\.gemini\\antigravity-ide\\brain\\dbcc3790-2f20-4edd-8a07-0c6653045d6f\\.system_generated\\logs\\transcript_full.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  for await (const line of rl) {
    if (line.includes('"type":"USER_INPUT"') && line.includes('authorized Customer, Product, Warranty')) {
      const obj = JSON.parse(line);
      fs.writeFileSync('./scratch/authorized_enhancements.txt', obj.content, 'utf8');
      console.log('Saved authorized enhancements prompt, length:', obj.content.length);
      count++;
    }
  }
  console.log('Total found:', count);
}
findAuthorizedPrompt();
