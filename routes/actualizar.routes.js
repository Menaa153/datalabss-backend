const express = require("express")
const multer = require("multer")
const csv = require("csv-parser")
const fs = require("fs")
const supabase = require("../services/supabaseClient")

const router = express.Router()
const upload = multer({ dest: "uploads/" })

// actualizar manual por documento
router.put("/actualizar/manual/:doc", async (req, res) => {
  try {
    const { doc } = req.params
    const { notificacion, confirmacion, profesional_a_cargo } = req.body

    const { data, error } = await supabase
      .from("tramites_eps")
      .update({
        notificacion,
        confirmacion,
        profesional_a_cargo
      })
      .eq("p1_numero", doc)

    if (error) throw error

    res.json({ message: "Actualizado correctamente", data })

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error actualizando manual" })
  }
})


// actualizacion masiva por archivo
router.post("/actualizar/archivo", upload.single("file"), async (req, res) => {
  try {
    const resultados = []

    const filePath = req.file.path

    const stream = fs.createReadStream(filePath)
      .pipe(csv())

    for await (const row of stream) {

      const doc = row.doc?.trim()

      if (!doc) continue

      const updateData = {
        notificacion: row.notificacion,
        confirmacion: row.confirmacion,
        profesional_a_cargo: row.profesional_a_cargo
      }

      const { error } = await supabase
        .from("tramites_eps")
        .update(updateData)
        .eq("p1_numero", doc)

      resultados.push({
        doc,
        status: error ? "error" : "ok"
      })
    }

    fs.unlinkSync(filePath)

    res.json({
      message: "Proceso masivo completado",
      resultados
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error procesando archivo" })
  }
})

module.exports = router