require('dotenv').config()
const express = require('express')
const cors = require('cors')

const personasRoutes = require('./routes/personas.routes')
const authRoutes = require('./routes/auth.routes')
const tramitesRoutes = require('./routes/tramites.routes.js')
const pdfRoutes = require('./routes/pdf.routes')

const firmaRoutes = require("./routes/firma.routes")
const estadisticasRoutes = require("./routes/estadistica.routes.js")

const actualizarRoutes = require("./routes/actualizar.routes")
const exportarRoutes = require("./routes/exportar.routes")
const historialRoutes = require("./routes/historial.routes")


const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/personas', personasRoutes)
app.use('/api/auth', authRoutes)
app.use("/api/tramites", tramitesRoutes)
app.use('/api/pdf', pdfRoutes)
app.use("/api/firmas", firmaRoutes)
app.use("/api", estadisticasRoutes)
app.use("/api", actualizarRoutes)
app.use("/api", exportarRoutes)
app.use("/api", historialRoutes)


app.get('/', (req, res) => {
    res.send('api funcionando')
})

const PORT = process.env.PORT || 4000

app.listen(4000, "0.0.0.0", () => {
    console.log(`servidor corriendo en puerto ${PORT}`)
})