import type { ApiError } from "@/types/api";

/**
 * Spanish, safe-to-show messages for a failed Renova call — never a raw
 * exception or anything the user typed (in particular, never NSS / credit
 * number, which the backend also never echoes). Renova's UI is Spanish on
 * purpose (see features/renova/types.ts); the rest of the app's shared
 * getApiErrorMessage stays English.
 */
export function getRenovaErrorMessage(error: ApiError): string {
  if (error.status === 401 || error.status === 403) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (error.status === 404) return "No se encontró el registro o el asesor seleccionado.";
  if (error.status === 422) return "Revisa los datos capturados: alguno no es válido.";
  if (error.status === 503) {
    return "El cifrado de NSS y número de crédito no está configurado en el servidor. Guarda el expediente sin esos dos datos o avisa al administrador.";
  }
  if (error.code === "timeout") return "La solicitud tardó demasiado. Inténtalo de nuevo.";
  if (error.status === undefined) return "No se pudo conectar con el servidor. Revisa tu conexión.";
  return "Algo salió mal. Inténtalo de nuevo.";
}

/**
 * The backend has no endpoint that lists an organization's users (and the
 * `users` table has no names — those live in Supabase Auth), so the ONLY
 * advisor identity the UI can honestly name is the signed-in user. Any other
 * advisor id is shown generically rather than invented.
 */
export function advisorLabel(assignedUserId: string | null, currentUserId: string | undefined): string {
  if (!assignedUserId) return "Sin asignar";
  if (assignedUserId === currentUserId) return "Yo";
  return "Otro asesor";
}
