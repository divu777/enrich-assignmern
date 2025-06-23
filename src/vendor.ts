import axios from "axios";
import express from "express";
import dotenv from 'dotenv'

dotenv.config()
const app = express();

app.use(express.json());

const PORT2 = process.env.PORT2 ?? 4000;
const MainBackend = process.env.PORT ?? 3000;

const axiosInstance = axios.create({
  baseURL: `http://localhost:${MainBackend}/vendor-webhook`,
});


app.get("/",(_,res)=>{
    res.send("hello from vendor")
})

app.post("/sync", async(req, res) => {
  const data = req.body
  try {
    console.log("sync vendor ");
    
    // data clenup  like i don't know which thing to store right now so yes no data cleaning 


    await axiosInstance.post(`/sync`,{...data,success:true})


    res.json({ 
      status: 'success', 
      message: 'sync complete',
    });
    return;
  } catch (error) {
    console.log(error + " error in the sync vendor");
    await axiosInstance.post(`/async`,{...data,success:false})
    res.json({
      status: 'failed', 
      message: 'sync incomplete',
    })
  }
});

app.post("/async",  async(req, res) => {
  const data = req.body
  try {
    console.log("async vendor ");
     res.json({ 
      status: 'accepted', 
      message: 'Async started'
    });

    setTimeout(async() => {
        await axiosInstance.post(`/async`,{...data,success:true})
    }, 30000);
  } catch (error) {
    console.log(error + " error in the Async vendor");
    await axiosInstance.post(`/async`,{...data,success:false})
    res.json({
      status: 'failed', 
      message: 'Async failed'
    })
  }
});

app.listen(PORT2, () => {
  console.log("vendor server is running on " + PORT2);
});
