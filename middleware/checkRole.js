const supabase = require('../services/supabaseClient')

const checkRole = (requiredRole) => {
  return async (req, res, next) => {

    const userId = req.user.id

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return res.status(403).json({ error: 'Rol no encontrado' })
    }

    if (data.role !== requiredRole) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    next()
  }
}

module.exports = checkRole