// Buscar por documento exacto
router.get('/buscar/documento/:doc', async (req, res) => {

  const documento = req.params.doc

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('numero_documento', documento)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

// Buscar por nombre parcial
router.get('/buscar/nombre/:nombre', async (req, res) => {

  const nombre = req.params.nombre

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .ilike('nombres', `%${nombre}%`)
    .limit(50)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})







import express from "express"
import supabase from "../services/supabaseClient.js"

const router = express.Router()

router.post("/login", async (req, res) => {

    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.json({
        user: data.user,
        token: data.session.access_token
    })

})

export default router