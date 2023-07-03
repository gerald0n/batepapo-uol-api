import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import Joi from 'joi'

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

app.post('/participants', async (req, res) => {
   const { name } = req.body

   const schemaParticipants = Joi.object({
    name: Joi.string().required()
   })

   const validation = schemaParticipants.validate(req.body, { abortEarly: false })

   if(validation.error) {
    const errors = validation.error.details.map(detail => detail.message)
    return res.status(422).send(errors)
   }
   

   try {
      const participant = await db.collection('participants').findOne({ name })
      if (participant) return res.sendStatus(409)

      await db.collection('participants').insertOne({ name: name, lastStatus: Date.now() })
      await db.collection('messages').insertOne({
         from: name,
         to: 'Todos',
         text: 'entra na sala...',
         type: 'status',
         time: dayjs().format('DD/MM/YYYY')
      })

      return res.sendStatus(201)
   } catch (err) {
      return res.status(500).send(err.message)
   }
})

app.get('/participants', async (req, res) => {
   try {
      const participants = await db.collection('participants').find().toArray()
      res.send(participants)
   } catch (err) {
      return res.status(500).send(err.message)
   }
})



const PORT = 5000
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`))
