const express = require('express')
const supabase = require('../services/supabaseClient.js')
const verifyToken = require('../middleware/verifyToken.js')
const checkRole = require('../middleware/checkRole.js')

const router = express.Router()

// proteger todas las rutas
router.use(verifyToken)


// obtener personas con paginacion
router.get('/', async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from('personas')
      .select('*', { count: 'exact' })
      .range(from, to)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      data
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }

})


// editar persona
router.put('/:id',
  verifyToken,
  checkRole('admin'),
  async (req, res) => {

    try {

      const personaId = req.params.id
      const updates = req.body
      const userId = req.user.id

      const { data, error } = await supabase
        .from('personas')
        .update({
          ...updates,
          updated_at: new Date()
        })
        .eq('id', personaId)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      await supabase.from('auditoria').insert({
        user_id: userId,
        accion: 'EDITAR',
        persona_id: personaId
      })

      res.json({
        message: 'Persona actualizada correctamente',
        data
      })

    } catch (err) {
      res.status(500).json({ error: err.message })
    }

})


// buscar por documento exacto
router.get('/buscar/documento/:doc', async (req, res) => {

  try {

    const documento = req.params.doc

    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('numero_documento', documento)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }

})


// buscar por nombre 
router.get('/buscar/nombre/:nombre', async (req, res) => {

  try {

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

  } catch (err) {
    res.status(500).json({ error: err.message })
  }

})


//crear persona 
router.post('/', async (req,res)=>{

  try{

    const persona = req.body

    const {data,error} = await supabase
      .from('personas')
      .insert([persona])
      .select()

    if(error){
      return res.status(500).json({error:error.message})
    }

    res.json({
      message:"Persona creada",
      data
    })

  }catch(err){

    res.status(500).json({error:err.message})

  }

})


//inactivar persona
router.put('/inactivar/:id', async (req,res)=>{

  const id = req.params.id

  const {data,error} = await supabase
    .from('personas')
    .update({activo:false})
    .eq('id',id)
    .select()

  if(error){
    return res.status(500).json({error:error.message})
  }

  res.json({
    message:"Persona inactivada",
    data
  })

})

// buscar por documento
router.get("/:documento", async (req,res)=>{

  const { documento } = req.params

  try{

  const { data,error } = await supabase
    .from("personas")
    .select("*")
    .eq("numero_documento",documento)
    .single()

  if(error){

  return res.json(null)
  }

  res.json(data)

  }catch(err){
    res.status(500).json({error:"error consultando persona"})
  }
})

// buscar persona en bd y tramite
router.get('/documento2/:doc', async (req, res) => {

  try {

    const documento = req.params.doc

    const { data, error } = await supabase
      .from('personas')
      .select(`
        *,
        personas_salud (*),
        tramites_eps (*)
      `)
      .eq('numero_documento', documento)
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ message: "Persona no encontrada" })
    }

    res.json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }

})

// llenar campos automaticos desde busqueda de persona
router.get("/persona-completa/:id", async (req, res) => {

  const { id } = req.params

  const { data, error } = await supabase
    .from("personas")
    .select(`
      *,
      personas_salud (*),
      tramites_eps (*)
    `)
    .eq("id", id)
    .maybeSingle()

  if (error) return res.status(500).json({ error })

  res.json(data)
})


module.exports = router