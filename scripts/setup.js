const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const admin = require('firebase-admin');

// Configuration
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

function checkEnv() {
  console.log('🔍 Checking environment variables...');
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
  }

  const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }
  console.log('✅ Environment variables check passed.');
}

function installDependencies() {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('✅ Dependencies installed.');
  } catch (error) {
    console.error('❌ Failed to install dependencies.');
    process.exit(1);
  }
}

function runSeeds() {
  console.log('🌱 Running seeds...');
  try {
    // Run create_users.ts
    console.log('running create_users.ts...');
    execSync('npx ts-node scripts/create_users.ts', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    // Run create-shifts.ts
    console.log('running create-shifts.ts...');
    execSync('npx ts-node scripts/create-shifts.ts', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    console.log('✅ Seeds executed successfully.');
  } catch (error) {
    console.error('❌ Failed to run seeds.', error);
    process.exit(1);
  }
}

async function setDefaultSettings() {
  console.log('⚙️ Setting default configurations...');
  try {
    // Initialize Firebase Admin
    if (admin.apps.length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY is missing');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    const db = admin.firestore();
    const settingsRef = db.collection('settings').doc('notifications');

    await settingsRef.set(
      {
        day: 'friday',
        time: '19:00',
      },
      { merge: true }
    );

    console.log('✅ Default settings applied (settings/notifications).');
  } catch (error) {
    console.error('❌ Failed to set default settings:', error);
    process.exit(1);
  }
}

async function startDev() {
  console.log('🚀 Starting project...');

  // We use spawn to keep the process running and inherit IO
  const child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });

  child.on('error', (err) => {
    console.error('❌ Failed to start project:', err);
  });
}

async function main() {
  console.log('🛠️  Starting Project Setup 🛠️');
  console.log('================================');

  checkEnv();
  installDependencies();
  runSeeds();
  await setDefaultSettings();

  console.log('================================');
  console.log('✨ Setup completed successfully!');

  await startDev();
}

main();
