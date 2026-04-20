const express = require("express")
const supabase = require("../services/supabaseClient")
const router = express.Router()

const JSZip = require("jszip")
const { PDFDocument } = require("pdf-lib")
const fs = require("fs")
const path = require("path")

// configuracion
const CONFIG_PDFS = {

  portabilidad: {
    template: "PORTABILIDAD_V1.pdf",
    fileName: (p1) => `portabilidad_${p1.numero_registro}.pdf`,
    firmas: [
      { campo: "firma", page: 0 }
    ],

    mapData: (p1, p2, p3) => ({
      numero_registro: p1.numero_registro,
      fecha: p1.fecha,

      eps_portabilidad: p1.eps_portabilidad,

      nombre_cabezaf: p1.nombre_cabezaf,
      td_cabezaf: p1.td_cabezaf,
      nd_cabezaf: p1.nd_cabezaf,
      edad_cabezaf: p1.edad_cabezaf,
      nacionalidad_cabezaf: p1.nacionalidad_cabezaf,

      nombre_ben1: p2?.nombre_cabezaf || "",
      td_ben1: p2?.td_cabezaf || "",
      nd_ben1: p2?.nd_cabezaf || "",
      edad_ben1: p2?.edad_cabezaf || "",
      nacionalidad_ben1: p2?.nacionalidad_cabezaf || "",

      nombre_ben2: p3?.nombre_cabezaf || "",
      td_ben2: p3?.td_cabezaf || "",
      nd_ben2: p3?.nd_cabezaf || "",
      edad_ben2: p3?.edad_cabezaf || "",
      nacionalidad_ben2: p3?.nacionalidad_cabezaf || "",

      correo_si: p1.autorizacion_correo === "si",
      correo_no: p1.autorizacion_correo === "no",
      menor_de_edad: p1.es_menor_edad === "si",

      correo_electronico: p1.correo_electronico,
      celular: p1.celular,

      parentezco: p1.parentesco,
      notificacion: p1?.notificacion || "",
      confirmacion: p1?.confirmacion || "",
      profesional_a_cargo: p1?.profesional_a_cargo || "",
    })
  },

  afiliacion: {
    template: "AFILIACION_SAT_V1.pdf",
    fileName: (p1) => `afi_tras_${p1.numero_registro}.pdf`,
    firmas: [
      { campo: "firma1", page: 0 },
      { campo: "firma2", page: 1 }
    ],

    mapData: (p1, p2) => ({
      tipo_tramite: p1.tipo_tramite,

      // PERSONA 1
      p1_nombre: p1.p1_nombre,
      p1_td: p1.p1_td,
      p1_nd: p1.p1_numero,
      p1_nacionalidad: p1.p1_nacionalidad,
      p1_eps_adres: p1.p1_eps_adres,
      p1_municipio: p1.p1_municipio,
      p1_estado: p1.p1_estado,

      // PERSONA 2
      p2_nombre: p2?.p1_nombre || "",
      p2_td: p2?.p1_td || "",
      p2_nd: p2?.p1_numero || "",
      p2_nacionalidad: p2?.p1_nacionalidad || "",
      p2_eps_adres: p2?.p1_eps_adres || "",
      p2_municipio: p2?.p1_municipio || "",
      p2_estado: p2?.p1_estado || "",

      // ACUDIENTE
      nombre_fir: p1.acudiente_nombre || "",
      td_fir: p1.acudiente_td || "",
      nd_fir: p1.acudiente_numero || "",
      parentesco: p1.parentesco || "",

      // GENERALES
      fecha: p1.fecha,
      numero_registro: p1.numero_registro,
      notificacion: p1?.notificacion || "",
      confirmacion: p1?.confirmacion || "",
      profesional_a_cargo: p1?.profesional_a_cargo || "",

      // CHECKBOXES PERSONA 1
      p1_emssanar: p1.p1_eps_escoge === "emssanar",
      p1_nuevaeps: p1.p1_eps_escoge === "nuevaeps",
      p1_mallamas: p1.p1_eps_escoge === "mallamas",
      p1_fliar: p1.p1_eps_escoge === "fliar",

      // CHECKBOXES PERSONA 2
      p2_emssanar: p2?.p1_eps_escoge === "emssanar",
      p2_nuevaeps: p2?.p1_eps_escoge === "nuevaeps",
      p2_mallamas: p2?.p1_eps_escoge === "mallamas",
      p2_fliar: p2?.p1_eps_escoge === "fliar",

      // TIPO TRAMITE
      p1_traslado: p1.tipo_tramite === "traslado",
      p1_afiliacion: p1.tipo_tramite === "afiliacion",
      p1_conEPS: p1.tipo_tramite === "conEPS",

      p2_traslado: p2 ? p1.tipo_tramite === "traslado" : false,
      p2_afiliacion: p2 ? p1.tipo_tramite === "afiliacion" : false,
      p2_conEPS: p2 ? p1.tipo_tramite === "conEPS" : false,

      // CONTRASEÑA
      contraseña_si: p1.estado_contrasena === "si",
      contraseña_no: p1.estado_contrasena === "no",
      contraseña_na: p1.estado_contrasena === "na",
    })
  }
}


