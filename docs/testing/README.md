# Documentación de Testing

Esta carpeta contiene documentación relacionada con las prácticas de testing en el proyecto de Rescate Animal Voluntariado.

## Contenido

### [Mocking de Firebase en Tests](./firebase-mocking.md)

Documentación sobre cómo implementar correctamente mocks para Firebase en los tests unitarios, incluyendo:

- Solución al problema de timeout en `useShiftActions.test.ts`
- Patrón de mocking para Firebase/Firestore
- Consideraciones importantes para el mockeo de Firebase

### [Importancia de los Mocks en Tests Unitarios](./importancia-mocks.md)

Explicación detallada sobre por qué los mocks son fundamentales en los tests unitarios:

- Qué son los mocks y para qué sirven
- Beneficios de usar mocks (aislamiento, evitar dependencias externas, etc.)
- Ejemplos prácticos con Jest
- Mejores prácticas para el uso de mocks

### [Manejo de Timeouts en Tests de Jest](./manejo-timeouts-jest.md)

Guía sobre cómo manejar y solucionar problemas de timeout en tests de Jest:

- Causas comunes de timeouts
- Soluciones para manejar timeouts
- Caso práctico: Solución al timeout en `useShiftActions.test.ts`

### [Configuración de Jest en el Proyecto](./configuracion-jest.md)

Documentación detallada sobre la configuración de Jest en el proyecto:

- Archivos de configuración (jest.config.js, jest.setup.js)
- Configuración de TypeScript para tests
- Declaraciones de tipos para matchers personalizados
- Ejecución de tests y mejores prácticas

## Problemas Comunes y Soluciones

### Timeouts en Tests

Si encuentras problemas de timeout en tus tests, especialmente cuando interactúan con Firebase u otros servicios externos, consulta la documentación sobre [Manejo de Timeouts en Tests de Jest](./manejo-timeouts-jest.md) y [Mocking de Firebase en Tests](./firebase-mocking.md).

### Tests Lentos o Inestables

Si tus tests son lentos o inestables, es posible que necesites mejorar tu estrategia de mocking. Consulta la documentación sobre [Importancia de los Mocks en Tests Unitarios](./importancia-mocks.md) para obtener consejos sobre cómo implementar mocks efectivos.

## Contribución a la Documentación

Si encuentras problemas no documentados o tienes soluciones para compartir, por favor considera contribuir a esta documentación siguiendo estos pasos:

1. Crea un nuevo archivo markdown en la carpeta correspondiente
2. Actualiza este README.md para incluir un enlace a tu nueva documentación
3. Asegúrate de que tu documentación sea clara, concisa y contenga ejemplos prácticos