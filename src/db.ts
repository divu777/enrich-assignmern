import mongoose from "mongoose"

const url = 'mongodb://db:27017/db'

mongoose.connect(url)

const jobSchema = new mongoose.Schema({
    status : {
        type:String,
        required:true,
        enum : ["PENDING",'COMPLETED','PROCESSING','FAILED'],
        default: 'PENDING'
    },
    request_id : {
        required: true,
        type : String  ,
        index:true  }
})

export const jobs =  mongoose.model('job',jobSchema) 