import {createClient } from "redis";

const redisclient = createClient ({
    url :process.env.REDIS_URL || "redis://localhost:8000"

});


redisclient.on('error', (err)=> console.log(`error:${err}`));


await redisclient.connect();

export default redisclient