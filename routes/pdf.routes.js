const express = require("express")
const fs = require("fs")
const path = require("path")
const { PDFDocument } = require("pdf-lib")
const supabase = require("../services/supabaseClient")
const router = express.Router()


// guardar registro afiliacion en bd  /* 
router.post("/generar", async (req, res) => {

    try {

        const data = req.body
        const pdfPath = path.join(__dirname, "..", "templates", "AFILIACION_SAT_V1.pdf")
        const existingPdfBytes = fs.readFileSync(pdfPath)
        const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const form = pdfDoc.getForm()
        const fields = form.getFields()

        //LLENAR CAMPOS PDF
        fields.forEach(field => {

            const nombre = field.getName()
            const tipo = field.constructor.name
            const valor = data[nombre]

            if (valor === undefined) return

            if (tipo === "PDFTextField") {
                form.getTextField(nombre).setText(String(valor))
            }

            if (tipo === "PDFCheckBox") {
                const checkbox = form.getCheckBox(nombre)

                if (valor === true || valor === "true" || valor === 1) {
                    checkbox.check()
                } else {
                    checkbox.uncheck()
                }
            }
        })

        //FIRMA 1
        if (data.firma1) {

            const base64Data = data.firma1.replace(/^data:image\/png;base64,/, "")
            const firmaBuffer = Buffer.from(base64Data, "base64")
            const firmaImage = await pdfDoc.embedPng(firmaBuffer)
            const firmaField = form.getTextField("firma1")
            const rect = firmaField.acroField.getWidgets()[0].getRectangle()
            const page = pdfDoc.getPages()[0]

            page.drawImage(firmaImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            })
            form.removeField(firmaField)
        }

        //FIRMA 2
        if (data.firma2) {

            const base64Data = data.firma2.replace(/^data:image\/png;base64,/, "")
            const firmaBuffer = Buffer.from(base64Data, "base64")
            const firmaImage = await pdfDoc.embedPng(firmaBuffer)
            const firmaField = form.getTextField("firma2")
            const rect = firmaField.acroField.getWidgets()[0].getRectangle()
            const page = pdfDoc.getPages()[1]

            page.drawImage(firmaImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            })

            form.removeField(firmaField)
        }

        const pdfBytes = await pdfDoc.save()

        const capitalizarTexto = (texto) => {
            if (!texto) return texto

            return texto
                .toLowerCase()
                .trim()
                .split(/\s+/)
                .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" ")
        }

        // nueva funcion: buscar o crear persona
        const obtenerPersonaId = async (nombre, td, numero, eps) => {

            if (!numero) return null

            // buscar persona
            const { data: personaExistente } = await supabase
                .from("personas")
                .select("*")
                .eq("numero_documento", numero)
                .single()

            if (personaExistente) {
                return personaExistente.id
            }

            // Crear persona si no existe
            const { data: nuevaPersona, error } = await supabase
                .from("personas")
                .insert([{
                    nombres: capitalizarTexto(nombre),
                    tipo_documento: td,
                    numero_documento: numero
                }])
                .select()
                .single()

            if (error) {
                console.log("ERROR CREANDO PERSONA:", error)
                return null
            }

            // crear info salud
            await supabase.from("personas_salud").insert([{
                persona_id: nuevaPersona.id,
                eps: capitalizarTexto(eps)
            }])

            return nuevaPersona.id
        }

        // GUARDAR EN BD
        const registros = []

        // persona 1
        if (data.p1_nombre) {

            const personaId1 = await obtenerPersonaId(
                data.p1_nombre,
                data.p1_td,
                data.p1_nd,
                data.p1_eps_adres
            )

            registros.push({

                fecha: data.fecha || null,
                numero_registro: data.numero_registro || null,

                tipo_tramite: "afiliacion",

                persona_id: personaId1,

                p1_nombre: capitalizarTexto(data.p1_nombre),
                p1_td: data.p1_td,
                p1_numero: data.p1_nd,
                p1_nacionalidad: capitalizarTexto(data.p1_nacionalidad),
                p1_eps_adres: capitalizarTexto(data.p1_eps_adres),
                p1_municipio: capitalizarTexto(data.p1_municipio),
                p1_estado: capitalizarTexto(data.p1_estado || null),
                p1_eps_escoge: data.eps_persona1,

                acudiente_nombre: capitalizarTexto(data.nombre_fir),
                acudiente_td: data.td_fir,
                acudiente_numero: data.nd_fir,
                parentesco: capitalizarTexto(data.parentesco),

                estado_contrasena: data.estado_contrasena,
                tipo_persona: "principal",

                firma_base64: data.firma1 || null,
            })
        }

        // persona 2
        if (data.p2_nombre) {

            const personaId2 = await obtenerPersonaId(
                data.p2_nombre,
                data.p2_td,
                data.p2_nd,
                data.p2_eps_adres
            )

            registros.push({

                fecha: data.fecha || null,
                numero_registro: data.numero_registro || null,

                tipo_tramite: "afiliacion",

                persona_id: personaId2,

                p1_nombre: capitalizarTexto(data.p2_nombre),
                p1_td: data.p2_td,
                p1_numero: data.p2_nd,
                p1_nacionalidad: capitalizarTexto(data.p2_nacionalidad),
                p1_eps_adres: capitalizarTexto(data.p2_eps_adres),
                p1_municipio: capitalizarTexto(data.p2_municipio),
                p1_estado: capitalizarTexto(data.p2_estado || null),
                p1_eps_escoge: data.eps_persona2,

                estado_contrasena: data.estado_contrasena,
                tipo_persona: "secundaria",

                firma_base64: data.firma1 || null,
            })
        }

        // INSERT
        const { error: insertError } = await supabase
            .from("tramites_eps")
            .insert(registros)

        if (insertError) {
            console.log("ERROR BD:", insertError)
        }

        // RESPUESTA
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=afiliacion.pdf")

        res.send(Buffer.from(pdfBytes))

    } catch (error) {

        console.log(error)

        res.status(500).json({
            error: "Error generando PDF"
        })

    }

})
//*/


