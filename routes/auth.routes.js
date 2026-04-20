const express = require('express')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const router = express.Router()

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)


//login
router.post('/login', async (req, res) => {
    
    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    if (error){
        return res.status(401).json({ error:'Credenciales invalidas'})
    }

    res.json({
        message:'login exitoso',
        session: data.session,
        user: data.user
    })
})

module.exports = router