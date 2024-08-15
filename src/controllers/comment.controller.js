import mongoose, { isValidObjectId ,Schema} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    //in aggregate pipeline find the video in match section then in lookup find likes and owner 
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid ID");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"video not found");
    }
    const comments = Comment.aggregate([
        {
            $match:{
                video : new mongoose.Types.ObjectId(String(videoId))
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            },
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likes:{
                    $size:"$likes"
                },
                owner:{
                    $first:"owner"
                },
                isLiked:{
                    $cond:{
                        if:{$in:[re.user?._id,"$likes.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        //sort if you want sort as per createdDate : -1 i.e,ascending order
        {
            $project:{
                content:1,
                createdAt:1,
                likes:1,
                owner:{
                    username:1,
                    avatar:1,
                    //or "avatar.url:1"
                },
                isLiked:1
            }
        }
    ])
    const options = {
        page:parseInt(page,10),
        limit:parseInt(limit,10),
    }

    const allComments = await Comment.aggregatePaginate(comments,options);

    return res.status(200).json(new Response(200,allComments,"all comments fetched successfully"));
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const { content } = req.body;
    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"invalid VideoId");
    }
    if(!content){
        throw new ApiError(401,"Please provide atleast one character for comment");
    }
    const video = await Video.findById(videoId);
    // if(!video){} not required if required then we can check later
    const comment = await Comment.create({
        content,
        video:videoId,
        owner:req.user?._id
    });
    if(!comment){
        throw new ApiError(504,"something went wrong in posting the comment");
    }

    return res.status(200).json(new ApiResponse(200,comment,"comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} =req.body;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"invalid ID")
    }
    if(!content){
        throw new ApiError(401,"content is necessary");
    }
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(402,"comment does not exist");
    }

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,"you are not the owner of the comment so you cannot update this");
    }
    const updatedComment = await Comment.findByIdAndUpdate(comment?._id,{
        $set:{
            content,
        }
    },{new:true})

    if (!updatedComment) {
        throw new ApiError(500, "something went wrong in updating the comment");
    }

    return res.status(200).json(new ApiResponse(200,updatedComment,"comment updated successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;
    if(isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid commentID")
    }
    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(401,"failed to fetch the comment");
    }

    if(comment?.owner.toString() !== req.user?._id){
        throw new ApiError(402,"this comment is not yours");
    }
    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({
        comment:commentId,
        likedBy:req.user
    })

    return res.status(200).json(new ApiResponse(200,{},"comment successfully deleted"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }