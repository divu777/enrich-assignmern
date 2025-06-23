import express from "express";
import dotenv from "dotenv";
import { v6 as uuid } from "uuid";
import { addjobstoQueue } from "./worker";
import { jobs } from "./db";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
  res.send("hello");
  return;
});

app.post("/jobs", (req, res) => {
  const data = req.body;
  const request_id = uuid();

  addjobstoQueue({ id: request_id, payload: data });
  res.json({
    request_id,
  });
});

// webhook vendors hit
app.post("/vendor-webhook/:vendor", async (req, res) => {
  const vendor = req.params.vendor;
  const data = req.body;
  const success = data.success;

  await jobs.updateOne(
    {
      request_id: data.id,
    },
    {
      $set: {
        status: success ? "COMPLETED" : "FAILED",
      },
    }
  );

  console.log(data);
});

// look up for the id status
app.get("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const result = await jobs.findOne(
    {
      request_id: id,
    },
    {
      _id: 0,
    }
  );

  if (!result) {
    res.send({
      message: "no jobs with this id ",
      success: false,
    });
    return;
  }

  res.send(result);
});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => console.log("listening on " + PORT));
