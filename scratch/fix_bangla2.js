const fs = require('fs');

// Fix CreateSalesReturnModal.tsx - use line-by-line replacement
(function fixSalesReturnModal() {
  const filePath = './apps/web/src/components/sales/CreateSalesReturnModal.tsx';
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let changed = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Line with Bangla in it (using Unicode code points directly from hex dump)
    
    // Line 534: "Due Bill Return Policy (বকেয়া বিল সমন্বয়)"
    if (line.includes('Due Bill Return Policy') && /[\u0980-\u09FF]/.test(line)) {
      lines[i] = '                      Due Bill Return Policy';
      changed++;
      console.log('Fixed line', i+1, 'Due Bill Return Policy');
      continue;
    }
    
    // Line 537: "এই ইনভয়েসের বকেয়া..."
    if (/\u098f\u0987/.test(line)) { // এই
      lines[i] = '                      This invoice has an outstanding due of <strong>\u09f3{currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>. ';
      changed++;
      console.log('Fixed line', i+1, 'এই ইনভয়েসের...');
      continue;
    }
    
    // Line 538: "নিয়ম অনুযায়ী..."
    if (/\u09a8\u09bf\u09af\u09bc\u09ae/.test(line)) { // নিয়ম
      lines[i] = '                      The return value will be applied directly to reduce the outstanding balance and <strong>will not be credited to the wallet</strong>.';
      changed++;
      console.log('Fixed line', i+1, 'নিয়ম অনুযায়ী...');
      continue;
    }
    
    // Line 567: "Wallet Credit (ওয়ালেটে জমা)"
    if (line.includes('Wallet Credit') && /[\u0980-\u09FF]/.test(line)) {
      lines[i] = '                      Wallet Credit';
      changed++;
      console.log('Fixed line', i+1, 'Wallet Credit (ওয়ালেটে...)');
      continue;
    }
    
    // Line 586: "Fully Paid Invoice (পরিশোধিত বিল)"
    if (line.includes('Fully Paid Invoice') && /[\u0980-\u09FF]/.test(line)) {
      lines[i] = '                      Fully Paid Invoice';
      changed++;
      console.log('Fixed line', i+1, 'Fully Paid Invoice (পরি...)');
      continue;
    }
    
    // Line 589: "ইনভয়েসটিতে কোনো..."
    if (/\u0987\u09a8\u09ad/.test(line)) { // ইনভ
      lines[i] = "                      This invoice has no outstanding balance. The full return value will be credited directly to the customer's wallet.";
      changed++;
      console.log('Fixed line', i+1, 'ইনভয়েসটিতে কোনো...');
      continue;
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`CreateSalesReturnModal: fixed ${changed} lines`);
  
  // Verify
  const newLines = fs.readFileSync(filePath, 'utf8').split('\n');
  const remaining = newLines.filter((l, idx) => /[\u0981-\u09F2\u09F4-\u09FF]/.test(l)); // Exclude ৳ (09F3)
  if (remaining.length > 0) {
    console.log('STILL HAS BANGLA in CreateSalesReturnModal:');
    remaining.forEach(l => console.log('  ' + l.trim()));
  } else {
    console.log('CLEAN: CreateSalesReturnModal.tsx');
  }
})();

// Fix DirectSaleModal.tsx  
(function fixDirectSaleModal() {
  const filePath = './apps/web/src/components/sales/DirectSaleModal.tsx';
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let changed = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Line 420: `"${...}" — অপর্যাপ্ত স্টক। ` +
    if (/\u0985\u09aa\u09b0\u09cd\u09af/.test(line) && line.includes('description')) {
      lines[i] = '          `"${l.description || l.productId}" \u2014 Insufficient stock. ` +';
      changed++;
      console.log('Fixed line', i+1, 'অপর্যাপ্ত স্টক (error msg line 1)');
      continue;
    }
    
    // Line 421: `স্টকে আছে: ${available}, চাহিদা: ${l.quantity}. ` +
    if (/\u09b8\u09cd\u099f\u0995\u09c7 \u0986\u099b\u09c7/.test(line)) {
      lines[i] = '          `Available: ${available}, Requested: ${l.quantity}.`';
      changed++;
      console.log('Fixed line', i+1, 'স্টকে আছে... (error msg line 2)');
      continue;
    }
    
    // Line 422: `(Insufficient stock: available ${available}, requested ${l.quantity}.)`
    // This is an extra line after the Bangla lines — it might become a dangling string now
    // Check if previous line was already replaced
    if (line.includes('(Insufficient stock: available ${available}')) {
      lines[i] = ''; // remove this line since info is now merged into line 420
      changed++;
      console.log('Fixed line', i+1, 'Removed redundant Insufficient stock line');
      continue;
    }
    
    // Line 773: tooltip with Bangla
    if (/\u0985\u09aa\u09b0\u09cd\u09af\u09be\u09aa\u09cd\u09a4 \u09b8\u09cd\u099f\u0995/.test(line)) {
      lines[i] = '                                  ? `Insufficient stock! Only ${line.availableStock ?? 0} unit(s) available.`';
      changed++;
      console.log('Fixed line', i+1, 'Bangla tooltip');
      continue;
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`DirectSaleModal: fixed ${changed} lines`);
  
  // Verify
  const newLines = fs.readFileSync(filePath, 'utf8').split('\n');
  const remaining = newLines.filter(l => /[\u0981-\u09F2\u09F4-\u09FF]/.test(l));
  if (remaining.length > 0) {
    console.log('STILL HAS BANGLA in DirectSaleModal:');
    remaining.forEach(l => console.log('  ' + l.trim()));
  } else {
    console.log('CLEAN: DirectSaleModal.tsx');
  }
})();
