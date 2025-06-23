import { Queue ,Worker } from 'bullmq';
import { jobs } from './db';
import axios from 'axios';
import IORedis from 'ioredis';


const axiosInstance =  axios.create({baseURL:"http://localhost:4000"})


type ratelimitType ={
    sync : number [],
    async : number [],
    limit : number ,
    windowMs:number 
}

const rateLimit:ratelimitType = {
    sync : [] ,
    async : [] , 
    limit : 5,
    windowMs : 1000
}



const limitVendors = (vendor : 'sync' | 'async' | null)=>{
    if(!vendor){
        console.log("never happen");
        return 
    }
    const now = Date.now()
    rateLimit[vendor] = rateLimit[vendor].filter(req=>now-req < rateLimit.windowMs);
    rateLimit[vendor].push(now);

    if(rateLimit[vendor].length>=rateLimit.limit){
        return true
    }

    return false;
}


const connection = new IORedis('redis://redis:6379',{ maxRetriesPerRequest: null  });

const myqueue = new Queue('jobs',{connection});


export const addjobstoQueue = async(data:any)=>{
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
    
    const random_no =Math.floor( Math . random ()*2)+1;

    let vendor : "async" | "sync" | null = null;
    switch(random_no){
        case 1:
            vendor = "sync"
            break
        case 2:
            vendor = "async"
            break
        default:
            console.log("never gonna happen.")
    }

    if (limitVendors(vendor)) {
    await jobs.updateOne({ request_id: job.data.id }, { $set: { status: 'FAILED' } });
    console.log(`Rate limit hit for vendor ${vendor}`);
    return;
}

    await axiosInstance.post(`/${vendor}`,{
        ...job.data
    })
},{connection})