// llenar campos
const llenarCampos = (form, data) => {
  form.getFields().forEach(field => {
    const nombre = field.getName()
    const tipo = field.constructor.name
    const valor = data[nombre]

    if (valor === undefined) return

    if (tipo === "PDFTextField") {
      form.getTextField(nombre).setText(String(valor))
    }

    if (tipo === "PDFCheckBox") {
      valor ? form.getCheckBox(nombre).check()
            : form.getCheckBox(nombre).uncheck()
    }
  })
}


// insertar firma
const insertarFirma = async (pdfDoc, form, campo, base64, pageIndex) => {
  try {
    if (!base64) return

    const fieldNames = form.getFields().map(f => f.getName())
    if (!fieldNames.includes(campo)) return

    const base64Data = base64.replace(/^data:image\/png;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")
    const image = await pdfDoc.embedPng(buffer)

    const field = form.getTextField(campo)
    const rect = field.acroField.getWidgets()[0].getRectangle()
    const page = pdfDoc.getPages()[pageIndex]

    page.drawImage(image, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    })

    form.removeField(field)

  } catch (err) {
    console.log("Error firma:", err)
  }
}


// ruta pa exportar
router.get("/exportar", async (req, res) => {
  try {
    const { desde, hasta } = req.query

    const { data: tramites, error } = await supabase
      .from("tramites_eps")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)

    if (error) throw error

    const zip = new JSZip()

    // agrupar
    const grupos = {}

    tramites.forEach(t => {
      if (!grupos[t.numero_registro]) {
        grupos[t.numero_registro] = []
      }
      grupos[t.numero_registro].push(t)
    })

    // recorrer
    for (const numero in grupos) {
      const registros = grupos[numero]

      const p1 = registros.find(p => p.tipo_persona === "principal")
      const p2 = registros.find(p => p.tipo_persona === "secundaria") || null
      const p3 = registros.find(p => p.tipo_persona === "terciaria") || null

      if (!p1) continue

      const tipo = p1.tipo_tramite === "portabilidad"
        ? "portabilidad"
        : "afiliacion"

      const config = CONFIG_PDFS[tipo]

      const pdfPath = path.join(__dirname, "..", "templates", config.template)
      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath))
      const form = pdfDoc.getForm()

      const dataMap = config.mapData(p1, p2, p3)

      llenarCampos(form, dataMap)

      for (const f of config.firmas) {
        await insertarFirma(pdfDoc, form, f.campo, p1.firma_base64, f.page)
      }

      const pdfBytes = await pdfDoc.save()

      zip.file(config.fileName(p1), pdfBytes)
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    res.setHeader("Content-Type", "application/zip")
    res.setHeader("Content-Disposition", "attachment; filename=tramites.zip")

    res.send(zipBuffer)

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error exportando PDFs" })
  }
})

module.exports = router