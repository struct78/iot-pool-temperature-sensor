import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: "pool-temperature-sensor",
  },
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-postcss",
    {
      resolve: "gatsby-source-apiserver",
      options: {
        allowCache: false,
        typePrefix: "thirdParty__",
        name: "Temperature",
        url: "https://api.canwegointhepool.com/app/read",
      },
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        name: "Can we go in the pool, Dad?",
        short_name: "Pool Temperature",
        start_url: "/",
        background_color: "#0096FF",
        display: "standalone",
        icon: "static/app-icon.jpg",
      }
    }]
};

export default config;
