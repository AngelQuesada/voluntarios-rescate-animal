import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(): Promise<Response> {
  console.log('Service Worker request received.');

  try {
    const cwd = process.cwd();
    const templatePath = path.join(cwd, 'src', 'lib', 'firebase-messaging-sw.template.js');
    console.log('Attempting to read template from:', templatePath);

    const requiredEnv = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    ];

    const missingEnv = requiredEnv.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
      const errorMessage = `Missing required environment variables for Firebase Service Worker: ${missingEnv.join(', ')}`;
      console.error(errorMessage);
      return new NextResponse(errorMessage, {
        status: 500,
        statusText: 'Server Configuration Error',
      });
    }

    let fileContent = await fs.readFile(templatePath, 'utf8');

    const replacements = {
      'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      ),
      'process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID': JSON.stringify(
        process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
      ),
    };

    Object.entries(replacements).forEach(([key, value]) => {
      fileContent = fileContent.replace(new RegExp(key, 'g'), value);
    });

    return new Response(fileContent, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
      },
    });
  } catch (error: Error | unknown) {
    const errorMessage = `Fallo al generar service workser: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, {
      stack: error instanceof Error ? error.stack : 'No hay stack trace disponible',
    });
    return new NextResponse(errorMessage, { status: 500, statusText: 'Internal Server Error' });
  }
}
