import {v2 as cloudinary} from 'cloudinary'
import fs from "fs"
// import {ApiError} from '../utils/ApiError';

cloudinary.config({
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async(localFilePath)=>{
  try{
    if(!localFilePath) return null
    //upload the file to cloudinary
    const response =await cloudinary.uploader.upload(localFilePath,{
      resource_type:"auto"
    })
    //read about the things which we are getting in this response from cloudinary or by printing the response
    //the file has been successfully uploaded
    // console.log("file is successfully uploaded to cloudinary ",response.url);
    fs.unlinkSync(localFilePath);
    return response;
  }catch(error){
      fs.unlinkSync(localFilePath)//it removes the locally saved temporary file as the upload operation is failed
      return null; 
  }
}

const deleteOnCloudinary = async(target)=>{
  try {
    const result = await cloudinary.uploader.destroy(target);
    return result;
  } catch (error) {
    return null;
  }
}

export {uploadOnCloudinary,deleteOnCloudinary}  