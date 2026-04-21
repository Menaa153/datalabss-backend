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