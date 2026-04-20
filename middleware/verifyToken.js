const supabase = require('../services/supabaseClient')

const verifyToken = async (req, res, next) => {

  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  req.user = data.user
  next()
}

module.exports = verifyToken