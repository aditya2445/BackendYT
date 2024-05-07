import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public")) //here public is the public folder which is created for storage of pdf,images etc in the server.....  
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users",userRouter)

// http://localhost:8000/api/v1/users/register (here only register will get change not the users if you go to login then it will automatically change to users/login)

export { app }