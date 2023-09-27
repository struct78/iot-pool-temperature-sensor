import type { GatsbyConfig } from "gatsby"
import conf from "../config.json"

const config: GatsbyConfig = {
  siteMetadata: {
    title: "IOT Pool Temperature Sensor",
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
        url: `https://api.${conf.domainName}/app/read`,
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
