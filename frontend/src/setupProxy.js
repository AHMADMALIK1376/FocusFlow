// Local development only (Create React App runs this file; the production build ignores it).
// The built-in "proxy" setting in package.json forwards /api to the backend only for requests that are not asked for as a web page,
// so a link that opens an API address in a new tab (a teacher's PDF from the LMS) showed FocusFlow's 404 page instead of the file.
// Forwarding everything under /api, like the live site does (vercel.json), fixes that.
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  app.use(createProxyMiddleware("/api", { target: "http://localhost:5555", changeOrigin: false }));
};
