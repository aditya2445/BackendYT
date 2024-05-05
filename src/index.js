// require('dotenv').config({path:'./env'}) IT WORKS WELL BUT IT USES REQUIRE SYNTAX RATHER THAN IMPORT WHICH BRINGS CODE INCONSISTANCY

// import mongoose from "mongoose"
// import {DB_NAME} from "./constants.js"
import connectDB from "./db/index.js"
import dotenv from "dotenv"

dotenv.config({
    path:'./env'
})

connectDB();

















//FIRST APPROACH IS WRITING THE CONNECTION CODE IN INDEX.JS
/*
import express from 'express'
const app=express()
// //method 1
// function connectdb(){}
// connectdb();

//method 2 using IIFE for professional purpose always start iife with a semicolon
;( async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERRR:",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    }catch(error){
        console.error("ERROR :",error)
        throw err
    }
})()
*/