// guardar registro traslado  en bd
router.post("/generart", async (req, res) => {

    try {

        const data = req.body
        const pdfPath = path.join(__dirname, "..", "templates", "AFILIACION_SAT_V1.pdf")
        const existingPdfBytes = fs.readFileSync(pdfPath)
        const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const form = pdfDoc.getForm()
        const fields = form.getFields()

        // llenar campos
        fields.forEach(field => {

            const nombre = field.getName()
            const tipo = field.constructor.name
            const valor = data[nombre]

            if (valor === undefined) return

            if (tipo === "PDFTextField") {
                form.getTextField(nombre).setText(String(valor))
            }

            if (tipo === "PDFCheckBox") {
                const checkbox = form.getCheckBox(nombre)

                if (valor === true || valor === "true" || valor === 1) {
                    checkbox.check()
                } else {
                    checkbox.uncheck()
                }
            }
        })

        // FIRMA 1
        if (data.firma1) {

            const base64Data = data.firma1.replace(/^data:image\/png;base64,/, "")
            const firmaBuffer = Buffer.from(base64Data, "base64")
            const firmaImage = await pdfDoc.embedPng(firmaBuffer)
            const firmaField = form.getTextField("firma1")
            const rect = firmaField.acroField.getWidgets()[0].getRectangle()
            const page = pdfDoc.getPages()[0]

            page.drawImage(firmaImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            })

            form.removeField(firmaField)
        }


        // FIRMA 2
        if (data.firma2) {

            const base64Data = data.firma2.replace(/^data:image\/png;base64,/, "")
            const firmaBuffer = Buffer.from(base64Data, "base64")
            const firmaImage = await pdfDoc.embedPng(firmaBuffer)
            const firmaField = form.getTextField("firma2")
            const rect = firmaField.acroField.getWidgets()[0].getRectangle()
            const page = pdfDoc.getPages()[1]

            page.drawImage(firmaImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            })

            form.removeField(firmaField)
        }

        const pdfBytes = await pdfDoc.save()

        // GUARDAR EN BD
        const capitalizarTexto = (texto) => {
            if (!texto) return texto

            return texto
                .toLowerCase()
                .trim()
                .split(/\s+/)
                .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" ")
        }

        // funcion buscar o crear persona
        const obtenerPersonaId = async (nombre, td, numero, eps) => {

            if (!numero) return null

            const { data: personaExistente } = await supabase
                .from("personas")
                .select("*")
                .eq("numero_documento", numero)
                .single()

            if (personaExistente) {
                return personaExistente.id
            }

            const { data: nuevaPersona, error } = await supabase
                .from("personas")
                .insert([{
                    nombres: capitalizarTexto(nombre),
                    tipo_documento: td,
                    numero_documento: numero
                }])
                .select()
                .single()

            if (error) {
                console.log("ERROR CREANDO PERSONA:", error)
                return null
            }

            await supabase.from("personas_salud").insert([{
                persona_id: nuevaPersona.id,
                eps: capitalizarTexto(eps)
            }])

            return nuevaPersona.id
        }

        const registros = []

        // PERSONA 1
        if (data.p1_nombre) {

            const personaId1 = await obtenerPersonaId(
                data.p1_nombre,
                data.p1_td,
                data.p1_nd,
                data.p1_eps_adres
            )

            registros.push({

                fecha: data.fecha || null,
                numero_registro: data.numero_registro || null,

                tipo_tramite: "traslado",

                persona_id: personaId1,

                p1_nombre: capitalizarTexto(data.p1_nombre),
                p1_td: data.p1_td,
                p1_numero: data.p1_nd,
                p1_nacionalidad: capitalizarTexto(data.p1_nacionalidad),
                p1_eps_adres: capitalizarTexto(data.p1_eps_adres),
                p1_municipio: capitalizarTexto(data.p1_municipio),
                p1_estado: capitalizarTexto(data.p1_estado || null),
                p1_eps_escoge: data.eps_persona1,

                acudiente_nombre: capitalizarTexto(data.nombre_fir),
                acudiente_td: data.td_fir,
                acudiente_numero: data.nd_fir,
                parentesco: capitalizarTexto(data.parentesco),

                estado_contrasena: data.estado_contrasena,
                tipo_persona: "principal",

                firma_base64: data.firma1 || null,
            })
        }

        // PERSONA 2
        if (data.p2_nombre) {

            const personaId2 = await obtenerPersonaId(
                data.p2_nombre,
                data.p2_td,
                data.p2_nd,
                data.p2_eps_adres
            )

            registros.push({

                fecha: data.fecha || null,
                numero_registro: data.numero_registro || null,
                tipo_tramite: "traslado",
                persona_id: personaId2,
                p1_nombre: capitalizarTexto(data.p2_nombre),
                p1_td: data.p2_td,
                p1_numero: data.p2_nd,
                p1_nacionalidad: capitalizarTexto(data.p2_nacionalidad),
                p1_eps_adres: capitalizarTexto(data.p2_eps_adres),
                p1_municipio: capitalizarTexto(data.p2_municipio),
                p1_estado: capitalizarTexto(data.p2_estado || null),
                p1_eps_escoge: data.eps_persona2,

                estado_contrasena: data.estado_contrasena,
                tipo_persona: "secundaria",

                firma_base64: data.firma1 || null,
            })
        }

        // INSERT FINAL
        const { error: insertError } = await supabase
            .from("tramites_eps")
            .insert(registros)

        if (insertError) {
            console.log("ERROR BD:", insertError)
        }

        // RESPUESTA
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=traslado.pdf")

        res.send(Buffer.from(pdfBytes))

    } catch (error) {

        console.log(error)

        res.status(500).json({
            error: "Error generando PDF"
        })
    }
})


