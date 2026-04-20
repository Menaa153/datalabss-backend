const express = require("express")
const supabase = require("../services/supabaseClient")
const router = express.Router()

router.get("/historial", async (req, res) => {
  try {
    const {
      documento,
      tipo,
      desde,
      hasta,
      page = 1,
      limit = 10
    } = req.query

    const from = (page - 1) * limit
    const to = from + parseInt(limit) - 1

    let query = supabase
      .from("tramites_eps")
      .select("*", { count: "exact" })

    // filtros
    if (documento) {
      query = query.or(`p1_numero.eq.${documento},nd_cabezaf.eq.${documento}`)
    }

    if (tipo) {
      query = query.eq("tipo_tramite", tipo)
    }

    if (desde) {
      query = query.gte("fecha", desde)
    }

    if (hasta) {
      query = query.lte("fecha", hasta)
    }

    // ordem + paginacion
    query = query
      .order("fecha", { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo trámites" })
  }
})

module.exports = router
