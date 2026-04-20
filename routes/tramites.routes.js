const express = require('express')
const supabase = require('../services/supabaseClient')

const router = express.Router()

// crear tramite
router.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tramites_eps")
      .insert([req.body])
      .select()

    if (error) throw error

    res.json({
      mensaje: "Trámite guardado correctamente",
      data
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Error guardando trámite"
    })
  }
})

// obtener 5 ultimos tramites
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tramites_eps")
      .select("*")
      .order("fecha", { ascending: false, nullsFirst: false })  // Ordena por fecha descendente
      .limit(5);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo trámites" });
  }
});

// buscar por documeto
router.get("/documento/:numero", async (req, res) => {
  const { numero } = req.params

  try {
    const { data, error } = await supabase
      .from("tramites_eps")
      .select("*")
      .or(`p1_numero.eq.${numero},p2_numero.eq.${numero}`)

    if (error) throw error

    res.json(data)
  } catch (error) {
    res.status(500).json({
      error: "Error buscando trámite"
    })
  }
})

module.exports = router
