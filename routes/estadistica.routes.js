const express = require("express")
//const fs = require("fs")
//const path = require("path")
//const { PDFDocument } = require("pdf-lib")
const supabase = require("../services/supabaseClient")
const router = express.Router()


// consulta de los dos primeros meses sobre los tramites
router.get("/estadisticas", async (req, res) => {
  try {
    const { desde, hasta } = req.query

    if (!desde || !hasta) {
      return res.status(400).json({ error: "Faltan parámetros desde y hasta" })
    }

    const { data, error } = await supabase
      .from("tramites_eps")
      .select("tipo_tramite, fecha")
      .gte("fecha", desde)
      .lte("fecha", hasta)

    if (error) {
      console.log("ERROR SUPABASE:", error)
      return res.status(500).json({ error: "Error consultando estadísticas" })
    }

    const agrupado = {}

    data.forEach(item => {
      const tipo = item.tipo_tramite || "Sin tipo"
      agrupado[tipo] = (agrupado[tipo] || 0) + 1
    })

    const resultado = Object.entries(agrupado)
      .map(([tipo_tramite, total]) => ({
        tipo_tramite,
        total
      }))
      .sort((a, b) => a.tipo_tramite.localeCompare(b.tipo_tramite))

    res.json(resultado)

  } catch (error) {
    console.log("ERROR EN /estadisticas:", error)
    res.status(500).json({ error: "Error estadísticas" })
  }
})

// consulta tramites por mes
router.get("/estadisticas-mensual", async (req, res) => {
  try {
    const { desde, hasta } = req.query

    if (!desde || !hasta) {
      return res.status(400).json({ error: "Faltan parámetros" })
    }

    const { data, error } = await supabase
      .from("tramites_eps")
      .select("tipo_tramite, fecha")
      .gte("fecha", desde)
      .lte("fecha", hasta)

    if (error) throw error

    // agrupar por mes + tipo
    const resultado = {}

    data.forEach(item => {
      const fecha = new Date(item.fecha)
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
      const tipo = item.tipo_tramite || "sin_tipo"

      if (!resultado[mes]) {
        resultado[mes] = {
          afiliacion: 0,
          traslado: 0,
          portabilidad: 0
        }
      }

      if (resultado[mes][tipo] !== undefined) {
        resultado[mes][tipo]++
      }
    })

    res.json(resultado)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error estadísticas mensual" })
  }
})


module.exports = router