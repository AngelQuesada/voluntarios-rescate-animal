const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE_PATH = path.join(__dirname, '../seeds/users.json');
const SHIFTS_FILE_PATH = path.join(__dirname, '../seeds/shifts.json');

// --- Helper Functions ---

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUid() {
  return crypto.randomUUID();
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// --- Data Generation ---

const NAMES = [
  'Carlos',
  'Maria',
  'Juan',
  'Sofia',
  'Luis',
  'Ana',
  'Pedro',
  'Laura',
  'Miguel',
  'Elena',
  'Jorge',
  'Lucia',
  'Pablo',
  'Carmen',
  'Daniel',
  'Paula',
  'Alejandro',
  'Marta',
  'David',
  'Andrea',
];
const LASTNAMES = [
  'Garcia',
  'Rodriguez',
  'Gonzalez',
  'Fernandez',
  'Lopez',
  'Martinez',
  'Sanchez',
  'Perez',
  'Gomez',
  'Martin',
  'Jimenez',
  'Ruiz',
  'Hernandez',
  'Diaz',
  'Moreno',
  'Muñoz',
  'Alvarez',
  'Romero',
  'Alonso',
  'Gutierrez',
];
const JOBS = [
  'Estudiante',
  'Ingeniero',
  'Profesor',
  'Médico',
  'Enfermero',
  'Abogado',
  'Arquitecto',
  'Diseñador',
  'Programador',
  'Psicólogo',
  'Veterinario',
  'Contable',
  'Administrativo',
  'Comercial',
  'Mecánico',
  'Electricista',
  'Fontanero',
  'Carpintero',
  'Cocinero',
  'Camarero',
];
const LOCATIONS = [
  'Granada',
  'Madrid',
  'Barcelona',
  'Sevilla',
  'Valencia',
  'Málaga',
  'Bilbao',
  'Zaragoza',
  'Murcia',
  'Palma',
];

function generateRandomUser(index) {
  const name = randomElement(NAMES);
  const lastName = randomElement(LASTNAMES);
  const userName = `${name.toLowerCase().substring(0, 1)}${lastName.toLowerCase()}${randomInt(100, 999)}`;
  const roleChance = Math.random();
  let roles = [1];
  if (roleChance > 0.85) roles = [1, 2]; // 15% chance of being role 2 (Shift Manager)
  if (roleChance > 0.98) roles = [1, 3]; // 2% chance of being role 3 (Admin)

  return {
    uid: generateUid(),
    userName: userName,
    name: name,
    lastName: lastName,
    birthDate: `${randomInt(1970, 2005)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
    email: `${userName}@generated.com`,
    phone: `6${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}${randomInt(0, 9)}`,
    job: randomElement(JOBS),
    location: randomElement(LOCATIONS),
    roles: roles,
    isEnabled: true,
  };
}

// --- Main Script ---

try {
  console.log('--- Generando datos de semilla ---');

  // 1. Read existing users
  let users = [];
  if (fs.existsSync(USERS_FILE_PATH)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE_PATH, 'utf8'));
  }
  console.log(`Usuarios existentes: ${users.length}`);

  // 2. Add UIDs to existing users if missing
  let updatedUsersCount = 0;
  users = users.map((user) => {
    if (!user.uid) {
      // Create a deterministic-ish UID or random one. Random is safer for uniqueness now.
      user.uid = generateUid();
      updatedUsersCount++;
    }
    return user;
  });
  if (updatedUsersCount > 0)
    console.log(`Se añadieron UIDs a ${updatedUsersCount} usuarios existentes.`);

  // 3. Generate 20 new users
  console.log('Generando 20 usuarios nuevos...');
  for (let i = 0; i < 20; i++) {
    users.push(generateRandomUser(i));
  }

  // Write updated users.json
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  console.log(`seeds/users.json actualizado. Total usuarios: ${users.length}`);

  // 4. Generate Shifts
  console.log('Generando turnos...');
  const today = new Date();
  // Clear time part for accurate date comparison
  today.setHours(0, 0, 0, 0);

  const threeMonthsAgo = addMonths(today, -3);
  const thirtyDaysAhead = addDays(today, 30);

  const shifts = [];

  // Helper to find specific roles
  // Role 2 is Responsable (Shift Manager)
  const shiftManagers = users.filter((u) => u.roles.includes(2));
  const allVolunteers = users; // All users can be volunteers

  let currentDate = new Date(threeMonthsAgo);

  while (currentDate <= thirtyDaysAhead) {
    const dateString = formatDate(currentDate);
    const isPast = currentDate < today;

    // Shifts per day: Morning (M) and Afternoon (T)
    for (const shiftType of ['M', 'T']) {
      let shiftAssignments = [];
      let numPeople = 0;

      if (isPast) {
        // Past: 3-5 users, at least one role 2
        numPeople = randomInt(3, 5);

        // Ensure at least one manager
        const manager = randomElement(shiftManagers);
        if (manager) {
          shiftAssignments.push({ uid: manager.uid });
        }

        // Fill the rest
        while (shiftAssignments.length < numPeople) {
          const randomUser = randomElement(allVolunteers);
          if (!shiftAssignments.find((a) => a.uid === randomUser.uid)) {
            shiftAssignments.push({ uid: randomUser.uid });
          }
        }
      } else {
        // Future (or today): 0-5 users
        // Although the prompt says "desde que se popula ... a los siguientes 30 días" (Future) -> 0-5 people.

        numPeople = randomInt(0, 5);
        while (shiftAssignments.length < numPeople) {
          const randomUser = randomElement(allVolunteers);
          if (!shiftAssignments.find((a) => a.uid === randomUser.uid)) {
            shiftAssignments.push({ uid: randomUser.uid });
          }
        }
      }

      const shiftId = `${dateString}_${shiftType}`;
      shifts.push({
        id: shiftId,
        date: dateString,
        shift: shiftType,
        assignments: shiftAssignments,
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  // Write shifts.json
  fs.writeFileSync(SHIFTS_FILE_PATH, JSON.stringify(shifts, null, 2));
  console.log(`seeds/shifts.json creado. Total turnos: ${shifts.length}`);
} catch (error) {
  console.error('Error generando datos:', error);
  process.exit(1);
}
