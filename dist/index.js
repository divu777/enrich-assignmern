"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios"));
const axiosInstance = axios_1.default.create({ baseURL: "http://localhost:3000/vendor-webhook" });
const url = 'mongodb://localhost:27017/db';
mongoose_1.default.connect(url);
const jobSchema = new mongoose_1.default.Schema({
    status: {
        type: String,
        required: true,
        enum: ["PENDING", 'COMPLETED', 'PROCESSING', 'FAILED'],
        default: 'PENDING'
    },
    request_id: {
        required: true,
        type: String,
        index: true
    }
});
const jobs = mongoose_1.default.model('job', jobSchema);
const myqueue = new bullmq_1.Queue('jobs');
const addjobstoQueue = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield jobs.create({
        request_id: data.id
    });
    yield myqueue.add('jobs', data);
});
const connection = new ioredis_1.default({ maxRetriesPerRequest: null });
const worker = new bullmq_1.Worker('jobs', (job) => __awaiter(void 0, void 0, void 0, function* () {
    const id = yield jobs.updateOne({
        request_id: job.data.id
    }, {
        $set: {
            status: 'PROCESSING'
        }
    });
    const vendor = Math.floor(Math.random() * 2) + 1;
    switch (vendor) {
        case 1:
            syncVendor(job.data);
            break;
        case 2:
            AsyncVendor(job.data);
            break;
        default:
            console.log("never gonna happen.");
    }
}), { connection });
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/", (_, res) => {
    res.send("hello");
    return;
});
app.post("/jobs", (req, res) => {
    const data = req.body;
    const request_id = (0, uuid_1.v6)();
    addjobstoQueue({ id: request_id, payload: data });
    res.json({
        request_id
    });
});
// webhook called from async vendor 
app.post("/vendor-webhook/:vendor", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const vendor = req.params.vendor;
    const data = req.body;
    const success = data.success;
    yield jobs.updateOne({
        request_id: data.id,
    }, {
        $set: {
            status: success ? 'COMPLETED' : 'FAILED'
        }
    });
    console.log(data);
}));
// look up for the id status 
app.get("/jobs/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const result = yield jobs.findOne({
        request_id: id
    });
    res.send(result);
}));
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
app.listen(PORT, () => console.log("listening on " + PORT));
// vendors 
const syncVendor = (data) => {
    try {
        console.log("sync vendor ");
        axiosInstance.post(`/syncVender`, Object.assign(Object.assign({}, data), { success: true }));
    }
    catch (error) {
        axiosInstance.post("/syncVendor", Object.assign(Object.assign({}, data), { success: false }));
        console.log(error + " error in the sync vendor");
    }
};
const AsyncVendor = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                axiosInstance.post(`/AsyncVender`, Object.assign(Object.assign({}, data), { success: true }));
                resolve('done');
            }, 30000);
        }
        catch (error) {
            console.log(error + " error in the Async vendor");
            axiosInstance.post(`/AsyncVender`, Object.assign(Object.assign({}, data), { success: false }));
            reject('error in hanlding');
        }
    });
});
