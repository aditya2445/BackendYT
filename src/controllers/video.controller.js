import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    console.log(userId)

    //create a pipeline and push all items based on the query title and description
    const pipeline=[];
    if(query){
        pipeline.push({
            $search:{
                index:"search-videos",
                text:{
                    query:query,
                    path:["title","description"]
                }
            }
        })
    }

    //after pushing match the owner as per the userId
    if(userId){ 
        if(!isValidObjectId(userId)){
            throw new ApiError(400,"Invalid user id");
        }
        pipeline.push({
            $match:{
                owner:new mongoose.Types.ObjectId(String(userId)),
            }
        })
    }

    //after matching the userId of the owner make sure that you add those videos which are published and not in draft
    pipeline.push({
        $match:{
            isPublished:true,
        }
    })

    //sorting based on views,duration,updatedAt 
    if(sortBy && sortType){
        pipeline.push({
            $sort:{
                [sortBy]:sortType === "asc" ? 1:-1
            }
        })
    }else{
        pipeline.push({
            $sort:{
                createdAt:-1
            }
        })
    }

    pipeline.push({
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        username:1,
                        "avatar.url":1
                    }
                }
            ]
        }
    },
    {
        $unwind:"$ownerDetails"
    })

    const videoAggregate = Video.aggregate(pipeline);
    const options = {
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    const video = await Video.aggregatePaginate(videoAggregate,options)

    return res.status(200).json(new ApiResponse(200,video,"videos Fetched Successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
if([title,description].some((field)=> field?.trim() === "")){
    throw new ApiError(400,"All fields Are required");
}
const videoLocalPath=req.files?.videoFile[0]?.path; 
const thumbnailLocalPath=req.files?.thumbnail[0]?.path;

if(!videoLocalPath){
    throw new ApiError(400,"Video file local path is required");
}
if(!thumbnailLocalPath){
    throw new ApiError(400,"thumbnail file local path is required");
}

const uploadedVideo=await uploadOnCloudinary(videoLocalPath)
const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)

console.log(uploadedVideo.url , thumbnail.url);

if(!uploadedVideo) throw new ApiError(404,"Something went wrong during the upload of video file");
if(!thumbnail) throw new ApiError(404,"Thumbnail uploading problem");

const video = await Video.create({
    title,
    description,
    duration:uploadedVideo.duration,
    videoFile:uploadedVideo.url,
    thumbnail:thumbnail.url,  
    owner:req.user?._id,
    isPublished:false,
})

const createdVideo=await Video.findById(video._id);

if(!createdVideo){
    throw new ApiError(500,"server error during the uploading of video to DB!! Dont panic your video is saved in our local server and it will be uploaded soon");
}

return res.status(200).json(new ApiResponse(200,video,"video uploaded successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid videoId");
    }

    // Validate user
    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Create ObjectId instance
    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    // Aggregate video data
    const video = await Video.aggregate([
        {
            $match: {
                _id: videoObjectId,
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $in: [req.user?._id, "$subscribers.subscriber"]
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $arrayElemAt: ["$owner", 0] },
                isLiked: {
                    $in: [req.user?._id, "$likes.likedBy"]
                }
            }
        },
        {
            $project: {
                videoFile: 1, // or "videoFile.url:1"
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    // Increment views and add to user's watch history
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { watchHistory: videoId }
    });

    return res.status(200).json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
  
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Please provide a valid video ID");
    }
  
    if (!(title && description)) {
      throw new ApiError(400, "Provide a title and description");
    }
  
    const videoToBeUpdated = await Video.findById(videoId);
  
    if (videoToBeUpdated?.owner.toString() !== req.user?._id.toString()) {
      throw new ApiError(400, "You cannot update this video");
    }
  
    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
      throw new ApiError(401, "Thumbnail is missing");
    }
  
    const oldThumbnail = videoToBeUpdated.thumbnail.url;
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  
    if (!thumbnail) {
      throw new ApiError(500, "Error while uploading the thumbnail");
    }
  
    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
      $set: {
        title,
        description,
        thumbnail:thumbnail.url,
      }
    }, { new: true });
  
    if (!updatedVideo) {
      throw new ApiError(502, "Error during the updation of the video");
    } else {
      await deleteOnCloudinary(oldThumbnail);
    }
  
    res.status(200).json(new ApiResponse(200, updatedVideo, "Video details updated successfully"));
  });

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoid")
    }
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't delete this video as you are not the owner"
        );
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if(!videoDeleted){
        throw new ApiError(404,"something went wrong during the deletion time !!please try again");
    }

    await deleteOnCloudinary(video.thumbnail.url);
    await deleteOnCloudinary(video.videoFile,"video");

    await Like.deleteMany({
        video:videoId
    })

    await Comment.deleteMany({
        video:videoId
    })

    return res.status(200).json(new ApiResponse(200,{},"videoDeleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) =>{
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
    }

    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"video not found");
    }
    if(req.user?._id.toString() !== video?.owner.toString()){
        throw new ApiError(402,"you cannot do this coz you are not the owner of this video");
    }

    const toggle=await Video.findByIdAndUpdate(videoId,{
        $set:{
            isPublished:!(video?.isPublished)
        }
    },{new:true})

    if(!toggle){
        throw new ApiError(500,"something went wrong durring toogling oif the status");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: toggle.isPublished },
                "Video publish toggled successfully"
            )
        );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}