import "../styles/global.css";
import "@fontsource/inconsolata/200.css";
import "@fontsource/inconsolata/400.css";
import isPropValid from "@emotion/is-prop-valid";
import { formatDistance, parseISO } from "date-fns";
import { HeadFC, Link, PageProps, graphql } from "gatsby";
import { BiLogoGithub } from "react-icons/bi"
import React, { FC, useEffect, useState } from "react";
import tw, { css, styled } from "twin.macro";
import { usePolling } from "../hooks/usePolling";
import { AnimatedNumber } from "../components/AnimatedNumber/AnimatedNumber";
import config from "../../../config.json";

type Response = {
  temperature?: number;
  time?: string;
};

type Data = {
  history: Response;
};

type MainProps = {
  feel: keyof typeof styles;
};

const styles = {
  unknown: tw`transition-colors duration-500 bg-black`,
  cold: tw`transition-colors duration-500 bg-blue`,
  warm: tw`transition-colors duration-500 bg-orange`,
  perfect: tw`transition-colors duration-500 bg-green`,
};

const emojis = {
  unknown: "",
  cold: "🥶",
  warm: "🤷",
  perfect: "👌",
};

const Main = styled("main", {
  shouldForwardProp: (prop: string) => isPropValid(prop),
})(({ feel }: MainProps) => [
  tw`flex flex-col items-center justify-center w-screen h-screen text-white`,
  feel ? styles[feel] : null,
]);

const H1 = tw.h1`
  font-heading font-extralight text-md leading-none sm:text-lg lg:text-xl
`;

const H5 = tw.h5`
  font-body font-normal text-sm sm:text-md
`;

const H6 = tw.h6`
  font-body font-normal text-xxs sm:text-xs
`;

const GithubLogo = tw(BiLogoGithub)`
  mt-8 w-4 h-4 md:w-8 md:h-8
`

const getKeyFromTemperature = (temperature?: number) => {
  if (!temperature) {
    return "unknown";
  }

  if (temperature < 20) {
    return "cold";
  }

  if (temperature < 26) {
    return "warm";
  }

  return "perfect";
};

const IndexPage: FC<PageProps<Data>> = ({ data: queryData }) => {
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [data, setData] = useState<Response>(queryData.history);
  const [feel, setFeel] = useState<keyof typeof styles>("unknown");

  async function fetchTemperature(abortSignal: AbortSignal) {
    try {
      const res = await fetch(`https://api.${config.domainName}/app/read`, {
        signal: abortSignal,
      });
      const response = await res.json();
      setData(response);
    } catch (err) {
      if (!abortSignal.aborted) {
        console.error(err);
      }
    }
  }

  const lastFetchTime = usePolling(fetchTemperature);
  const { temperature, time } = data || {};
  const formattedTime = time ? parseISO(time) : null;
  const lastUpdatedDate = formattedTime
    ? `${formatDistance(formattedTime, new Date())} ago`
    : "-";
  const lastFetchedTime = lastFetchTime
    ? `${formatDistance(lastFetchTime, new Date())} ago`
    : "-";

  const handleChange = (value: number) => {
    setFeel(getKeyFromTemperature(value));
  };

  useEffect(() => {
    document.body.setAttribute("style", css(styles[feel]).styles);
  }, [feel]);

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <Main feel={feel}>
      <H1>
        <AnimatedNumber
          value={temperature}
          duration={4000}
          onChange={handleChange}
        />
        &deg;
      </H1>
      <H5>{emojis[feel]}</H5>
      {hasMounted ? (
        <>
          <H6>Pool temperature was measured {lastUpdatedDate}</H6>
          <H6>API last checked {lastFetchedTime}</H6>
        </>
      ) : <H6>Loading</H6>}
      <Link to="https://github.com/struct78/iot-pool-temperature-sensor">
        <GithubLogo />
      </Link>
    </Main>
  );
};

export const Head: HeadFC = () => (
  <>
    <title>Can we go in the pool now?</title>
    <meta
      name="apple-mobile-web-app-status-bar-style"
      content="black-translucent"
    />
  </>
);

export const query = graphql`
  query TemperatureQuery {
    history: thirdPartyTemperature(temperature: { ne: null }) {
      time
      temperature
    }
  }
`;

export default IndexPage;
