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

   if (validation.error) {
      const errors = validation.error.details.map((detail) => detail.message)
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

app.post('/messages', async (req, res) => {
   const { to, text, type } = req.body
   const from = req.headers.user

   const schemaMessages = Joi.object({
      to: Joi.string().required(),
      text: Joi.string().required(),
      type: Joi.string().valid('message', 'private_message')
   })

   const schemaFrom = Joi.object({
      from: Joi.string().required()
   })

   const validationMessages = schemaMessages.validate(req.body, { abortEarly: false })
   const validationFrom = schemaFrom.validate(req.header.user, { abortEarly: false })

   if (validationMessages.error) {
      const errors = validationMessages.error.details.map((detail) => detail.message)
      return res.status(422).send(errors)
   }

   if (validationFrom.error) {
      const errors = validationFrom.error.details.map((detail) => detail.message)
      return res.status(422).send(errors)
   }

   try {
      const participant = await db.collection('participants').findOne({ name: from })
      if (!participant) return res.sendStatus(422)

      await db
         .collection('messages')
         .insertOne({ from, to, text, type, time: dayjs().format('HH:mm:ss') })

      res.sendStatus(201)
   } catch (err) {
      return res.status(422).send(err.message)
   }
})

app.get('/messages', async (req, res) => {
   const user = req.headers.user
   const { limit } = req.query

   if (isNaN(limit) || limit <= 0) return res.sendStatus(422)

   try {
      const messages = await db
         .collection('messages')
         .find({
            $or: [{ to: 'Todos' }, { to: user }, { from: user }]
         })
         .toArray()

      res.send(messages.reverse().slice(0, limit))
   } catch (err) {
      return res.status(500).send(err.message)
   }
})

const PORT = 5000
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`))
