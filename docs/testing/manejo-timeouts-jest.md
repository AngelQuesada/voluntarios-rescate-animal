# Manejo de Timeouts en Tests de Jest

## Problema: Tests que Exceden el Tiempo Límite

Uno de los problemas comunes en tests de Jest, especialmente cuando se trabaja con operaciones asíncronas o servicios externos como Firebase, es el timeout de los tests. Por defecto, Jest establece un límite de tiempo de 5000 ms (5 segundos) para cada test, y si un test tarda más que este límite, Jest lo marca como fallido con un error de timeout.

```
Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
```

## Causas Comunes de Timeouts

### 1. Operaciones asíncronas no resueltas

La causa más común de timeouts es cuando una promesa o callback asíncrono nunca se resuelve o rechaza, dejando el test en espera indefinida.

```typescript
// Ejemplo de código que puede causar timeout
test('operación asíncrona', async () => {
  await someAsyncFunction(); // Si esta función nunca resuelve, el test excederá el tiempo límite
});
```

### 2. Interacción con servicios externos no mockeados

Cuando los tests interactúan con servicios externos como Firebase, bases de datos o APIs sin el mockeo adecuado, pueden ocurrir timeouts debido a:

- Latencia de red
- Servicios no disponibles
- Credenciales incorrectas
- Límites de tasa (rate limits)

### 3. Bucles infinitos o lógica incorrecta

Errores en la lógica del código, como bucles infinitos, también pueden causar timeouts en los tests.

## Soluciones para Manejar Timeouts

### 1. Mockear dependencias externas

La solución más efectiva es mockear todas las dependencias externas para tener control total sobre su comportamiento y tiempos de respuesta.

```typescript
// Ejemplo de mockeo de Firebase (como implementamos en nuestro proyecto)
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });

jest.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  // Otros mocks necesarios
}));
```

### 2. Ajustar el límite de tiempo

Si es necesario, se puede aumentar el límite de tiempo para tests específicos o para todos los tests:

```typescript
// Para un test específico
test('test que requiere más tiempo', async () => {
  jest.setTimeout(10000); // 10 segundos
  // Código del test
});

// Para todos los tests en un archivo
beforeAll(() => {
  jest.setTimeout(10000); // 10 segundos
});

// Para todos los tests en el proyecto (en jest.config.js)
module.exports = {
  testTimeout: 10000, // 10 segundos
};
```

### 3. Usar timeouts explícitos para promesas

Para evitar esperas indefinidas, se pueden implementar timeouts explícitos para promesas:

```typescript
const promiseWithTimeout = (promise, timeoutMs) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operación excedió el tiempo límite de ${timeoutMs} ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

test('operación con timeout explícito', async () => {
  await promiseWithTimeout(someAsyncFunction(), 2000);
});
```

### 4. Verificar la correcta implementación de async/await

Asegurarse de que todas las funciones asíncronas estén correctamente implementadas con async/await o then/catch:

```typescript
// Incorrecto (puede causar timeout)
test('test asíncrono incorrecto', () => {
  someAsyncFunction(); // No se espera a que la promesa se resuelva
});

// Correcto
test('test asíncrono correcto', async () => {
  await someAsyncFunction();
});
```

## Caso Práctico: Solución al Timeout en useShiftActions.test.ts

En nuestro proyecto, enfrentamos un problema de timeout en el test `should execute modify shift successfully for remove action` del archivo `useShiftActions.test.ts`. El problema ocurría porque la función `addDoc` de Firestore no estaba correctamente mockeada, causando que el test esperara indefinidamente por una respuesta.

La solución implementada fue:

1. Mockear completamente el módulo `firebase/firestore`:

```typescript
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockCollection = jest.fn().mockReturnValue('mocked-collection');

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  addDoc: (...args) => mockAddDoc(...args),
  initializeFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn().mockReturnValue({
      toDate: jest.fn().mockReturnValue(new Date()),
    }),
  },
}));
```

2. Mockear el módulo `@/lib/firebase` para evitar la inicialización real de Firebase:

```typescript
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));
```

Con estas implementaciones, el test ahora se ejecuta correctamente sin exceder el límite de tiempo.

## Conclusión

Los timeouts en tests de Jest son un problema común, especialmente cuando se trabaja con operaciones asíncronas y servicios externos. La solución más efectiva es mockear adecuadamente todas las dependencias externas para tener control total sobre su comportamiento y tiempos de respuesta. En casos específicos, también puede ser útil ajustar el límite de tiempo o implementar timeouts explícitos para promesas.