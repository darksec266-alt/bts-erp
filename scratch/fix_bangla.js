const fs = require('fs');

function fixFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed++;
    } else {
      console.log('NOT FOUND in ' + filePath.split(/[\\/]/).pop() + ': ' + from.substring(0, 60));
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${changed}/${replacements.length} in ${filePath.split(/[\\/]/).pop()}`);
}

// === CreateSalesReturnModal.tsx ===
fixFile('./apps/web/src/components/sales/CreateSalesReturnModal.tsx', [
  // Fix Due Bill Return Policy title
  [
    'Due Bill Return Policy (\u09ac\u0995\u09c7\u09af\u09bc\u09be \u09ac\u09bf\u09b2 \u09b8\u09ae\u09a8\u09cd\u09ac\u09af\u09bc)',
    'Due Bill Return Policy'
  ],
  // Fix Bangla body line 1 (ইনভয়েসের বকেয়া...)
  [
    '\u098f\u0987 \u0987\u09a8\u09ad\u09af\u09bc\u09c7\u09b8\u09c7\u09b0 \u09ac\u0995\u09c7\u09af\u09bc\u09be <strong>\u09f3{currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>\u0964 ',
    'This invoice has an outstanding due of <strong>\u09f3{currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>. '
  ],
  // Fix Bangla body line 2 (নিয়ম অনুযায়ী...)
  [
    '\u09a8\u09bf\u09af\u09bc\u09ae \u0985\u09a8\u09c1\u09af\u09be\u09af\u09bc\u09c0 \u09b0\u09bf\u099f\u09be\u09b0\u09cd\u09a8\u09c7\u09b0 \u099f\u09be\u0995\u09be <strong>\u0995\u0996\u09a8\u09cb\u0987 \u0993\u09af\u09bc\u09be\u09b2\u09c7\u099f\u09c7 \u09af\u09cb\u0997 \u09b9\u09ac\u09c7 \u09a8\u09be</strong>, \u09a4\u09be \u09b8\u09b0\u09be\u09b8\u09b0\u09bf \u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09ac\u09be\u0995\u09bf \u09a5\u09c7\u0995\u09c7 \u09ac\u09be\u09a6 \u09af\u09be\u09ac\u09c7\u0964',
    'The return value will be applied directly to reduce the outstanding balance and <strong>will not be credited to the wallet</strong>.'
  ],
  // Fix Wallet Credit label
  [
    'Wallet Credit (\u0993\u09af\u09bc\u09be\u09b2\u09c7\u099f\u09c7 \u099c\u09ae\u09be)',
    'Wallet Credit'
  ],
  // Fix Fully Paid Invoice label
  [
    'Fully Paid Invoice (\u09aa\u09b0\u09bf\u09b6\u09cb\u09a7\u09bf\u09a4 \u09ac\u09bf\u09b2)',
    'Fully Paid Invoice'
  ],
  // Fix Bangla paragraph in fully paid section
  [
    '\u0987\u09a8\u09ad\u09af\u09bc\u09c7\u09b8\u099f\u09bf\u09a4\u09c7 \u0995\u09cb\u09a8\u09cb \u09ac\u0995\u09c7\u09af\u09bc\u09be \u09a8\u09c7\u0987\u0964 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09b0\u09bf\u099f\u09be\u09b0\u09cd\u09a8 \u09ae\u09c2\u09b2\u09cd\u09af \u0997\u09cd\u09b0\u09be\u09b9\u0995\u09c7\u09b0 \u0993\u09af\u09bc\u09be\u09b2\u09c7\u099f\u09c7 \u09b8\u09b0\u09be\u09b8\u09b0\u09bf \u09af\u09cb\u0997 \u09b9\u09ac\u09c7\u0964',
    "This invoice has no outstanding balance. The full return value will be credited directly to the customer's wallet."
  ],
]);

// === DirectSaleModal.tsx ===
fixFile('./apps/web/src/components/sales/DirectSaleModal.tsx', [
  // Fix Bangla stock error message (lines 420-422)
  [
    '`"${l.description || l.productId}" \u2014 \u0985\u09aa\u09b0\u09cd\u09af\u09be\u09aa\u09cd\u09a4 \u09b8\u09cd\u099f\u0995\u09cd\u09f7 ` +\n          `\u09b8\u09cd\u099f\u0995\u09c7 \u0986\u099b\u09c7: ${available}, \u099a\u09be\u09b9\u09bf\u09a6\u09be: ${l.quantity}. ` +\n          `(Insufficient stock: available ${available}, requested ${l.quantity}.)`',
    '`"${l.description || l.productId}" \u2014 Insufficient stock. Available: ${available}, Requested: ${l.quantity}.`'
  ],
  // Fix Bangla tooltip on quantity input (line 773)
  [
    '`\u0985\u09aa\u09b0\u09cd\u09af\u09be\u09aa\u09cd\u09a4 \u09b8\u09cd\u099f\u0995\u09cd\u09f7 \u09b8\u09cd\u099f\u0995\u09c7 \u0986\u099b\u09c7: ${line.availableStock ?? 0} \u099f\u09bf\u0964 (Insufficient stock: only ${line.availableStock ?? 0} available)`',
    '`Insufficient stock! Only ${line.availableStock ?? 0} unit(s) available.`'
  ],
]);

// === CustomerList.tsx ===
fixFile('./apps/web/src/components/customers/CustomerList.tsx', [
  [
    '<option value="SERVICE_ONLY">Service-Only (Module 72)</option>',
    '<option value="SERVICE_ONLY">Service-Only Customer</option>'
  ],
]);

// === CreateCustomerModal.tsx ===
fixFile('./apps/web/src/components/customers/CreateCustomerModal.tsx', [
  [
    '{/* Is Service Only (Module 72 Specification) */}',
    '{/* Is Service Only Customer */}'
  ],
  [
    '<span className="font-semibold text-ink block">Service-Only Customer (Module 72)</span>',
    '<span className="font-semibold text-ink block">Service-Only Customer</span>'
  ],
]);

// === CreateDamageLossModal.tsx ===
fixFile('./apps/web/src/components/inventory/CreateDamageLossModal.tsx', [
  [
    '<p className="text-caption text-text-muted mt-0.5">Module 74: Document damaged, expired, or written-off inventory</p>',
    '<p className="text-caption text-text-muted mt-0.5">Document damaged, expired, or written-off inventory items</p>'
  ],
]);

// === OrderFulfillmentModal.tsx - remove Module 73 comment ===
fixFile('./apps/web/src/components/sales/OrderFulfillmentModal.tsx', [
  [
    'Line-by-line fulfillment view per database-schema.md \u00a727 / Module 73',
    'Line-by-line fulfillment view for sales order dispatch'
  ],
]);

// Final verification
console.log('\n=== Verification ===');
const filesToCheck = [
  './apps/web/src/components/sales/CreateSalesReturnModal.tsx',
  './apps/web/src/components/sales/DirectSaleModal.tsx',
  './apps/web/src/components/customers/CustomerList.tsx',
  './apps/web/src/components/customers/CreateCustomerModal.tsx',
  './apps/web/src/components/inventory/CreateDamageLossModal.tsx',
  './apps/web/src/components/sales/OrderFulfillmentModal.tsx',
];
for (const f of filesToCheck) {
  const content = fs.readFileSync(f, 'utf8');
  const banglaLines = content.split('\n').filter(l => /[\u0981-\u09FF]/.test(l) && !/[\u09F3]/.test(l)); // exclude ৳ 
  const moduleLines = content.split('\n').filter((l, i) => /Module 7[0-9]/.test(l));
  if (banglaLines.length > 0) {
    console.log('BANGLA REMAINING in ' + f.split(/[\\/]/).pop() + ':');
    banglaLines.forEach(l => console.log('  ' + l.trim()));
  }
  if (moduleLines.length > 0) {
    console.log('MODULE REF in ' + f.split(/[\\/]/).pop() + ':');
    moduleLines.forEach(l => console.log('  ' + l.trim()));
  }
  if (banglaLines.length === 0 && moduleLines.length === 0) {
    console.log('CLEAN: ' + f.split(/[\\/]/).pop());
  }
}
