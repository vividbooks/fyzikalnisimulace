const path = require("path");
const liveServer = require("live-server");

liveServer.start({
  port: 8765,
  root: path.join(__dirname, ".."),
  open: "/",
  wait: 300,
  middleware: [require(path.join(__dirname, "optika-spa-fallback.js"))],
});
