import type { ApiError } from "@/types/api";

/**
 * Spanish, safe-to-show messages for a failed Renova call — never a raw
 * exception or anything the user typed (in particular, never NSS / credit
 * number, which the backend also never echoes). Renova's UI is Spanish on
 * purpose (see features/renova/types.ts); the rest of the app's shared
 * getApiErrorMessage stays English.
 */
export const ENCRYPTION_NOT_CONFIGURED_MESSAGE =
  "El servidor todavía no puede proteger estos datos. Configura la clave de cifrado antes de guardar NSS o número de crédito.";

export function getRenovaErrorMessage(error: ApiError): string {
  if (error.status === 401 || error.status === 403) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (error.status === 404) return "No se encontró el registro o el asesor seleccionado.";
  if (error.status === 422) return "Revisa los datos capturados: alguno no es válido.";
  if (error.status === 503) return ENCRYPTION_NOT_CONFIGURED_MESSAGE;
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

/** Messages for a failed "Mostrar datos protegidos" — never anything the server returned besides the status. */
export function getRevealErrorMessage(error: ApiError): string {
  if (error.status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (error.status === 403) return "No tienes permiso para consultar los datos protegidos de este expediente.";
  if (error.status === 404) return "No se encontró el expediente.";
  if (error.status === 409) return "No se pudieron descifrar los datos protegidos con la clave configurada. Avisa al administrador.";
  if (error.status === 503) return "El servidor todavía no puede descifrar estos datos. Falta configurar la clave de cifrado.";
  if (error.code === "timeout") return "La solicitud tardó demasiado. Inténtalo de nuevo.";
  if (error.status === undefined) return "No se pudo conectar con el servidor. Revisa tu conexión.";
  return "No se pudieron consultar los datos protegidos. Inténtalo de nuevo.";
}
