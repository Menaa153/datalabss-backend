const express = require("express")
const supabase = require("../services/supabaseClient")

const router = express.Router()


// crear solicitud de firma
router.post("/solicitar", async (req, res) => {
  try {

    const {
      tipo_tramite,
      numero_documento,
      nombre_persona
    } = req.body

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
      console.log("ERROR CREAR SOLICITUD:", error)
      return res.status(500).json({ error: "No se pudo crear la solicitud de firma" })
    }

    res.json(data)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno creando solicitud de firma" })
  }
})


// obtener ultima solicitud pendiente
router.get("/pendiente/ultima", async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("solicitudes_firma")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.log("ERROR BUSCANDO PENDIENTE:", error)
      return res.status(500).json({ error: "Error consultando solicitud pendiente" })
    }

    res.json(data || null)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno consultando solicitud pendiente" })
  }
})


// consultar una solicitud por id
router.get("/:id", async (req, res) => {
  try {

    const { id } = req.params

    const { data, error } = await supabase
      .from("solicitudes_firma")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.log("ERROR CONSULTANDO SOLICITUD:", error)
      return res.status(404).json({ error: "Solicitud no encontrada" })
    }

    res.json(data)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno consultando solicitud" })
  }
})


// finalizar solicitud y guardar firma
router.put("/:id/finalizar", async (req, res) => {
  try {

    const { id } = req.params
    const { firma_base64 } = req.body

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
      console.log("ERROR GUARDANDO FIRMA:", error)
      return res.status(500).json({ error: "No se pudo guardar la firma" })
    }

    res.json(data)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno guardando firma" })
  }
})


// cancelar solicitud
router.put("/:id/cancelar", async (req, res) => {
  try {

    const { id } = req.params

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
      console.log("ERROR CANCELANDO SOLICITUD:", error)
      return res.status(500).json({ error: "No se pudo cancelar la solicitud" })
    }

    res.json(data)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno cancelando solicitud" })
  }
})

module.exports = router