import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema=new Schema(
    {
        username: {
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email: {
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname: {
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar: {
            type:String,//cloudinary url
            required:true,
        },
        coverImage: {
            type:String,//cloudinary url
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,"Password is required"]
        },
        refreshToken:{
            type:String
        }
    },{timestamps:true}
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();//here syntax is like this "password" (i.e, password within strings)

    this.password=bcrypt.hash(this.password,10)
    next();
}) //here arrow function is not used coz arrow function has no idea about this pointer which is very necessary in this case...

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=function(){
    jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname //payload_key : database_value
        },process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname //payload_key : database_value
        },process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)
