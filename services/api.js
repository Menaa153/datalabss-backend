//const API_URL = "http://localhost:4000/api"
const API_URL = "http://192.168.18.17:4000/api"
//const API_URL = "http://192.168.56.1:4000/api"



export const getPersonas = async (page, limit) => {

  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}/personas?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return res.json()
}

export const buscarDocumento = async (doc) => {

  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}/personas/buscar/documento/${doc}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return res.json()
}

export const buscarNombre = async (nombre) => {

  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}/personas/buscar/nombre/${nombre}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return res.json()
}

export const editarPersona = async (id, data) => {

  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}/personas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  return res.json()
}