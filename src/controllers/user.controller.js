import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token");
    }
}

const registerUser = asyncHandler( async(req,res) => {
    //get user details from frontend
    //validation notempty
    //check if user exists :username ,email
    // check for images,check for avatar
    // upload them to cloudinary,avatar
    // create user object -create entry in db
    // remove password and refresh token field from response 
    //check for user creation
    //return response

    // ******************************************* step1
    //form or json data req.body
    const {fullname,email,username,password} = req.body
    // console.log("email",email);

    // ******************************************* step2
    //method 1 for validation check
    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required")
    // }


    //method 2
    if(
        [fullname,email,username,password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are cumpolsary to return")
    }

    //********************************************* step3 
    const existingUser=await User.findOne({
        $or:[ {username} , {email} ]
    })
    if(existingUser){
        throw new ApiError(409,"user with emIL or username already exist");
    }

    //********************************************** step4
    // console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path; 
    // const coverImageLocalPath=req.files?.coverImage[0]?.path; //writing in this way will give you undefined if there is no cover image uploaded by the user
    let coverImageLocalPath;//this way will give you coverImage:"" in case of no cover image given.
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(403,"Avatar file is required");
    }

    //********************************************** step5 
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(404,"Avatar file is required");

    //*********************************************** step6
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase(),
    })

    // *********************************************** step7
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user");
    }

    // return res.status(201).json({createdUser}) OR
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

    })

const loginUser=asyncHandler( async(req,res) => {
    // todos for login
    //req body se data lao
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookie
    //send the response that user has successfuly logged in
    const {email,username,password}=req.body

    if(!(username || email)){
        throw new ApiError(400,"username or password is required")
    }
    // User.findOne({email}) method is for finding a user via email
    // User.findOne({username}) method is for finding a user via username
    console.log(email);
    const user=User.findOne({
        $or: [{username},{email}]
    })
    console.log(user);
    if(!user){
        throw new ApiError(404,"User does not exist");
    }
    // User is a mongoose method but user is the method which has built by you
    const isPasswordValid=await user.isPasswordCorrect(password);
    // console.log(isPasswordValid);
    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credentials");
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = User.findById(user._id).select("-password -refreshToken");
    const options={
        httpOnly : true,
        secure : true
    }
    return res.status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",refreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user:loggedInUser,accessToken,refreshToken
                    },
                    "user logged in successfully"
                )
            )
    })

const logoutUser = asyncHandler( async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly : true,
        secure : true
    }

    return res.status(200)
            .clearCookie("accessToken",accessToken,options)
            .clearCookie("refreshToken",refreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "user logged out successfully"
                )
            )
    })

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized access");
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"invalid refresh token");
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used");
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
        return res.status(200).cookie("accesstoken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(
            new ApiResponse(\
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh Token");
    }
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}