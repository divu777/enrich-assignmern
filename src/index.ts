import express from 'express';
import dotenv from 'dotenv'
import { v6 as uuid} from 'uuid';
import {Queue ,Worker} from 'bullmq'
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import axios from 'axios';

const axiosInstance =  axios.create({baseURL:"http://localhost:3000/vendor-webhook"})



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

const jobs =  mongoose.model('job',jobSchema) 

const connection = new IORedis('redis://redis:6379',{ maxRetriesPerRequest: null  });

const myqueue = new Queue('jobs',{connection});


const addjobstoQueue = async(data:any)=>{
    await jobs.create({
        request_id:data.id
    })
    await myqueue.add('jobs',data);
}




const worker = new Worker('jobs',async(job)=>{
    const id = await jobs.updateOne({
        request_id:job.data.id
    },{
        $set:{
            status:'PROCESSING'
        }
    })
    const vendor =Math.floor( Math . random ()*2)+1
    switch(vendor){
        case 1:
            syncVendor(job.data)
            break
        case 2:
            AsyncVendor(job.data)
            break
        default:
            console.log("never gonna happen.")
    }
},{connection})


dotenv.config()


const app =express();

app.use(express.json())

app.get("/",(_,res)=>{
    res.send("hello")
    return;
})


app.post("/jobs",(req,res)=>{
    const data = req.body;
    const request_id = uuid()

    addjobstoQueue({id:request_id,payload:data})
    res.json({
        request_id
    })
})


// webhook called from async vendor 

app.post("/vendor-webhook/:vendor",async(req,res)=>{
    const vendor = req.params.vendor
    const data  = req.body
    const success = data.success



    await jobs.updateOne({
        request_id:data.id,
    }, {
        $set:{
           status: success? 'COMPLETED' : 'FAILED' 
        }
    })



    console.log(data);
})

// look up for the id status 
app.get("/jobs/:id",async(req,res)=>{
    const id = req.params.id
    const result = await jobs.findOne({
        request_id:id
    })

    res.send(result);
})

const PORT = process.env.PORT ?? 3000

app.listen(PORT,()=>console.log("listening on "+PORT))


// vendors 


const syncVendor = (data:any)=>{
    try {

        console.log("sync vendor ")


        axiosInstance.post(`/syncVender`,{
            ...data, success:true
        })
        
    } catch (error) {
        axiosInstance.post("/syncVendor",{
            ...data,success:false
        })
        console.log(error + " error in the sync vendor");
    }
}



const AsyncVendor = async(data:any)=>{
    
    return new Promise ((resolve,reject)=>{
            try {
            setTimeout(()=>{
                axiosInstance.post(`/AsyncVender`,{
            ...data,success:true
        })
        resolve('done');
            },30000)
            
        } catch (error) {
            console.log(error + " error in the Async vendor");
            
                axiosInstance.post(`/AsyncVender`,{
            ...data,success:false
        })
            reject('error in hanlding')
        }
    })
}