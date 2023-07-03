import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

const app = express()

app.use(express.json())
app.use(cors())

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL, { family: 4 })
let db

mongoClient
   .connect()
   .then(() => {
      console.log('MONGODB CONECTADO!')
      db = mongoClient.db()
   })
   .catch((err) => console.log(err.message))

const PORT = 5000
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`))
