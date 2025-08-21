// staging/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");

// Pick your region close to Cincinnati
setGlobalOptions({ region: "us-central1" });

exports.helloWorld = onRequest((req, res) => {
  res.status(200).send({
    ok: true,
    message: "CBRT staging functions are alive ✨",
    time: new Date().toISOString(),
  });
});