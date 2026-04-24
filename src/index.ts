import 'dotenv/config'
import express from 'express'
import { clerkAuth } from './middleware/auth'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import levelRoutes from './routes/levels'
import sessionRoutes from './routes/sessions'
import scoreRoutes from './routes/scores'

const app = express()

app.use(express.json())
app.use(clerkAuth)

app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/levels', levelRoutes)
app.use('/sessions', sessionRoutes)
app.use('/scores', scoreRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
