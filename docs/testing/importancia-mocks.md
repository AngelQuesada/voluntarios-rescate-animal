# Importancia de los Mocks en Tests Unitarios

## ¿Qué son los Mocks?

Los mocks son objetos simulados que reemplazan dependencias reales durante la ejecución de tests. Estos objetos imitan el comportamiento de las dependencias reales pero de manera controlada, permitiendo aislar el componente bajo prueba.

## ¿Por qué son importantes?

### 1. Aislamiento de componentes

Los mocks permiten probar un componente de forma aislada, sin depender del comportamiento de sus dependencias. Esto facilita identificar exactamente dónde está el problema cuando un test falla.

```typescript
// Sin mock (dependencia real)
function testFunction() {
  const result = dependencyFunction(); // Podría fallar por razones ajenas a testFunction
  return processResult(result);
}

// Con mock (dependencia simulada)
const mockDependency = jest.fn().mockReturnValue('resultado controlado');
jest.mock('./dependency', () => ({
  dependencyFunction: () => mockDependency(),
}));
```

### 2. Evitar dependencias externas

Los mocks evitan la necesidad de conectarse a servicios externos como bases de datos, APIs o servicios en la nube durante los tests, lo que podría causar:

- Tests lentos
- Tests inestables (dependientes de la disponibilidad del servicio)
- Costos innecesarios (en el caso de servicios de pago)
- Contaminación de datos reales

### 3. Tests más rápidos y confiables

Al no depender de servicios externos o procesos lentos, los tests con mocks se ejecutan más rápido y son más confiables, ya que no están sujetos a problemas de red, latencia o indisponibilidad de servicios.

### 4. Simulación de escenarios

Los mocks permiten simular fácilmente diferentes escenarios, incluyendo casos de éxito, errores y casos límite, sin necesidad de configurar complejos entornos de prueba.

```typescript
// Simular éxito
mockFunction.mockResolvedValueOnce({ success: true, data: [...] });

// Simular error
mockFunction.mockRejectedValueOnce(new Error('Error simulado'));

// Simular timeout
mockFunction.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 10000)));
```

## Ejemplo Práctico: Mocking de Firebase

En nuestro proyecto, hemos implementado mocks para Firebase/Firestore para evitar problemas de timeout y dependencias externas:

```typescript
// Mock de Firebase Firestore
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

Este enfoque nos permite:

1. Evitar conexiones reales a Firebase durante los tests
2. Controlar el comportamiento de las funciones de Firebase
3. Simular diferentes escenarios (éxito, error, etc.)
4. Ejecutar tests más rápidos y confiables

## Mejores Prácticas con Jest

### 1. Usar `jest.mock()` para módulos completos

```typescript
jest.mock('./modulo-a-mockear', () => ({
  funcionA: jest.fn(),
  funcionB: jest.fn(),
}));
```

### 2. Crear funciones mock con implementaciones específicas

```typescript
const mockFunction = jest.fn().mockImplementation((arg1, arg2) => {
  if (arg1 === 'caso-especial') {
    return 'resultado-especial';
  }
  return 'resultado-normal';
});
```

### 3. Limpiar mocks entre tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 4. Verificar llamadas a mocks

```typescript
expect(mockFunction).toHaveBeenCalledTimes(1);
expect(mockFunction).toHaveBeenCalledWith('argumento-esperado');
```

## Conclusión

Los mocks son una herramienta fundamental en los tests unitarios, permitiendo crear tests más rápidos, confiables y aislados. En nuestro proyecto, el uso adecuado de mocks para Firebase ha sido clave para resolver problemas de timeout y mejorar la calidad de nuestros tests.