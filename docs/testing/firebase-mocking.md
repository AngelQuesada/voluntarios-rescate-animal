# Mocking de Firebase en Tests

## Problema: Timeout en Tests con Firebase

En el proyecto se identificó un problema de timeout en el test `useShiftActions.test.ts`, específicamente en el test `should execute modify shift successfully for remove action`. El error ocurría en la línea 131 de `useShiftActions.ts`, donde se realiza una llamada a `addDoc` de Firestore para registrar acciones de usuario.

```typescript
await addDoc(collection(db, 'userActions'), actionToLog);
```

El test excedía el límite de tiempo de 5000 ms porque la operación de Firestore `addDoc` no estaba siendo mockeada correctamente, causando que el test esperara indefinidamente por una respuesta.

## Solución Implementada

Se implementó un mock completo para las funciones de Firebase/Firestore utilizadas en el código:

```typescript
// Mock de Firebase Firestore
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockCollection = jest.fn().mockReturnValue('mocked-collection');

// Mock de Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

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

Esta solución asegura que:

1. La función `addDoc` devuelve una promesa resuelta con un ID de documento simulado.
2. La función `collection` devuelve un valor simulado.
3. Se mockea `initializeFirestore` para evitar errores de inicialización.
4. Se mockea `Timestamp.now()` para que devuelva un objeto con método `toDate()` que retorna una fecha válida.
5. Se mockea el módulo `@/lib/firebase` para evitar la inicialización real de Firebase durante los tests.

## Patrón de Mocking para Firebase

Para evitar problemas similares en otros tests, se recomienda seguir este patrón de mocking para Firebase:

1. **Mockear el módulo de Firebase**:
   ```typescript
   jest.mock('@/lib/firebase', () => ({
     db: {},
     auth: {},
     // Otros objetos según sea necesario
   }));
   ```

2. **Mockear las funciones específicas de Firestore**:
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
     // Otras funciones según sea necesario
   }));
   ```

3. **Limpiar los mocks antes de cada test**:
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

## Consideraciones Importantes

- Siempre mockear todas las funciones de Firebase que se utilizan en el código bajo prueba.
- Asegurarse de que las funciones mockeadas devuelvan valores que simulen correctamente el comportamiento esperado.
- Para operaciones asíncronas como `addDoc`, usar `mockResolvedValue` para devolver una promesa resuelta.
- Para funciones que devuelven objetos complejos como `Timestamp`, asegurarse de mockear también los métodos internos que se utilizan.

Siguiendo estas prácticas, se evitarán timeouts y otros problemas relacionados con la interacción con Firebase en los tests.