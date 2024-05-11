import multer from "multer";
const storage = multer.diskStorage({
    destination: function (req , file , cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname) 
    }
  })
  
const upload = multer({
     storage:storage, //storage=storage can also be written but since we are using E6 engine so we can write in the sendond format type also.
     limits: { fileSize: 1024 * 1024 * 5 }
 })

 export {upload}