router.post("/generar-portabilidad", async (req, res) => {

    try {

        const data = req.body
        const pdfPath = path.join(__dirname, "..", "templates", "PORTABILIDAD_V1.pdf")
        const existingPdfBytes = fs.readFileSync(pdfPath)
        const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const form = pdfDoc.getForm()
        const fields = form.getFields()

        // LLENAR CAMPOS
        fields.forEach(field => {

            const nombre = field.getName()
            const tipo = field.constructor.name
            const valor = data[nombre]

            if (valor === undefined) return

            if (tipo === "PDFTextField") {
                form.getTextField(nombre).setText(String(valor))
            }

            if (tipo === "PDFCheckBox") {

                const checkbox = form.getCheckBox(nombre)

                if (valor === true || valor === "true" || valor === 1) {
                    checkbox.check()
                } else {
                    checkbox.uncheck()
                }
            }
        })

        // INSERTAR FIRMA
        if (data.firma) {

            const base64Data = data.firma.replace(/^data:image\/png;base64,/, "")
            const firmaBuffer = Buffer.from(base64Data, "base64")
            const firmaImage = await pdfDoc.embedPng(firmaBuffer)
            const firmaField = form.getTextField("firma")
            const widgets = firmaField.acroField.getWidgets()
            const rect = widgets[0].getRectangle()
            const pages = pdfDoc.getPages()
            const page = pages[0]

            page.drawImage(firmaImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            })

            form.removeField(firmaField)
        }

        const pdfBytes = await pdfDoc.save()

        // FUNCION CAPITALIZAR
        const capitalizarTexto = (texto) => {
            if (!texto) return texto

            return texto
                .toLowerCase()
                .trim()
                .split(/\s+/)
                .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" ")
        }

        //funcion buscar o crear
        const obtenerPersonaId = async (nombre, td, numero) => {

            if (!numero) return null

            const { data: personaExistente } = await supabase
                .from("personas")
                .select("*")
                .eq("numero_documento", numero)
                .single()

            if (personaExistente) {
                return personaExistente.id
            }

            const { data: nuevaPersona, error } = await supabase
                .from("personas")
                .insert([{
                    nombres: capitalizarTexto(nombre),
                    tipo_documento: td,
                    numero_documento: numero
                }])
                .select()
                .single()

            if (error) {
                console.log("ERROR CREANDO PERSONA:", error)
                return null
            }

            return nuevaPersona.id
        }

        // GUARDAR EN BD
        const registros = []

        // PERSONA 1
        if (data.nombre_cabezaf) {

            const personaId1 = await obtenerPersonaId(
                data.nombre_cabezaf,
                data.td_cabezaf,
                data.nd_cabezaf
            )

            registros.push({

                tipo_tramite: "portabilidad",
                numero_registro: data.numero_registro,
                fecha: data.fecha,

                persona_id: personaId1,

                eps_portabilidad: capitalizarTexto(data.eps_portabilidad),

                nombre_cabezaf: capitalizarTexto(data.nombre_cabezaf),
                td_cabezaf: data.td_cabezaf,
                nd_cabezaf: data.nd_cabezaf,
                edad_cabezaf: data.edad_cabezaf,
                nacionalidad_cabezaf: capitalizarTexto(data.nacionalidad_cabezaf),

                correo_electronico: data.correo_electronico,
                celular: data.celular,

                autorizacion_correo: data.autorizacion_correo,
                es_menor_edad: data.menor_de_edad,
                parentesco: capitalizarTexto(data.parentesco),

                tipo_persona: "principal",
                firma_base64: data.firma,
            })
        }

        // PERSONA 2
        if (data.nombre_ben1) {

            const personaId2 = await obtenerPersonaId(
                data.nombre_ben1,
                data.td_ben1,
                data.nd_ben1
            )

            registros.push({

                tipo_tramite: "portabilidad",
                numero_registro: data.numero_registro,
                fecha: data.fecha,

                persona_id: personaId2,

                eps_portabilidad: capitalizarTexto(data.eps_portabilidad),

                nombre_cabezaf: capitalizarTexto(data.nombre_ben1),
                td_cabezaf: data.td_ben1,
                nd_cabezaf: data.nd_ben1,
                edad_cabezaf: data.edad_ben1,
                nacionalidad_cabezaf: capitalizarTexto(data.nacionalidad_ben1),

                correo_electronico: data.correo_electronico,
                celular: data.celular,

                parentesco: capitalizarTexto(data.parentesco),

                tipo_persona: "secundaria",
                firma_base64: data.firma,
            })
        }

        // PERSONA 3
        if (data.nombre_ben2) {

            const personaId3 = await obtenerPersonaId(
                data.nombre_ben2,
                data.td_ben2,
                data.nd_ben2
            )

            registros.push({

                tipo_tramite: "portabilidad",
                numero_registro: data.numero_registro,
                fecha: data.fecha,

                persona_id: personaId3, 

                eps_portabilidad: capitalizarTexto(data.eps_portabilidad),

                nombre_cabezaf: capitalizarTexto(data.nombre_ben2),
                td_cabezaf: data.td_ben2,
                nd_cabezaf: data.nd_ben2,
                edad_cabezaf: data.edad_ben2,
                nacionalidad_cabezaf: capitalizarTexto(data.nacionalidad_ben2),

                correo_electronico: data.correo_electronico,
                celular: data.celular,

                parentesco: capitalizarTexto(data.parentesco),

                tipo_persona: "secundaria",
                firma_base64: data.firma,
            })
        }

        // INSERT FINAL
        const { error: insertError } = await supabase
            .from("tramites_eps")
            .insert(registros)

        if (insertError) {
            console.log("ERROR BD:", insertError)
        }

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=portabilidad.pdf")

        res.send(Buffer.from(pdfBytes))

    } catch (error) {

        console.log(error)

        res.status(500).json({
            error: "Error generando PDF de portabilidad"
        })
    }
})



//consultar pdf desde pagina tramites
router.get("/registro/:numero/pdf-portabilidad", async (req, res) => {
  try {
    const { numero } = req.params

    console.log("Buscando numero:", numero)
    // 1 traer registros
    const { data, error } = await supabase
      .from("tramites_eps")
      .select("*")
      .eq("numero_registro", numero)
    console.log("Resultado BD:", data)
    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "No encontrado" })
    }

    // 2 seperar personas
    const persona1 = data.find(p => p.tipo_persona === "principal")
    const persona2 = data.find(p => p.tipo_persona === "secundaria") || null
    const persona3 = data.find(p => p.tipo_persona === "terciaria") || null

    // portabilidad
    const pdfData = {
        numero_registro: persona1.numero_registro,
        fecha: persona1.fecha,

        eps_portabilidad: persona1.eps_portabilidad,

        nombre_cabezaf: persona1.nombre_cabezaf,
        td_cabezaf: persona1.td_cabezaf,
        nd_cabezaf: persona1.nd_cabezaf,
        edad_cabezaf: persona1.edad_cabezaf,
        nacionalidad_cabezaf: persona1.nacionalidad_cabezaf,

        nombre_ben1: persona2?.nombre_cabezaf || "",
        td_ben1: persona2?.td_cabezaf || "",
        nd_ben1: persona2?.nd_cabezaf || "",
        edad_ben1: persona2?.edad_cabezaf || "",
        nacionalidad_ben1: persona2?.nacionalidad_cabezaf || "",

        nombre_ben2: persona3?.nombre_cabezaf || "",
        td_ben2: persona3?.td_cabezaf || "",
        nd_ben2: persona3?.nd_cabezaf || "",
        edad_ben2: persona3?.edad_cabezaf || "",
        nacionalidad_ben2: persona3?.nacionalidad_cabezaf || "",

        autorizacion_correo: persona1.autorizacion_correo,
        menor_de_edad:persona1.es_menor_edad,

        correo_electronico: persona1.correo_electronico,
        celular: persona1.celular,

        parentezco: persona1.parentesco,
        notificacion: persona1?.notificacion || "",
        confirmacion: persona1?.confirmacion || "",
        profesional_a_cargo: persona1?.profesional_a_cargo || "",

        firma: persona1.firma_base64
    }
    // 4 cargar plantilla
    const pdfPath = path.join(__dirname, "..", "templates", "PORTABILIDAD_V1.pdf")
    const existingPdfBytes = fs.readFileSync(pdfPath)

    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()
    
    // 5 mapear correo a checkbox
    pdfData.correo_si = pdfData.autorizacion_correo === "si"
    pdfData.correo_no = pdfData.autorizacion_correo === "no"

    // 6 mapear edad a chekbox
    pdfData.menor_de_edad = pdfData.menor_de_edad === "si"

    // llenar campos
    fields.forEach(field => {
      const nombre = field.getName()
      const tipo = field.constructor.name
      const valor = pdfData[nombre]

      if (valor === undefined) return

      if (tipo === "PDFTextField") {
        form.getTextField(nombre).setText(String(valor))
      }

      if (tipo === "PDFCheckBox") {
        const checkbox = form.getCheckBox(nombre)

        if (valor === true || valor === "true" || valor === 1) {
          checkbox.check()
        } else {
          checkbox.uncheck()
        }
      }
    })

      // firma
      if (pdfData.firma) {
        const base64Data = pdfData.firma.replace(/^data:image\/png;base64,/, "")
        const firmaBuffer = Buffer.from(base64Data, "base64")

        const firmaImage = await pdfDoc.embedPng(firmaBuffer)

        const firmaField = form.getTextField("firma")
        const rect = firmaField.acroField.getWidgets()[0].getRectangle()

        const page = pdfDoc.getPages()[0]

        page.drawImage(firmaImage, {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        })

        form.removeField(firmaField)
      } 

    // final
    const pdfBytes = await pdfDoc.save()

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "inline; filename=tramite.pdf")

    res.send(Buffer.from(pdfBytes))

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error generando PDF desde BD" })
  }
})


