import express from 'express';
import router from './routes/routes.js';

const PORT = process.env.PORT

const app = express()
app.use(express.json());
app.use('/',router)

app.listen(5000,()=>{
    console.log(`server is running on ${PORT}`)
})