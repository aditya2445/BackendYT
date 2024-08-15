import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoID");
    }

    const like = await Like.findOne({
        video:videoId,
        likedBy:req.user?._id,
    });

    if(like){
        await Like.findOneAndDelete(like._id);
        return res.status(200).json(new Response(200,{isLiked:false},"your like for the video has been removed"))
    }

    await Like.create({
        video:videoId,
        likedBy:req.user?._id,
    })
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"you now liked the video"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid commentID");
    }

    const like = await Like.findOne({
        comment:commentId,
        likedBy:req.user?._id,
    });

    if(like){
        await Like.findOneAndDelete(like._id);
        return res.status(200).json(new Response(200,{isLiked:false},"your like for the coment has been removed"))
    }

    await Like.create({
        comment:commentId,
        likedBy:req.user?._id,
    })
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"you now liked the comment"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetID");
    }

    const like = await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id,
    });

    if(like){
        await Like.findOneAndDelete(like._id);
        return res.status(200).json(new Response(200,{isLiked:false},"your like for the tweet has been removed"))
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.user?._id,
    })
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"you now liked the tweet"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const allLikedVideos = await Like.aggregate([
        {
            $match:{
                likedBy : new mongoose.Types.ObjectId(req.user?._id),
            },            
        },
        {
            $lookup:{
                from:"video",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"user",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        },
                    },
                ]
            }
        },
        {
            $unwind:$ownerDetails
        },
        {
            $project:{
                _id:0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);
    return res.status(200).json(new ApiResponse(200,allLikedVideos,"all videos fetched"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}