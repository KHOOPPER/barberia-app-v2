/**
 * @fileoverview Validador de fuerza de contraseñas
 * @module utils/passwordValidator
 * 
 * Implementa validación de fuerza de contraseñas para mejorar la seguridad
 * del sistema, asegurando que las contraseñas cumplan con requisitos mínimos
 * de complejidad.
 */

/**
 * Valida la fuerza de una contraseña
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos un carácter especial (opcional pero recomendado)
 * 
 * @param {string} password - Contraseña a validar
 * @returns {{ isValid: boolean, errors: string[] }} - Resultado de la validación
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      errors: ["La contraseña es requerida"],
    };
  }

  // Mínimo 8 caracteres
  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }

  // Máximo 128 caracteres (límite razonable)
  if (password.length > 128) {
    errors.push("La contraseña no puede exceder 128 caracteres");
  }

  // Al menos una letra mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra mayúscula");
  }

  // Al menos una letra minúscula
  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra minúscula");
  }

  // Al menos un número
  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }

  // Al menos un carácter especial (recomendado pero no obligatorio)
  // Caracteres especiales comunes: !@#$%^&*()_+-=[]{}|;:,.<>?
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push(
      "Se recomienda que la contraseña contenga al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)"
    );
  }

  // Verificar que no contenga espacios
  if (/\s/.test(password)) {
    errors.push("La contraseña no puede contener espacios");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida la fuerza de una contraseña y lanza un error si no cumple los requisitos
 * @param {string} password - Contraseña a validar
 * @throws {Error} Si la contraseña no cumple los requisitos
 */
export function validatePasswordStrengthOrThrow(password) {
  const result = validatePasswordStrength(password);
  
  if (!result.isValid) {
    // Si solo tiene la advertencia de caracteres especiales, permitirla (es solo una recomendación)
    const criticalErrors = result.errors.filter(
      (error) => !error.includes("Se recomienda")
    );
    
    if (criticalErrors.length > 0) {
      throw new Error(criticalErrors.join(". "));
    }
  }
}
