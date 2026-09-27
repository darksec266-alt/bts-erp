const fs = require('fs');

const file = 'apps/api/src/modules/service/infrastructure/prisma-service-repository.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add mapEmployee and mapSerialNumber helpers before class PrismaServiceRepository
const helpers = `
function mapEmployee(e: AnyPrisma) {
  if (!e) return undefined;
  const fullName = e.fullName || \`\${e.firstName || ""} \${e.lastName || ""}\`.trim();
  const parts = fullName.split(" ");
  const firstName = e.firstName || parts[0] || "";
  const lastName = e.lastName || parts.slice(1).join(" ") || "";
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    fullName,
    firstName,
    lastName,
  };
}

function mapSerialNumber(s: AnyPrisma) {
  if (!s) return null;
  return {
    id: s.id,
    serialNumber: s.serial || s.serialNumber || "",
    product: s.product,
  };
}
`;

if (!code.includes('function mapEmployee')) {
  code = code.replace('export class PrismaServiceRepository implements ServiceRepository {', helpers + '\nexport class PrismaServiceRepository implements ServiceRepository {');
}

// 2. In select clauses, replace employee selects:
// { select: { id: true, employeeCode: true, firstName: true, lastName: true, phone: true } } -> { select: { id: true, employeeCode: true, fullName: true } }
// { select: { id: true, employeeCode: true, firstName: true, lastName: true } } -> { select: { id: true, employeeCode: true, fullName: true } }
code = code.replace(/select:\s*\{\s*id:\s*true,\s*employeeCode:\s*true,\s*firstName:\s*true,\s*lastName:\s*true,\s*phone:\s*true\s*\}/g, 'select: { id: true, employeeCode: true, fullName: true }');
code = code.replace(/select:\s*\{\s*id:\s*true,\s*employeeCode:\s*true,\s*firstName:\s*true,\s*lastName:\s*true\s*\}/g, 'select: { id: true, employeeCode: true, fullName: true }');

// 3. In select clauses, replace serialNumber selects:
// serialNumber: { select: { id: true, serialNumber: true } } -> serialNumber: { select: { id: true, serial: true } }
code = code.replace(/serialNumber:\s*\{\s*select:\s*\{\s*id:\s*true,\s*serialNumber:\s*true\s*\}\s*\}/g, 'serialNumber: { select: { id: true, serial: true } }');

// serialNumber: true inside serialNumber: { select: { id: true, serialNumber: true, product: ... } }
code = code.replace(/serialNumber:\s*\{\s*select:\s*\{\s*id:\s*true,\s*serialNumber:\s*true,\s*product:/g, 'serialNumber: {\n          select: {\n            id: true,\n            serial: true,\n            product:');

// In warranty filter:
// where.serialNumber = { serialNumber: { contains: filter.search, mode: "insensitive" } };
code = code.replace(/where\.serialNumber\s*=\s*\{\s*serialNumber:\s*\{\s*contains:\s*filter\.search/g, 'where.serialNumber = { serial: { contains: filter.search');

// In mapTicket:
code = code.replace(
  'serialNumber: t.serialNumber,',
  'serialNumber: mapSerialNumber(t.serialNumber),'
);

// In mapCustody:
code = code.replace(
  'serialNumber: c.serialNumber,',
  'serialNumber: mapSerialNumber(c.serialNumber),'
);
code = code.replace(
  'custodian: c.custodian,',
  'custodian: mapEmployee(c.custodian),'
);

// In mapAssignment:
code = code.replace(
  'technician: t.technician,',
  'technician: mapEmployee(t.technician),'
);
code = code.replace(
  'technician: ad.technician,',
  'technician: mapEmployee(ad.technician),'
);
code = code.replace(
  'technician: cv.technician,',
  'technician: mapEmployee(cv.technician),'
);
code = code.replace(
  'employee: l.employee,',
  'employee: mapEmployee(l.employee),'
);

// In warranty returns:
code = code.replace(
  'serialNumber: created.serialNumber,',
  'serialNumber: mapSerialNumber(created.serialNumber),'
);
code = code.replace(
  'serialNumber: warranty.serialNumber,',
  'serialNumber: mapSerialNumber(warranty.serialNumber),'
);
code = code.replace(
  'serialNumber: w.serialNumber,',
  'serialNumber: mapSerialNumber(w.serialNumber),'
);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated prisma-service-repository.ts');
