import { supabase } from "./supabaseClient"

//crear una solicitud de firma desde el formulario

export const crearSolicitudFirma = async ({
  tipo_tramite,
  numero_documento,
  nombre_persona
}) => {

  const { data, error } = await supabase
    .from("solicitudes_firma")
    .insert([{
      tipo_tramite,
      numero_documento,
      nombre_persona,
      estado: "pendiente"
    }])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}


// consultar una solicitud específica por id
 
export const obtenerSolicitudFirma = async (id) => {

  const { data, error } = await supabase
    .from("solicitudes_firma")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return data
}



// Buscar la solicitud pendiente más antigua, esto lo usa la "tablet"

export const obtenerSolicitudPendiente = async () => {

  const { data, error } = await supabase
    .from("solicitudes_firma")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}


// guardar la firma hecha en el dispositivo

export const guardarFirmaSolicitud = async (id, firma_base64) => {

  const { data, error } = await supabase
    .from("solicitudes_firma")
    .update({
      firma_base64,
      estado: "firmada",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Cancelar solicitud desde formulario
 
export const cancelarSolicitudFirma = async (id) => {

  const { data, error } = await supabase
    .from("solicitudes_firma")
    .update({
      estado: "cancelada",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}