import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


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


export {
    registerUser,
}