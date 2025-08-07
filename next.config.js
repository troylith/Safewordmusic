module.exports = { reactStrictMode: true };
// next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_AI_KEY: process.env.NEXT_PUBLIC_AI_KEY,
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  },
}
