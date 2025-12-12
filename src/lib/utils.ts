// Utilidades generales para la aplicación
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a un formato legible
 * @param date Fecha a formatear (string o Date)
 * @returns Fecha formateada como string
 */
export function formatDate(date: string | Date): string {
  if (!date) return 'Fecha no disponible';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy', { locale: es });
}

/**
 * Calcula la edad basada en la fecha de nacimiento
 * @param birthDate Fecha de nacimiento (string o Date)
 * @returns Edad en años como number
 */
export function calculateAge(birthDate: string | Date): number {
  if (!birthDate) return 0;

  const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();

  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }

  return age;
}
