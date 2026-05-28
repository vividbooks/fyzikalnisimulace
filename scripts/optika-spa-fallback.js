/**
 * live-server middleware: serve rysovani-app/index.html for client routes
 * (e.g. /optika_geometrie/rysovani-app/ukol/<id>) while keeping the browser URL.
 */
module.exports = function optikaSpaFallback(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const urlPath = (req.url || "").split("?")[0];
  const marker = "/optika_geometrie/rysovani-app";
  if (!urlPath.startsWith(marker)) return next();

  const rest = urlPath.slice(marker.length);
  if (!rest || rest === "/") return next();

  const lastSegment = rest.split("/").pop() || "";
  if (/\.[a-zA-Z0-9]{1,12}$/.test(lastSegment)) return next();

  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  req.url = marker + "/index.html" + query;
  next();
};