// ver pdf desde pagina de historial de tramites
router.get("/registro/:numero/pdf-afi-tras", async (req, res) => {
  try {
    const { numero } = req.params

    console.log("Buscando numero:", numero)
    // 1 traer registros
    const { data, error } = await supabase
      .from("tramites_eps")
      .select("*")
      .eq("numero_registro", numero)
    console.log("Resultado BD:", data)
    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "No encontrado" })
    }

    // 2 separar personas
    const persona1 = data.find(p => p.tipo_persona === "principal")
    const persona2 = data.find(p => p.tipo_persona === "secundaria") || null

    // 3 armar objeto
    const pdfData = {
      // persona 1
      tipo_tramite: persona1.tipo_tramite,
      p1_nombre: persona1.p1_nombre,
      p1_td: persona1.p1_td,
      p1_nd: persona1.p1_numero,
      p1_nacionalidad: persona1.p1_nacionalidad,
      p1_eps_adres: persona1.p1_eps_adres,
      p1_municipio: persona1.p1_municipio,
      p1_estado: persona1.p1_estado,
      p1_eps_escoge: persona1.p1_eps_escoge,
      
      // persona 2
      p2_nombre: persona2?.p1_nombre || "",
      p2_td: persona2?.p1_td || "",
      p2_nd: persona2?.p1_numero || "",
      p2_nacionalidad: persona2?.p1_nacionalidad || "",
      p2_eps_adres: persona2?.p1_eps_adres || "",
      p2_municipio: persona2?.p1_municipio || "",
      p2_estado: persona2?.p1_estado || "",
      p2_eps_escoge: persona2?.p1_eps_escoge || "",

      //acudiente
      nombre_fir: persona1.acudiente_nombre || "",
      td_fir: persona1.acudiente_td || "",
      nd_fir: persona1.acudiente_numero || "",
      parentesco: persona1.parentesco || "",

      // generales
      fecha: persona1.fecha,
      numero_registro: persona1.numero_registro,
      estado_contrasena: persona1.estado_contrasena,
      notificacion: persona1?.notificacion || "",
      confirmacion: persona1?.confirmacion || "",
      profesional_a_cargo: persona1?.profesional_a_cargo || "",

      // firma
      firma1: persona1.firma_base64,
      firma2: persona1.firma_base64
    }

    // 4 cargar plantilla
    const pdfPath = path.join(__dirname, "..", "templates", "AFILIACION_SAT_V1.pdf")
    const existingPdfBytes = fs.readFileSync(pdfPath)

    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    // 5 mapear eps a checkbox p1
    pdfData.p1_emssanar = pdfData.p1_eps_escoge === "emssanar"
    pdfData.p1_nuevaeps = pdfData.p1_eps_escoge === "nuevaeps"
    pdfData.p1_mallamas = pdfData.p1_eps_escoge === "mallamas"
    pdfData.p1_fliar = pdfData.p1_eps_escoge === "fliar"

    // 6 mapear eps a checkbox p2
    pdfData.p2_emssanar = pdfData.p2_eps_escoge === "emssanar"
    pdfData.p2_nuevaeps = pdfData.p2_eps_escoge === "nuevaeps"
    pdfData.p2_mallamas = pdfData.p2_eps_escoge === "mallamas"
    pdfData.p2_fliar = pdfData.p2_eps_escoge === "fliar"

    // 7 mapear tipo tramite a checkbox p1
    pdfData.p1_traslado = pdfData.tipo_tramite === "traslado"
    pdfData.p1_afiliacion = pdfData.tipo_tramite === 'afiliacion'
    pdfData.p1_conEPS = pdfData.tipo_tramite === "conEPS"

    // 8 mapear tipo tramite a checkbox p2
    pdfData.p2_traslado = pdfData.p2_nombre
    ? pdfData.tipo_tramite === "traslado" : ""

    pdfData.p2_afiliacion = pdfData.p2_nombre
    ? pdfData.tipo_tramite === "afiliacion" : ""

    pdfData.p2_conEPS = pdfData.p2_nombre
    ? pdfData.tipo_tramite === "conEPS" : ""

    // 9 mapear estado contraseña
    pdfData.contraseña_si = pdfData.estado_contrasena
    ? pdfData.estado_contrasena === "si" : ""

    pdfData.contraseña_no = pdfData.estado_contrasena
    ? pdfData.estado_contrasena === "no" : ""

    pdfData.contraseña_na = pdfData.estado_contrasena
    ? pdfData.estado_contrasena === "na" : ""


    // 10 llenar campos
    fields.forEach(field => {
      const nombre = field.getName()
      const tipo = field.constructor.name
      const valor = pdfData[nombre]

      if (valor === undefined) return

      if (tipo === "PDFTextField") {
        form.getTextField(nombre).setText(String(valor))
      }

      if (tipo === "PDFCheckBox") {
        const checkbox = form.getCheckBox(nombre)

        if (valor === true || valor === "true" || valor === 1) {
          checkbox.check()
        } else {
          checkbox.uncheck()
        }
      }
    })

    // 11 firma 1
    if (pdfData.firma1) {
      const base64Data = pdfData.firma1.replace(/^data:image\/png;base64,/, "")
      const firmaBuffer = Buffer.from(base64Data, "base64")

      const firmaImage = await pdfDoc.embedPng(firmaBuffer)

      const firmaField = form.getTextField("firma1")
      const rect = firmaField.acroField.getWidgets()[0].getRectangle()

      const page = pdfDoc.getPages()[0]

      page.drawImage(firmaImage, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })

      form.removeField(firmaField)
    }

    // 12 firma 2
    if (pdfData.firma2) {
      const base64Data = pdfData.firma2.replace(/^data:image\/png;base64,/, "")
      const firmaBuffer = Buffer.from(base64Data, "base64")

      const firmaImage = await pdfDoc.embedPng(firmaBuffer)

      const firmaField = form.getTextField("firma2")
      const rect = firmaField.acroField.getWidgets()[0].getRectangle()

      const page = pdfDoc.getPages()[1]

      page.drawImage(firmaImage, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })

      form.removeField(firmaField)
    }

    // 13 final
    const pdfBytes = await pdfDoc.save()

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "inline; filename=tramite.pdf")

    res.send(Buffer.from(pdfBytes))

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error generando PDF desde BD" })
  }
})


// ver campos de pdf
router.get("/campos", async (req, res) => {

        try {

            const archivo1 = "PORTABILIDAD_V1.pdf"
            const archivo2= "PORTABILIDAD_V1.pdf"
            const archivo3 = "PORTABILIDAD_V1.pdf"

            const pdfPath = path.join(__dirname, "..", "templates", archivo1)
            const existingPdfBytes = fs.readFileSync(pdfPath)
            const pdfDoc = await PDFDocument.load(existingPdfBytes)
            const form = pdfDoc.getForm()
            const fields = form.getFields()
            const campos = fields.map(field => {

                return {
                    nombre: field.getName(),
                    tipo: field.constructor.name
                }
            })

            console.log("Campos del PDF:")
            console.table(campos)

            res.json(campos)

        } catch (error) {

            console.log(error)
            res.status(500).json({ error: "Error leyendo campos" })

        }
    })


module.exports = router
